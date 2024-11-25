'use strict';

const lib = require('./lib');
const r = require('./runtime');

function normalize (value, defaultValue) {
  if (value === null || value === undefined || value === false) {
    return defaultValue;
  }
  return value;
}

module.exports.abs = Math.abs;

function isNaN (num) {
  return num !== num; // eslint-disable-line no-self-compare
}

function batch (arr, linecount, fillWith) {
  const length = arr.length;
  const groups = Math.ceil(length / linecount);
  const res = new Array(groups);
  let tmp = [];

  for (let i = 0, p = 0; i < length; i++) {
    if (i % linecount === 0 && i !== 0) {
      res[p++] = tmp;
      tmp = [];
    }

    tmp.push(arr[i]);
  }

  if (fillWith !== undefined) {
    for (let i = tmp.length; i < linecount; i++) {
        tmp.push(fillWith);
      }
    }

  res[groups - 1] = tmp;

  return res;
}

module.exports.batch = batch;

function capitalize (str) {
  str = normalize(str, '');
  const ret = str.toLowerCase();
  return r.copySafeness(str, ret.charAt(0).toUpperCase() + ret.slice(1));
}

module.exports.capitalize = capitalize;

function center (str, width) {
  str = normalize(str, '');
  width = width || 80;

  if (str.length >= width) {
    return str;
  }

  const spaces = width - str.length;
  const padWith = Math.ceil(spaces / 2);
  const pre = ''.padEnd(padWith - (spaces % 2), ' ');
  const post = pre.padEnd(padWith, ' ');
  return r.copySafeness(str, pre + str + post);
}

module.exports.center = center;

function default_ (val, def, bool) {
  if (bool) {
    return val || def;
  } else {
    return (val !== undefined) ? val : def;
  }
}

// TODO: it is confusing to export something called 'default'
exports['default'] = default_;

function dictsort (val, caseSensitive, by) {
  if (!lib.isObject(val)) {
    throw new lib.TemplateError('dictsort filter: val must be an object');
  }

  const array = [];
  // deliberately include properties from the object's prototype
  for (const k in val) {
    array.push([k, val[k]]);
  }

  let si = 0;
  if (by === undefined || by === 'key') {
    si = 0;
  } else if (by === 'value') {
    si = 1;
  } else {
    throw new lib.TemplateError(
      'dictsort filter: You can only sort by either key or value');
  }

  array.sort((t1, t2) => {
    let a = t1[si];
    let b = t2[si];

    if (caseSensitive === false && lib.isString(a) && lib.isString(b)) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }

    return a > b ? 1 : (a === b ? 0 : -1);
  });

  return array;
}

module.exports.dictsort = dictsort;

function dump (obj, spaces) {
  return JSON.stringify(obj, null, spaces);
}

module.exports.dump = dump;

function escape (str) {
  if (str instanceof r.SafeString) {
    return str;
  }
  str = (str === null || str === undefined) ? '' : str.toString();
  return r.markSafe(lib.escape(str));
}

module.exports.escape = escape;

function safe (str) {
  if (str instanceof r.SafeString) {
    return str;
  }
  str = (str === null || str === undefined) ? '' : str;
  return r.markSafe(str.toString());
}

module.exports.safe = safe;

function first (arr) {
  return arr[0];
}

module.exports.first = first;

function forceescape (str) {
  str = (str === null || str === undefined) ? '' : str;
  return r.markSafe(lib.escape(str.toString()));
}

module.exports.forceescape = forceescape;

function groupby (arr, attr) {
  return lib.groupBy(arr, attr, this.env.opts.throwOnUndefined);
}

module.exports.groupby = groupby;

function indent (str, width, indentfirst) {
  str = normalize(str, '');

  if (str === '') {
    return '';
  }

  width = width || 4;
  indentfirst = indentfirst || false;

  const lines = str.split('\n');
  const sp = lib.repeat(' ', width);
  let res = '';

  res += indentfirst ? `${sp}${lines[0]}` : lines[0];
  for (let i = 1, len = lines.length; i !== len; ++i) {
    res += `\n${sp}${lines[i]}`;
  }

  return r.copySafeness(str, res);
}

module.exports.indent = indent;

function join (arr, del, attr) {
  del = del || '';

  let str = attr ? arr[0][attr] : arr[0];
  for (let i = 1, len = arr.length; i !== len; ++i) {
    str += `${del}${attr ? arr[i][attr] : arr[i]}`;
  }
  return str;
}

module.exports.join = join;

function last (arr) {
  return arr[arr.length - 1];
}

module.exports.last = last;

function lengthFilter (val) {
  const value = normalize(val, '');

  if (value !== undefined) {
    if (
      (typeof Map === 'function' && value instanceof Map) ||
      (typeof Set === 'function' && value instanceof Set)
    ) {
      // ECMAScript 2015 Maps and Sets
      return value.size;
    }
    if (lib.isObject(value) && !(value instanceof r.SafeString)) {
      // Objects (besides SafeStrings), non-primative Arrays
      return Object.keys(value).length;
    }
    return value.length;
  }
  return 0;
}

module.exports.length = lengthFilter;

function list (val) {
  if (lib.isString(val)) {
    return val.split('');
  } else if (lib.isObject(val)) {
    return Object.entries(val || {}).map(([key, value]) => ({ key, value }));
  } else if (Array.isArray(val)) {
    return val;
  } else {
    throw new lib.TemplateError('list filter: type not iterable');
  }
}

module.exports.list = list;

function lower (str) {
  str = normalize(str, '');
  return str.toLowerCase();
}

module.exports.lower = lower;

function nl2br (str) {
  if (str === null || str === undefined) {
    return '';
  }
  return r.copySafeness(str, str.replace(/\r\n|\n/g, '<br />\n'));
}

module.exports.nl2br = nl2br;

function random (arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports.random = random;

/**
 * Construct select or reject filter
 *
 * @param {boolean} expectedTestResult
 * @returns {function(array, string, *): array}
 */
function getSelectOrReject (expectedTestResult) {
  function filter (arr, testName = 'truthy', secondArg) {
    const context = this;
    const test = context.env.getTest(testName);

    return lib.toArray(arr).filter(function examineTestResult (item) {
      return test.call(context, item, secondArg) === expectedTestResult;
    });
  }

  return filter;
}

module.exports.reject = getSelectOrReject(false);

function rejectattr (arr, attr) {
  return arr.filter((item) => !item[attr]);
}

module.exports.rejectattr = rejectattr;

module.exports.select = getSelectOrReject(true);

function selectattr (arr, attr) {
  return arr.filter((item) => !!item[attr]);
}

module.exports.selectattr = selectattr;

function replace (str, old, new_, maxCount) {
  const originalStr = str;

  if (old instanceof RegExp) {
    return str.replace(old, new_);
  }

  if (typeof maxCount === 'undefined') {
    maxCount = -1;
  }

  let res = ''; // Output

  // Cast Numbers in the search term to string
  if (typeof old === 'number') {
    old = '' + old;
  } else if (typeof old !== 'string') {
    // If it is something other than number or string,
    // return the original string
    return str;
  }

  // Cast numbers in the replacement to string
  if (typeof str === 'number') {
    str = '' + str;
  }

  // If by now, we don't have a string, throw it back
  if (typeof str !== 'string' && !(str instanceof r.SafeString)) {
    return str;
  }

  // ShortCircuits
  if (old === '') {
    // Mimic the python behaviour: empty string is replaced
    // by replacement e.g. "abc"|replace("", ".") -> .a.b.c.
    res = new_ + str.split('').join(new_) + new_;
    return r.copySafeness(str, res);
  }

  let nextIndex = str.indexOf(old);
  // if # of replacements to perform is 0, or the string to does
  // not contain the old value, return the string
  if (maxCount === 0 || nextIndex === -1) {
    return str;
  }

  let pos = 0;
  let count = 0; // # of replacements made

  /* eslint-disable-next-line no-unmodified-loop-condition */
  while (nextIndex > -1 && (maxCount === -1 || count < maxCount)) {
    // Grab the next chunk of src string and add it with the
    // replacement, to the result
    res += str.substring(pos, nextIndex) + new_;
    // Increment our pointer in the src string
    pos = nextIndex + old.length;
    count++;
    // See if there are any more replacements to be made
    nextIndex = str.indexOf(old, pos);
  }

  // We've either reached the end, or done the max # of
  // replacements, tack on any remaining string
  if (pos < str.length) {
    res += str.substring(pos);
  }

  return r.copySafeness(originalStr, res);
}

module.exports.replace = replace;

function reverse (val) {
  let arr;
  if (lib.isString(val)) {
    arr = list(val);
  } else {
    // Copy it
    arr = lib.map(val, v => v);
  }

  arr.reverse();

  if (lib.isString(val)) {
    return r.copySafeness(val, arr.join(''));
  }
  return arr;
}

module.exports.reverse = reverse;

function round (val, precision, method) {
  precision = precision || 0;
  const factor = Math.pow(10, precision);
  let rounder;

  if (method === 'ceil') {
    rounder = Math.ceil;
  } else if (method === 'floor') {
    rounder = Math.floor;
  } else {
    rounder = Math.round;
  }

  return rounder(val * factor) / factor;
}

module.exports.round = round;

function slice (arr, slices, fillWith) {
  const sliceLength = Math.floor(arr.length / slices);
  const extra = arr.length % slices;
  const res = [];
  let offset = 0;

  for (let i = 0; i < slices; i++) {
    const start = offset + (i * sliceLength);
    if (i < extra) {
      offset++;
    }
    const end = offset + ((i + 1) * sliceLength);

    const currSlice = arr.slice(start, end);
    if (fillWith && i >= extra) {
      currSlice.push(fillWith);
    }
    res.push(currSlice);
  }

  return res;
}

module.exports.slice = slice;

function sum (arr, attr, start = 0) {
  if (attr) {
    arr = lib.map(arr, (v) => v[attr]);
  }

  return start + arr.reduce((a, b) => a + b, 0);
}

module.exports.sum = sum;

module.exports.sort = r.makeMacro(
  ['value', 'reverse', 'case_sensitive', 'attribute'], [],
  function sortFilter (arr, reversed, caseSens, attr) {
    // Copy it
    const array = lib.map(arr, v => v);
    const getAttribute = lib.getAttrGetter(attr);

    array.sort((a, b) => {
      let x = (attr) ? getAttribute(a) : a;
      let y = (attr) ? getAttribute(b) : b;

      if (
        this.env.opts.throwOnUndefined &&
        attr && (x === undefined || y === undefined)
      ) {
        throw new TypeError(`sort: attribute "${attr}" resolved to undefined`);
      }

      if (!caseSens && lib.isString(x) && lib.isString(y)) {
        x = x.toLowerCase();
        y = y.toLowerCase();
      }

      if (x < y) {
        return reversed ? 1 : -1;
      } else if (x > y) {
        return reversed ? -1 : 1;
      } else {
        return 0;
      }
    });

    return array;
  });

function string (obj) {
  return r.copySafeness(obj, obj);
}

module.exports.string = string;

function striptags (input, preserveLinebreaks) {
  input = normalize(input, '');
  const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>|<!--[\s\S]*?-->/gi;
  const trimmedInput = trim(input.replace(tags, ''));
  let res = '';
  if (preserveLinebreaks) {
    res = trimmedInput
      .replace(/^ +| +$/gm, '') // remove leading and trailing spaces
      .replace(/ +/g, ' ') // squash adjacent spaces
      .replace(/(\r\n)/g, '\n') // normalize linebreaks (CRLF -> LF)
      .replace(/\n\n\n+/g, '\n\n'); // squash abnormal adjacent linebreaks
  } else {
    res = trimmedInput.replace(/\s+/gi, ' ');
  }
  return r.copySafeness(input, res);
}

module.exports.striptags = striptags;

function title (str) {
  str = normalize(str, '');
  const words = str.split(' ').map(word => capitalize(word));
  return r.copySafeness(str, words.join(' '));
}

module.exports.title = title;

function trim (str) {
  return r.copySafeness(str, str.replace(/^\s*|\s*$/g, ''));
}

module.exports.trim = trim;

function truncate (input, length, killwords, end) {
  const orig = input;
  input = normalize(input, '');
  length = length || 255;

  if (input.length <= length) {
    return input;
  }

  if (killwords) {
    input = input.substring(0, length);
  } else {
    let idx = input.lastIndexOf(' ', length);
    if (idx === -1) {
      idx = length;
    }

    input = input.substring(0, idx);
  }

  input += (end !== undefined && end !== null) ? end : '...';
  return r.copySafeness(orig, input);
}

module.exports.truncate = truncate;

function upper (str) {
  str = normalize(str, '');
  return str.toUpperCase();
}

module.exports.upper = upper;

function urlencode (obj) {
  const enc = encodeURIComponent;
  if (lib.isString(obj)) {
    return enc(obj);
  } else {
    const keyvals = (Array.isArray(obj)) ? obj : Object.entries(obj);
    return keyvals.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
  }
}

module.exports.urlencode = urlencode;

// For the jinja regexp, see
// https://github.com/mitsuhiko/jinja2/blob/f15b814dcba6aa12bc74d1f7d0c881d55f7126be/jinja2/utils.py#L20-L23
const puncRe = /^(?:\(|<|&lt;)?(.*?)(?:\.|,|\)|\n|&gt;)?$/;
// from http://blog.gerv.net/2011/05/html5_email_address_regexp/
const emailRe = /^[\w.!#$%&'*+\-/=?^`{|}~]+@[a-z\d-]+(\.[a-z\d-]+)+$/i;
const httpHttpsRe = /^https?:\/\/.*$/;
const wwwRe = /^www\./;
const tldRe = /\.(?:org|net|com)(?::|\/|$)/;

function urlize (str, length, nofollow) {
  if (isNaN(length)) {
    length = Infinity;
  }

  const noFollowAttr = (nofollow === true ? ' rel="nofollow"' : '');

  const words = str.split(/(\s+)/).filter((word) => {
    // If the word has no length, bail. This can happen for str with
    // trailing whitespace.
    return word && word.length;
  }).map((word) => {
    const matches = word.match(puncRe);
    const possibleUrl = (matches) ? matches[1] : word;
    const shortUrl = possibleUrl.substr(0, length);

    // url that starts with http or https
    if (httpHttpsRe.test(possibleUrl)) {
      return `<a href="${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
    }

    // url that starts with www.
    if (wwwRe.test(possibleUrl)) {
      return `<a href="http://${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
    }

    // an email address of the form username@domain.tld
    if (emailRe.test(possibleUrl)) {
      return `<a href="mailto:${possibleUrl}">${possibleUrl}</a>`;
    }

    // url that ends in .com, .org or .net that is not an email address
    if (tldRe.test(possibleUrl)) {
      return `<a href="http://${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
    }

    return word;
  });

  return words.join('');
}

module.exports.urlize = urlize;

function wordcount (str) {
  str = normalize(str, '');
  const words = (str) ? str.match(/\w+/g) : null;
  return (words) ? words.length : null;
}

module.exports.wordcount = wordcount;

function float (val, def) {
  const res = parseFloat(val);
  return (isNaN(res)) ? def : res;
}

module.exports.float = float;

const intFilter = r.makeMacro(
  ['value', 'default', 'base'],
  [],
  function doInt (value, defaultValue, base = 10) {
    const res = parseInt(value, base);
    return (isNaN(res)) ? defaultValue : res;
  }
);

module.exports.int = intFilter;

// Aliases
module.exports.d = module.exports.default;
module.exports.e = module.exports.escape;
