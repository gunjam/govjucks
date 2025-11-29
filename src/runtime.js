'use strict';

const lib = require('./lib');
const arrayFrom = Array.from;
const kKeywords = Symbol('keywordArgs');

const kIsSafeString = Symbol('isSafeString');
const NullObject = function () {};
NullObject.prototype = Object.create(null);

// Frames keep track of scoping both at compile-time and run-time so
// we know how to access variables. Block tags can introduce special
// variables, for example.
class Frame {
  constructor (parent, isolateWrites) {
    this.variables = new NullObject();
    this.parent = parent;
    this.topLevel = false;
    // if this is true, writes (set) should never propagate upwards past
    // this frame to its parent (though reads may).
    this.isolateWrites = isolateWrites;
  }

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

  set (name, val, resolveUp) {
    if (name.indexOf('.') === -1) {
      this.setShallow(name, val, resolveUp);
    } else {
      const parts = name.split('.');
      this.setDeep(name, val, parts, resolveUp);
    }
  }

  get (name) {
    return this.variables[name] ?? null;
  }

  lookup (name) {
    const val = this.variables[name];
    if (val !== undefined) {
      return val;
    }
    return this.parent?.lookup(name);
  }

  resolve (name, forWrite) {
    if (this.variables[name] !== undefined) {
      return this;
    }
    if (forWrite && this.isolateWrites) {
      return undefined;
    }
    return this.parent?.resolve(name);
  }

  push (isolateWrites) {
    return new Frame(this, isolateWrites);
  }

  pop () {
    return this.parent;
  }
}

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

function makeKeywordArgs (obj) {
  obj[kKeywords] = true;
  return obj;
}

function isKeywordArgs (obj) {
  return obj?.[kKeywords] ?? false;
}

function getKeywordArg (val, kwArgs, key) {
  if (isKeywordArgs(val)) {
    return kwArgs[key];
  }
  return kwArgs[key] ?? val;
}

// A SafeString object indicates that the string should not be
// autoescaped. This happens magically because autoescaping only
// occurs on primitive string objects.
function SafeString (val) {
  if (typeof val !== 'string') {
    return val;
  }

  this[kIsSafeString] = true;
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
SafeString.isSafeString = function isSafeString (val) {
  if (val === undefined || val === null) {
    return false;
  }
  return val[kIsSafeString] === true;
};

function copySafeness (dest, target) {
  if (SafeString.isSafeString(dest)) {
    return new SafeString(target);
  }
  return target.toString();
}

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

function suppressValue (val, autoescape) {
  if (val === undefined || val === null) {
    return '';
  }

  if (autoescape && SafeString.isSafeString(val) === false) {
    return lib.escape(val.toString());
  }

  return val;
}

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

function callWrap (obj, name, context, args) {
  if (!obj) {
    throw new Error(`Unable to call \`${name}\`, which is undefined or falsey`);
  }
  if (typeof obj !== 'function') {
    throw new Error(`Unable to call \`${name}\`, which is not a function`);
  }

  return obj.apply(context, args);
}

function assertFunction (func, name) {
  if (typeof func !== 'function') {
    if (!func) {
      throw new Error(`Unable to call \`${name}\`, which is undefined or falsey`);
    }
    throw new Error(`Unable to call \`${name}\`, which is not a function`);
  }
}

function contextOrFrameLookup (context, frame, name) {
  const val = frame.lookup(name);
  return (val !== undefined)
    ? val
    : context.lookup(name);
}

function handleError (error, lineno, colno) {
  if (error.lineno) {
    return error;
  }
  return new lib.TemplateError(error, lineno, colno);
}

function asyncEach (arr, dimen, iter, cb) {
  if (Array.isArray(arr)) {
    const len = arr.length;

    lib.asyncIter(arr, function iterCallback (item, i, next) {
      switch (dimen) {
        case 1:
          iter(item, i, len, next);
          break;
        case 2:
          iter(item[0], item[1], i, len, next);
          break;
        case 3:
          iter(item[0], item[1], item[2], i, len, next);
          break;
        default:
          item.push(i, len, next);
          iter.apply(this, item);
      }
    }, cb);
  } else {
    lib.asyncFor(arr, function iterCallback (key, val, i, len, next) {
      iter(key, val, i, len, next);
    }, cb);
  }
}

function asyncAll (arr, dimen, func, cb) {
  let finished = 0;
  let len;
  let outputArr;

  function done (i, output) {
    finished++;
    outputArr[i] = output;

    if (finished === len) {
      cb(null, outputArr.join(''));
    }
  }

  if (Array.isArray(arr)) {
    len = arr.length;
    outputArr = new Array(len);

    if (len === 0) {
      cb(null, '');
    } else {
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];

        switch (dimen) {
          case 1:
            func(item, i, len, done);
            break;
          case 2:
            func(item[0], item[1], i, len, done);
            break;
          case 3:
            func(item[0], item[1], item[2], i, len, done);
            break;
          default:
            item.push(i, len, done);
            func.apply(this, item);
        }
      }
    }
  } else {
    const keys = Object.keys(arr || {});
    len = keys.length;
    outputArr = new Array(len);

    if (len === 0) {
      cb(null, '');
    } else {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        func(k, arr[k], i, len, done);
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
  fromIterator
};
