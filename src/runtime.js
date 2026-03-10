'use strict';

const lib = require('./lib');
const NullObject = require('./null-object');

const arrayFrom = Array.from;
const kKeywords = Symbol('keywordArgs');
const kLastChanged = Symbol('kLastChanged');
const kCallable = Symbol('kCallable');
const kRecursive = Symbol('kRecursive');

class Frame {
  /**
   * Frames keep track of scoping both at compile-time and run-time so
   * we know how to access variables. Block tags can introduce special
   * variables, for example.
   * @param {Frame} parent
   * @param {boolean} [isolateWrites]
   */
  constructor (parent, isolateWrites) {
    this.variables = new NullObject();
    this.parent = parent;
    this.topLevel = false;
    // if this is true, writes (set) should never propagate upwards past
    // this frame to its parent (though reads may).
    this.isolateWrites = isolateWrites ?? false;
  }

  /**
   * Set a variable in this frame using the provided key, only sets a top level.
   * @param {string} name
   * @param {any} val
   * @param {boolean} resolveUp
   */
  setShallow (name, val, resolveUp) {
    if (resolveUp) {
      const frame = this.resolve(name, true);
      if (frame) {
        frame.setShallow(name, val, false);
        return;
      }
    }

    this.variables[name] = val;
  }

  /**
   * Deeply set a variable on this frame using a dot separated key path.
   * @param {string} name
   * @param {any} val
   * @param {Array<string>} parts - the indiviual keys in the name
   * @param {boolean} resolveUp
   */
  setDeep (name, val, parts, resolveUp) {
    if (resolveUp) {
      const frame = this.resolve(parts[0], true);
      if (frame) {
        frame.setDeep(name, val, parts, false);
        return;
      }
    }

    let obj = this.variables;
    const last = parts.length - 1;

    for (let i = 0; i < last; i++) {
      const id = parts[i];
      obj[id] ??= {};
      obj = obj[id];
    }

    obj[parts[last]] = val;
  }

  /**
   * Set a variable in this frame using the provided key, a dot seperated key
   * can be used to deeply set a variable on the frame.
   * @param {string} name
   * @param {any} val
   * @param {boolean} resolveUp
   */
  set (name, val, resolveUp) {
    if (name.indexOf('.') === -1) {
      this.setShallow(name, val, resolveUp);
    } else {
      const parts = name.split('.');
      this.setDeep(name, val, parts, resolveUp);
    }
  }

  /**
   * Get a variable from the frame.
   * @param {string} name
   * @returns {any|null}
   */
  get (name) {
    return this.variables[name] ?? null;
  }

  /**
   * Look up a variable on a frame, will return the value if it exists on the
   * frame or any parent frame.
   * @param {string} name
   * @returns {any}
   */
  lookup (name) {
    let frame = this;
    let val = frame.variables[name];
    while (val === undefined && (frame = frame.parent)) {
      val = frame.variables[name];
    }
    return val;
  }

  /**
   * Resolve a variable on a frame, will return the frame if the variable exists
   * on the frame or any parent frame.
   * @param {string} name
   * @param {boolean} forWrite
   * @returns {Frame|undefined}
   */
  resolve (name, forWrite) {
    if (this.variables[name] !== undefined) {
      return this;
    }
    if (forWrite && this.isolateWrites) {
      return undefined;
    }
    return this.parent?.resolve(name);
  }

  /**
   * Returns a new frame with this as its parent.
   * @param {boolean} isolateWrites
   * @returns {Frame}
   */
  push (isolateWrites) {
    return new Frame(this, isolateWrites);
  }

  /**
   * Returns the parent frame, if one exists.
   * @returns {Frame|undefined}
   */
  pop () {
    return this.parent;
  }
}

/**
 * Make a nunjucks macro from a given function, with support for keyword
 * arguments.
 * @param {Array<string>} params
 * @param {function} func
 * @returns {function}
 */
function makeMacro (params, func) {
  const paramCount = params.length;
  return function (...args) {
    const kwArgs = args[args.length - 1];
    if (isKeywordArgs(kwArgs) === false) {
      return func.apply(this, args);
    }

    args[args.length - 1] = undefined;
    for (let i = 0; i < paramCount; i++) {
      args[i] ??= kwArgs[params[i]];
    }

    return func.apply(this, args);
  };
}

/**
 * Make an input object into keyword arguments object
 * @param {object} obj
 * @returns {KeywordArgs}
 */
function makeKeywordArgs (obj) {
  obj[kKeywords] = true;
  return obj;
}

/**
 * Check if an input object is a keyword arguments object
 * @param {object} obj
 * @returns {boolean}
 */
function isKeywordArgs (obj) {
  return obj?.[kKeywords] ?? false;
}

/**
 * Get keyword argument value for a given parameter. If there is no keyword arg
 * value for given paramenter, return the input (original) value, unless the
 * input value was the keyword args object.
 * @param {object} obj
 * @returns {boolean}
 */
function getKeywordArg (val, kwArgs, param) {
  if (isKeywordArgs(val)) {
    return kwArgs[param];
  }
  return kwArgs[param] ?? val;
}

/**
 * A SafeString object indicates that the string should not be
 * autoescaped. This happens magically because autoescaping only
 * occurs on primitive string objects.
 * @extends {String}
 * @param {any} val
 * @returns {SafeString|any}
 */
function SafeString (val) {
  if (typeof val !== 'string') {
    return val;
  }

  this.val = val;
  this.length = val.length;
}

SafeString.prototype = Object.create(String.prototype, {
  length: {
    writable: true,
    configurable: true,
    value: 0
  }
});
SafeString.prototype.valueOf = function valueOf () {
  return this.val;
};
SafeString.prototype.toString = function toString () {
  return this.val;
};

/**
 * Return true if input value is a SafeString.
 * @param {any} val
 * @returns {boolean}
 */
SafeString.isSafeString = function isSafeString (val = '') {
  return val instanceof SafeString;
};

function copySafeness (dest, target) {
  if (SafeString.isSafeString(dest)) {
    return new SafeString(target);
  }
  return target.toString();
}

/**
 * Convert input string to SafeString, or input function to a function that
 * returns a SafeString (if it would otherwise return a string).
 * @param {string|function} val
 * @returns {SafeString|function}
 */
function markSafe (val) {
  switch (typeof val) {
    case 'string':
      return new SafeString(val);
    case 'function':
      return function wrapSafe (_) {
        const ret = val.apply(this, arguments);

        if (typeof ret === 'string') {
          return new SafeString(ret);
        }

        return ret;
      };
    default:
      return val;
  }
}

/**
 * Returns empty string for nullish values, converts value to HTML escaped
 * string if autoescape is true (and input is not a SafeString).
 * @param {any} val
 * @param {boolean} autoescape
 * @returns {string|SafeString}
 */
function suppressValue (val, autoescape) {
  if (val === undefined || val === null) {
    return '';
  }

  if (autoescape && !SafeString.isSafeString(val)) {
    return lib.escape(val.toString());
  }

  return val;
}

/**
 * Throw template error for nullish values.
 * @param {any} val
 * @param {number} lineno
 * @param {number} colno
 * @throws {TemplateError}
 * @returns {any}
 */
function ensureDefined (val, lineno, colno) {
  if (val === null || val === undefined) {
    throw new lib.TemplateError(
      'attempted to output null or undefined value',
      lineno + 1,
      colno + 1
    );
  }
  return val;
}

function memberLookup (obj, val) {
  const ov = obj?.[val];
  if (typeof ov !== 'function') {
    return ov;
  }

  return ov.bind(obj);
}

/**
 * Assert input is a function and call it with the given context as its `this`.
 * @template InputFunction
 * @param {InputFunction} func
 * @param {string} name name of the function
 * @param {object} context `this` object to apply to function
 * @param {Array<any>} args array of arguemnts to call the function with
 * @throws {ReferenceError|TypeError}
 * @returns {ReturnType<InputFunction>}
 */
function callWrap (func, name, context, args) {
  if (!func) {
    throw new ReferenceError(`Unable to call \`${name}\`, which is undefined or falsey`);
  }
  if (typeof func !== 'function') {
    throw new TypeError(`Unable to call \`${name}\`, which is not a function`);
  }

  return func.apply(context, args);
}

/**
 * Assert input is a function
 * @param {function} func
 * @param {string} name name of the function
 * @throws {ReferenceError|TypeError}
 */
function assertFunction (func, name) {
  if (typeof func !== 'function' && !func?.[kCallable]) {
    if (!func) {
      throw new ReferenceError(`Unable to call \`${name}\`, which is undefined or falsey`);
    }
    throw new TypeError(`Unable to call \`${name}\`, which is not a function`);
  }
}

/**
 * Lookup and return a variable from the input frame, if it's not found, look it
 * up in the context.
 * @param {Context} context
 * @param {Frame} frame
 * @param {string} name
 */
function contextOrFrameLookup (context, frame, name) {
  const val = frame.lookup(name);
  return (val !== undefined)
    ? val
    : context.lookup(name);
}

/**
 * Convert input error into a TemplateError.
 * @param {Error} error
 * @param {number} lineno
 * @param {number} colno
 * @returns {TemplateError}
 */
function handleError (error, lineno, colno) {
  if (error.lineno) {
    return error;
  }
  return new lib.TemplateError(error, lineno, colno);
}

function asyncEach (arr, dimen, iter, cb) {
  if (Array.isArray(arr)) {
    const loop = new LoopContext(arr, 0);

    lib.asyncIter(arr, function iterCallback (item, i, next) {
      switch (dimen) {
        case 1:
          iter(item, i, loop, next);
          break;
        case 2:
          iter(item[0], item[1], i, loop, next);
          break;
        case 3:
          iter(item[0], item[1], item[2], i, loop, next);
          break;
        default:
          item.push(i, loop, next);
          iter.apply(this, item);
      }
    }, cb);
  } else {
    lib.asyncFor(arr, function iterCallback (key, val, i, loop, next) {
      iter(key, val, i, loop, next);
    }, cb);
  }
}

function asyncAll (arr, dimen, func, cb) {
  let finished = 0;
  let loop;
  let outputArr;

  function done (i, output) {
    finished++;
    loop.iterate();
    outputArr[i] = output;

    if (finished === loop.length) {
      cb(null, outputArr.join(''));
    }
  }

  if (Array.isArray(arr)) {
    loop = new LoopContext(arr, 0);
    outputArr = new Array(loop.length);

    if (loop.length === 0) {
      cb(null, '');
    } else {
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];

        switch (dimen) {
          case 1:
            func(item, i, loop, done);
            break;
          case 2:
            func(item[0], item[1], i, loop, done);
            break;
          case 3:
            func(item[0], item[1], item[2], i, loop, done);
            break;
          default:
            item.push(i, loop, done);
            func.apply(this, item);
        }
      }
    }
  } else {
    const keys = Object.keys(arr || {});
    loop = new LoopContext(keys, 0);
    outputArr = new Array(loop.length);

    if (loop.length === 0) {
      cb(null, '');
    } else {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        func(k, arr[k], i, loop, done);
      }
    }
  }
}

function fromIterator (arr) {
  if (typeof arr !== 'object' || arr === null || Array.isArray(arr)) {
    return arr;
  }
  if (Symbol.iterator in arr) {
    return arrayFrom(arr);
  }
  return arr;
}

// function loopCall (_, arr) {
//   if (!this[kRecursive]) {
//     throw lib.TemplateError('loop must recursive to call loop');
//   }
//   console.log("called loop", arr);
//   recursive(arr, this[kCallable]);
// }
// function recursive (arr, cb) {
//   const iterable = fromIterator(arr);
//   if (iterable[Symbol.iterator]) {
//     cb(iterable, cb);
//   }
// }



// function loopCycle (...items) {
//   return items[this.index0 % items.length];
// }

// function loopChanged (val) {
//   const changed = !(kLastChanged in this) || this[kLastChanged] !== val;
//   this[kLastChanged] = val;
//   return changed;
// }

// function loopCall (_, arr) {
  // const cb = this[kCallable];
  // if (!cb) {
  //   throw lib.TemplateError('loop must recursive to call loop');
  // }
  // if (arr?.[Symbol.iterator]) {
  //   const loop = loopObject(cb);
  //   cb(loop, arr);
  // }
// }

// function loopObject (cb) {
//   const obj = new NullObject();
//   obj.call = loopCall;
//   obj[kCallable] = cb;
//   obj.cycle = loopCycle;
//   obj.changed = loopChanged;
//   return obj;
// }

// function recursive (arr, cb) {
  // const loop = loopObject(cb);
  // cb(loop, arr);
// }


class LoopContext {
  [kCallable] = false;

  #arr = null;
  #cb = null;
  #changed = {};
  length = 0;
  index0 = 0;
  index = 1;
  depth0 = 0;
  depth = 1;

  constructor (arr, depth, cb) {
    console.log(arr)
    if (cb) {
      this[kCallable] = true;
      this.#cb = cb
    }
    this.#arr = arr;
    this.length = arr.length;
    console.log('length', arr.length)
    this.depth0 = depth ?? 0;
    this.depth = this.depth0 + 1;
  }

  get revindex0 () {
    return this.length - this.index0 - 1;
  }

  get revindex () {
    return this.length - this.index0;
  }

  get first () {
    return this.index0 === 0;
  }

  get last () {
    return this.index === this.length;
  }

  get previtem () {
    return this.#arr[this.index0 - 1];
  }

  get nextitem () {
    return this.#arr[this.index];
  }

  cycle (...items) {
    return items[this.index0 % items.length];
  }

  changed (val) {
    const changed = this.#changed !== val;
    this.#changed = val;
    return changed;
  }

  call (_, arr) {
    if (!this.#cb) {
      throw lib.TemplateError('loop must recursive to call loop');
    }
    if (arr?.[Symbol.iterator]) {
      const loop = new LoopContext(arr, this.depth0 + 1, this.#cb);
      return this.#cb(loop, arr);
    }
  }

  iterate () {
    this.index0++;
    this.index++;
  }

  static recurse (arr, cb) {
    console.log(arr, cb);
    const loop = new LoopContext(arr, 0, cb);
    return cb(loop, arr);
  }
}



const barry = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

let output = '';

// LoopContext.recurse(barry, (loop, arr) => {
//   for (const thing of arr) {
//     console.log(thing);
//     output += thing;
//     loop.call({}, thing);
//     loop.iterate();
//   }
// });

// console.log(output);

module.exports = {
  Frame,
  makeMacro,
  makeKeywordArgs,
  isKeywordArgs,
  getKeywordArg,
  suppressValue,
  ensureDefined,
  memberLookup,
  contextOrFrameLookup,
  callWrap,
  assertFunction,
  handleError,
  SafeString,
  copySafeness,
  markSafe,
  asyncEach,
  asyncAll,
  inOperator: lib.inOperator,
  fromIterator,
  LoopContext,
  kRecursive,
  kCallable,
};

/** @typedef {object} KeywordArgs macro keyword arguments object */
/** @typedef {import("./lib.js").TemplateError} TemplateError */
