'use strict';

const path = require('node:path');
const { EmitterObj } = require('./object');

module.exports = class Loader extends EmitterObj {
  #resolveCache = new Map();

  /**
   * Resolve relative nunjucks template path to absolute path.
   * @param {string} from
   * @param {string} to
   * @returns {string} absolute path
   */
  resolve (from, to) {
    const key = from + to;
    let resolved = this.#resolveCache.get(key);
    if (resolved) {
      return resolved;
    }
    resolved = path.resolve(path.dirname(from), to);
    this.#resolveCache.set(key, resolved);
    return resolved;
  }

  /**
   * Determine with a nunjucks template path is relative; does it start with
   * `"./"` or `"../"`.
   * @param {string} filename
   * @returns {boolean}
   */
  isRelative (filename) {
    const char1 = filename.charCodeAt(0);
    const char2 = filename.charCodeAt(1);

    // 46 = "."; 47 = "/"
    if (char1 === 46 && char2 === 47) {
      return true;
    }
    if (char1 === 46 && char2 === 46 && filename.charCodeAt(2) === 47) {
      return true;
    }
    return false;
  }
};
