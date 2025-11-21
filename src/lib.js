'use strict';

const ArrayProto = Array.prototype;
const ObjProto = Object.prototype;

const escapeRegExp = /["&'<>\\]/g;

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
    getStack = stackDescriptor && (stackDescriptor.get || (() => stackDescriptor.value));
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
    let msg = '(' + (path || 'unknown path') + ')';

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

    this.message = msg + (this.message || '');
    this.firstUpdate = false;
    return this;
  };

  return err;
}

Object.setPrototypeOf(TemplateError.prototype, Error.prototype);
module.exports.TemplateError = TemplateError;

function isFunction (obj) {
  return obj instanceof Function;
}

module.exports.isFunction = isFunction;

function isString (obj) {
  return typeof obj === 'string';
}

module.exports.isString = isString;

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

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // If item is not an object, and we still got parts to handle, it means
      // that something goes wrong. Just roll out to undefined in that case.
      if (Object.hasOwn(_item, part)) {
        _item = _item[part];
      } else {
        return undefined;
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

function toArray (obj) {
  return Array.prototype.slice.call(obj);
}

module.exports.toArray = toArray;

function without (array, ...remove) {
  if (!array) {
    return [];
  }
  return array.filter((item) => remove.indexOf(item) === -1);
}

module.exports.without = without;

function repeat (char, length) {
  return char.repeat(length);
}

module.exports.repeat = repeat;

function each (obj, func, context) {
  if (obj == null) {
    return;
  }

  if (ArrayProto.forEach && obj.forEach === ArrayProto.forEach) {
    obj.forEach(func, context);
  } else if (obj.length === +obj.length) {
    for (let i = 0, l = obj.length; i < l; i++) {
      func.call(context, obj[i], i, obj);
    }
  }
}

module.exports.each = each;

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

function asyncFor (obj, iter, cb) {
  const keys = Object.keys(obj || {});
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

function indexOf (arr, searchElement, fromIndex) {
  return Array.prototype.indexOf.call(arr || [], searchElement, fromIndex);
}

module.exports.indexOf = indexOf;

function extend (obj1, obj2) {
  obj1 = obj1 || {};
  for (const k of Object.keys(obj2)) {
    obj1[k] = obj2[k];
  }
  return obj1;
}

module.exports._assign = module.exports.extend = extend;

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
