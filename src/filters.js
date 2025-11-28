'use strict';

const lib = require('./lib');
const r = require('./runtime');

const hasOwnProperty = Object.prototype.hasOwnProperty;

function normalize (value, defaultValue) {
  if (value === null || value === undefined || value === false) {
    return defaultValue;
  }
  return value;
}

module.exports.abs = Math.abs;

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
  const pad = ' '.repeat(Math.floor(spaces / 2));
  return r.copySafeness(
    str,
    pad + str + (spaces % 2 === 0 ? pad : pad + ' ')
  );
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
module.exports['default'] = default_;

function dictsort (val, caseSensitive, by) {
  if (!lib.isObject(val)) {
    throw new lib.TemplateError('dictsort filter: val must be an object');
  }

  let si;
  if (by === undefined || by === 'key') {
    si = 0;
  } else if (by === 'value') {
    si = 1;
  } else {
    throw new lib.TemplateError(
      'dictsort filter: You can only sort by either key or value');
  }

  const array = [];
  // deliberately include properties from the object's prototype
  for (const k in val) {
    array.push([k, val[k]]);
  }

  array.sort((t1, t2) => {
    let a = t1[si];
    let b = t2[si];

    if (caseSensitive === false) {
      a = a.toLowerCase?.() ?? a;
      b = b.toLowerCase?.() ?? b;
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
  if (r.SafeString.isSafeString(str)) {
    return str;
  }
  str = (str === null || str === undefined) ? '' : str.toString();
  return r.markSafe(lib.escape(str));
}

module.exports.escape = escape;

function safe (str) {
  if (r.SafeString.isSafeString(str)) {
    return str;
  }
  str = (str === null || str === undefined) ? '' : str.toString();
  return r.markSafe(str);
}

module.exports.safe = safe;

function first (arr) {
  return arr[0];
}

module.exports.first = first;

function forceescape (str) {
  str = (str === null || str === undefined) ? '' : str.toString();
  return r.markSafe(lib.escape(str));
}

module.exports.forceescape = forceescape;

function groupby (arr, attr) {
  return lib.groupBy(arr, attr, this.env.opts.throwOnUndefined);
}

module.exports.groupby = groupby;

function indent (str, width, indentfirst) {
  str = normalize(str, '');

  if (str.length === 0) {
    return str;
  }

  const lines = str.split('\n');
  const sp = ' '.repeat(width || 4);
  const nl = '\n' + sp;
  let res = indentfirst === true ? sp + lines[0] : lines[0];

  for (let i = 1, len = lines.length; i !== len; ++i) {
    res += nl + lines[i];
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
  const value = normalize(val, undefined);
  if (value === undefined) {
    return 0;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size;
  }
  if (lib.isObject(value) && r.SafeString.isSafeString(value) === false) {
    let i = 0;
    for (const key in value) {
      if (hasOwnProperty.call(value, key)) {
        i++;
      }
    }
    return i;
  }
  return value.length;
}

module.exports.length = lengthFilter;

function list (val) {
  if (lib.isString(val)) {
    return val.split('');
  }
  if (lib.isObject(val)) {
    const keys = Object.keys(val);
    const len = keys.length;
    const arr = new Array(len);
    for (let i = 0; i !== len; ++i) {
      const key = keys[i];
      arr[i] = { key, value: val[key] };
    }
    return arr;
  }
  if (Array.isArray(val)) {
    return val;
  }
  throw new lib.TemplateError('list filter: type not iterable');
}

module.exports.list = list;

function lower (str) {
  str = normalize(str, '');
  return str.toLowerCase();
}

module.exports.lower = lower;

const newLines = /\r\n|\n/g;
function nl2br (str) {
  if (str === null || str === undefined) {
    return '';
  }
  return r.copySafeness(str, str.replace(newLines, '<br>\n'));
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
  function filter (arr, testName, secondArg) {
    let _arr;

    if (Array.isArray(arr)) {
      _arr = arr;
    } else if (typeof arr === 'string' || r.SafeString.isSafeString(arr)) {
      _arr = arr.split('');
    } else {
      return [];
    }

    testName = testName || 'truthy';
    const filtered = [];

    for (let i = 0, len = _arr.length; i !== len; ++i) {
      const item = _arr[i];
      if (this.env.getTest(testName).call(this, item, secondArg) === expectedTestResult) {
        filtered.push(item);
      }
    }

    return filtered;
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
  if (old instanceof RegExp) {
    return str.replace(old, new_);
  }

  const originalStr = str;
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
  if (typeof str !== 'string' && r.SafeString.isSafeString(str) === false) {
    return str;
  }

  // ShortCircuits
  if (old === '') {
    // Mimic the python behaviour: empty string is replaced
    // by replacement e.g. "abc"|replace("", ".") -> .a.b.c.
    for (let i = 0; i !== str.length; ++i) {
      res += `${new_}${str.charAt(i)}`;
    }
    res += new_;

    return r.copySafeness(str, res);
  }

  maxCount = maxCount || Infinity;
  let nextIndex = str.indexOf(old);
  // if # of replacements to perform is 0, or the string to does
  // not contain the old value, return the string
  if (maxCount === 0 || nextIndex === -1) {
    return str;
  }

  let pos = 0;
  let count = 0; // # of replacements made
  const oldLength = old.length;

  while (nextIndex !== -1 && count !== maxCount) {
    // Grab the next chunk of src string and add it with the
    // replacement, to the result
    res += str.slice(pos, nextIndex) + new_;
    // Increment our pointer in the src string
    pos = nextIndex + oldLength;
    count++;
    // See if there are any more replacements to be made
    nextIndex = str.indexOf(old, pos);
  }

  // We've either reached the end, or done the max # of
  // replacements, tack on any remaining string
  if (pos < str.length) {
    res += str.slice(pos);
  }

  return r.copySafeness(originalStr, res);
}

module.exports.replace = replace;

function reverse (val) {
  const length = val.length;

  if (lib.isString(val)) {
    let str = '';
    for (let i = length; i !== -1; --i) {
      str += val.charAt(i);
    }
    return r.copySafeness(val, str);
  }

  // Copy it
  const arr = new Array(length);
  for (let i = 0; i !== length; ++i) {
    arr[i] = val[length - 1 - i];
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
  const res = new Array(slices);
  let start = 0;

  for (let i = 0; i < slices; i++) {
    const offset = start;
    let arrLength = sliceLength;
    let fillAdjust = 0;
    if (i < extra) {
      arrLength++;
      start++;
    } else if (fillWith) {
      fillAdjust++;
    }
    const currSlice = new Array(arrLength + fillAdjust);
    for (let j = 0; j < arrLength; j++) {
      currSlice[j] = arr[offset + j];
    }
    currSlice[currSlice.length - 1] ??= fillWith;
    res[i] = currSlice;
    start += sliceLength;
  }

  return res;
}

module.exports.slice = slice;

function sum (arr, attr, start) {
  let sum = start ?? 0;
  if (attr) {
    for (let i = 0, len = arr.length; i !== len; ++i) {
      sum += arr[i][attr];
    }
    return sum;
  }
  for (let i = 0, len = arr.length; i !== len; ++i) {
    sum += arr[i];
  }
  return sum;
}

module.exports.sum = sum;

module.exports.sort = r.makeMacro(
  ['value', 'reverse', 'case_sensitive', 'attribute'],
  function sortFilter (arr, reversed, caseSens, attr) {
    const reverse = reversed ? -1 : 1;
    caseSens = caseSens || false;
    attr = attr || false;

    // Copy it
    const array = arr.slice(0);
    const getAttribute = attr && lib.getAttrGetter(attr);

    array.sort((a, b) => {
      let x = a;
      let y = b;

      if (attr) {
        x = getAttribute(a);
        y = getAttribute(b);

        if (
          this.env.opts.throwOnUndefined &&
          (x === undefined || y === undefined)
        ) {
          throw new TypeError(`sort: attribute "${attr}" resolved to undefined`);
        }
      }

      if (caseSens === false && lib.isString(x) && lib.isString(y)) {
        x = x.toLowerCase();
        y = y.toLowerCase();
      }

      if (x < y) {
        return -1 * reverse;
      }
      if (x > y) {
        return 1 * reverse;
      }
      return 0;
    });

    return array;
  });

function string (obj) {
  return r.copySafeness(obj, obj);
}

module.exports.string = string;

const tags = /<\/?[a-z][a-z0-9]*\b[^>]*>|<!--[\s\S]*?-->/gi;
const nlSpaces = /^ +| +$/gm;
const adjSpaces = / +/g;
const lineBreaks = /\r\n/g;
const abnormalBr = /\n\n\n+/g;
const spaces = /\s+/gi;

function striptags (input, preserveLinebreaks) {
  input = normalize(input, '');
  preserveLinebreaks = preserveLinebreaks || false;
  const trimmedInput = trim(input.replace(tags, ''));
  let res = '';
  if (preserveLinebreaks) {
    res = trimmedInput
      .replace(nlSpaces, '') // remove leading and trailing spaces
      .replace(adjSpaces, ' ') // squash adjacent spaces
      .replace(lineBreaks, '\n') // normalize linebreaks (CRLF -> LF)
      .replace(abnormalBr, '\n\n'); // squash abnormal adjacent linebreaks
  } else {
    res = trimmedInput.replace(spaces, ' ');
  }
  return r.copySafeness(input, res);
}

module.exports.striptags = striptags;

function title (str) {
  str = normalize(str, '');
  const words = str.split(' ');
  const length = words.length;

  let res = '';
  if (length !== 0) {
    res += capitalize(words[0]);
    for (let i = 1; i < length; i++) {
      res += ` ${capitalize(words[i])}`;
    }
  }

  return r.copySafeness(str, res);
}

module.exports.title = title;

function trim (str) {
  return r.copySafeness(str, str.trim());
}

module.exports.trim = trim;

function truncate (input, length, killwords, end) {
  let res = normalize(input, '');
  length = length || 255;

  if (res.length <= length) {
    return input;
  }

  if (killwords !== true) {
    const idx = res.lastIndexOf(' ', length);
    if (idx > -1) {
      length = idx;
    }
  }

  res = `${res.substring(0, length)}${end ?? '...'}`;
  return r.copySafeness(input, res);
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
  }
  if (Array.isArray(obj)) {
    return new URLSearchParams(obj).toString();
  }
  const keys = Object.keys(obj);
  const first = keys[0];
  let str = `${enc(first)}=${enc(obj[first])}`;
  for (let i = 1, len = keys.length; i < len; i++) {
    const key = keys[i];
    str += `&${enc(key)}=${enc(obj[key])}`;
  }
  return str;
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
const spaceRe = /^\s+$/;
const splitRe = /(\s+)/;

function urlize (str, length, nofollow) {
  if (Number.isNaN(length)) {
    length = Number.Infinity;
  }

  const noFollowAttr = (nofollow === true ? ' rel="nofollow"' : '');
  const words = str.split(splitRe);
  let urlized = '';

  for (let i = 0, len = words.length; i < len; i++) {
    const word = words[i];

    // If the word has no length, bail. This can happen for str with
    // trailing whitespace.
    if (word && word.length) {
      if (spaceRe.test(word)) {
        urlized += word;
        continue;
      }

      const matches = word.match(puncRe);
      const possibleUrl = matches ? matches[1] : word;
      const shortUrl = possibleUrl.substring(0, length);

      // url that starts with http or https
      if (httpHttpsRe.test(possibleUrl)) {
        urlized += `<a href="${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
        continue;
      }

      // url that starts with www.
      if (wwwRe.test(possibleUrl)) {
        urlized += `<a href="http://${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
        continue;
      }

      // an email address of the form username@domain.tld
      if (emailRe.test(possibleUrl)) {
        urlized += `<a href="mailto:${possibleUrl}">${possibleUrl}</a>`;
        continue;
      }

      // url that ends in .com, .org or .net that is not an email address
      if (tldRe.test(possibleUrl)) {
        urlized += `<a href="http://${possibleUrl}"${noFollowAttr}>${shortUrl}</a>`;
        continue;
      }

      urlized += word;
    }
  }

  return urlized;
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
  return (Number.isNaN(res)) ? def : res;
}

module.exports.float = float;

const intFilter = r.makeMacro(
  ['value', 'default', 'base'],
  function doInt (value, defaultValue, base = 10) {
    const res = Number.parseInt(value, base);
    return (Number.isNaN(res)) ? defaultValue : res;
  }
);

module.exports.int = intFilter;

// Aliases
module.exports.d = module.exports.default;
module.exports.e = module.exports.escape;
