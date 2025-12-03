'use strict';

const ObjProto = Object.prototype;

const escapeRegExp = /["&'<>\\]/g;

/**
 * Escapes HTML characters in a string.
 * @param {string} string
 * @returns {string} escaped string
 */
const escapeFunction = (string) => {
  let escaped = '';
  let start = 0;

  while (escapeRegExp.test(string)) {
    const i = escapeRegExp.lastIndex - 1;

    switch (string.charCodeAt(i)) {
      // "
      case 34: {
        escaped += string.slice(start, i) + '&#34;';
        break;
      }
      // &
      case 38: {
        escaped += string.slice(start, i) + '&#38;';
        break;
      }
      // '
      case 39: {
        escaped += string.slice(start, i) + '&#39;';
        break;
      }
      // <
      case 60: {
        escaped += string.slice(start, i) + '&lt;';
        break;
      }
      // >
      case 62: {
        escaped += string.slice(start, i) + '&gt;';
        break;
      }
      // \\
      case 92: {
        escaped += string.slice(start, i) + '&#92;';
        break;
      }
    }

    start = escapeRegExp.lastIndex;
  }

  return escaped + string.slice(start);
};

module.exports.escape = escapeFunction;

function _prettifyError (path, withInternals, err) {
  if (!err.Update) {
    // not one of ours, cast it
    err = new TemplateError(err);
  }
  err.Update(path);

  // Unless they marked the dev flag, show them a trace from here
  if (!withInternals) {
    const old = err;
    err = new Error(old.message);
    err.name = old.name;
  }

  return err;
}

module.exports._prettifyError = _prettifyError;

/**
 * Error to throw in templates, tracking line and column numbers for debugging.
 * @param {string|Error} message
 * @param {number} lineno
 * @param {number} colno
 * @returns {TemplateError}
 */
function TemplateError (message, lineno, colno) {
  let err;
  let cause;

  if (message instanceof Error) {
    cause = message;
    message = `${cause.name}: ${cause.message}`;
  }

  if (Object.setPrototypeOf) {
    err = new Error(message);
    Object.setPrototypeOf(err, TemplateError.prototype);
  } else {
    err = this;
    Object.defineProperty(err, 'message', {
      enumerable: false,
      writable: true,
      value: message,
    });
  }

  Object.defineProperty(err, 'name', {
    value: 'Template render error',
  });

  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, this.constructor);
  }

  let getStack;

  if (cause) {
    const stackDescriptor = Object.getOwnPropertyDescriptor(cause, 'stack');
    getStack = stackDescriptor && (stackDescriptor.get ?? (() => stackDescriptor.value));
    if (!getStack) {
      getStack = () => cause.stack;
    }
  } else {
    const stack = (new Error(message)).stack;
    getStack = () => stack;
  }

  Object.defineProperty(err, 'stack', {
    get: () => getStack.call(err),
  });

  Object.defineProperty(err, 'cause', {
    value: cause
  });

  err.lineno = lineno;
  err.colno = colno;
  err.firstUpdate = true;

  err.Update = function Update (path) {
    let msg = '(' + (path ?? 'unknown path') + ')';

    // only show lineno + colno next to path of template
    // where error occurred
    if (this.firstUpdate) {
      if (this.lineno && this.colno) {
        msg += ` [Line ${this.lineno}, Column ${this.colno}]`;
      } else if (this.lineno) {
        msg += ` [Line ${this.lineno}]`;
      }
    }

    msg += '\n ';
    if (this.firstUpdate) {
      msg += ' ';
    }

    this.message = msg + (this.message ?? '');
    this.firstUpdate = false;
    return this;
  };

  return err;
}

Object.setPrototypeOf(TemplateError.prototype, Error.prototype);
module.exports.TemplateError = TemplateError;

/**
 * Returns true if input is a function
 * @param {any} obj
 * @returns {boolean}
 */
function isFunction (obj) {
  return typeof obj === 'function';
}

module.exports.isFunction = isFunction;

/**
 * Returns true if input is a string
 * @param {any} obj
 * @returns {boolean}
 */
function isString (obj) {
  return typeof obj === 'string';
}

module.exports.isString = isString;

/**
 * Returns true if input is an object literal
 * @param {any} obj
 * @returns {boolean}
 */
function isObject (obj) {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return ObjProto.toString.call(obj) === '[object Object]';
}

module.exports.isObject = isObject;

/**
 * @param {string|number} attr
 * @returns {(string|number)[]}
 * @private
 */
function _prepareAttributeParts (attr) {
  if (!attr) {
    return [];
  }

  if (typeof attr === 'string') {
    return attr.split('.');
  }

  return [attr];
}

/**
 * @param {string}   attribute      Attribute value. Dots allowed.
 * @returns {function(Object): *}
 */
function getAttrGetter (attribute) {
  const parts = _prepareAttributeParts(attribute);

  return function attrGetter (item) {
    let _item = item;

    for (let i = 0, len = parts.length; i < len; i++) {
      // If item is not an object, and we still got parts to handle, it means
      // that something goes wrong. Just roll out to undefined in that case.
      _item = _item?.[parts[i]];
      if (_item === undefined) {
        return _item;
      }
    }

    return _item;
  };
}

module.exports.getAttrGetter = getAttrGetter;

function groupBy (obj, val, throwOnUndefined) {
  const result = {};
  const iterator = isFunction(val) ? val : getAttrGetter(val);
  for (let i = 0; i < obj.length; i++) {
    const value = obj[i];
    const key = iterator(value, i);
    if (key === undefined && throwOnUndefined === true) {
      throw new TypeError(`groupby: attribute "${val}" resolved to undefined`);
    }
    (result[key] || (result[key] = [])).push(value);
  }
  return result;
}

module.exports.groupBy = groupBy;

/**
 * Convert input iterable to an array, returns an empty array if input is not
 * iterable.
 * @param {any} obj
 * @returns {Array}
 */
function toArray (obj) {
  if (obj?.[Symbol.iterator]) {
    return [...obj];
  }
  return [];
}

module.exports.toArray = toArray;

/**
 * Return a new array with input values removed from it.
 * @param {Array} array
 * @returns {Array}
 */
function without (array, ...remove) {
  if (!array) {
    return [];
  }
  return array.filter((item) => remove.indexOf(item) === -1);
}

module.exports.without = without;

/**
 * Returns a String value that is made from count copies appended together. If
 * count is 0, the empty string is returned.
 * @param {string} char
 * @param {number} length
 * @returns {string}
 */
function repeat (char, length) {
  return char.repeat(length);
}

module.exports.repeat = repeat;

/**
 * Calls a function for each element in an array, using the context as its `this`.
 * @param {Array} obj
 * @param {function} func
 * @param {Context} context
 */
function each (obj, func, context) {
  if (obj === null || obj === undefined) {
    return;
  }

  const fn = func.bind(context);
  for (let i = 0, l = obj.length ?? 0; i < l; i++) {
    fn(obj[i], i, obj);
  }
}

module.exports.each = each;

/**
 * Calls a defined callback function on each element of an array, and returns an
 * array that contains the results.
 * @param {Array} obj
 * @param {function} func
 */
function map (obj, func) {
  const length = obj?.length;
  if (length === undefined) {
    return [];
  }

  const results = new Array(length);
  for (let i = 0; i < length; i++) {
    results[i] = func(obj[i], i);
  }

  return results;
}

module.exports.map = map;

/**
 * Asyncronously iterates over an array, calling a function for each element.
 * @param {Array} arr
 * @param {function} iter
 * @param {function} cb
 */
function asyncIter (arr, iter, cb) {
  let i = -1;

  function next () {
    i++;

    if (i < arr.length) {
      iter(arr[i], i, next, cb);
    } else {
      cb();
    }
  }

  next();
}

module.exports.asyncIter = asyncIter;

/**
 * Asyncronously iterates over an object, calling a function for each element.
 * @param {object} arr
 * @param {function} iter
 * @param {function} cb
 */
function asyncFor (obj, iter, cb) {
  const keys = Object.keys(obj ?? {});
  const len = keys.length;
  let i = -1;

  function next () {
    i++;
    const k = keys[i];

    if (i < len) {
      iter(k, obj[k], i, len, next);
    } else {
      cb();
    }
  }

  next();
}

module.exports.asyncFor = asyncFor;

/**
 * Returns the index of the first occurrence of a value in an array, or -1 if it
 * is not present.
 * @param {Iterable} arr
 * @param {any} searchElement
 * @param {number} fromIndex
 * @returns {number} index
 */
function indexOf (arr, searchElement, fromIndex) {
  return Array.prototype.indexOf.call(arr ?? [], searchElement, fromIndex);
}

module.exports.indexOf = indexOf;

/**
 * Add right object's properties to the left object
 * @param {object} obj1
 * @param {object} obj2
 * @returns {object}
 */
function extend (obj1, obj2) {
  return Object.assign(obj1 ?? {}, obj2);
}

module.exports._assign = module.exports.extend = extend;

/**
 * Return true if key is a property of value.
 * @param {string} key
 * @param {any} val
 * @returns {boolean}
 */
function inOperator (key, val) {
  if (Array.isArray(val) || isString(val)) {
    return val.indexOf(key) !== -1;
  } else if (isObject(val)) {
    return key in val;
  }
  throw new Error('Cannot use "in" operator to search for "' +
    key + '" in unexpected types.');
}

module.exports.inOperator = inOperator;

/** @typedef {import("./environment.js").Context} Context */
