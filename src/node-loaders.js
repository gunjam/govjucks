'use strict';

const fs = require('node:fs');
const path = require('node:path');
const isPlainObj = require('is-plain-obj').default;
const Loader = require('./loader');
const { PrecompiledLoader } = require('./precompiled-loader.js');
let chokidar;

/**
 * Load templates from the filesystem, using the searchPaths array as paths to
 * look for templates.
 */
class FileSystemLoader extends Loader {
  /**
   * @param {string | string[]} [searchPaths] File paths to look for govjucks
   *   templates
   * @param {FileSystemLoaderOptions} [opts] Options
   */
  constructor (searchPaths, opts) {
    super();

    opts = opts ?? {};
    this.pathsToNames = {};
    this.noCache = !!opts.noCache;

    if (searchPaths) {
      searchPaths = Array.isArray(searchPaths) ? searchPaths : [searchPaths];
      // For windows, convert to forward slashes
      this.searchPaths = searchPaths.map(path.normalize);
    } else {
      this.searchPaths = ['.'];
    }

    if (opts.watch) {
      // Watch all the templates in the paths and fire an event when
      // they change
      try {
        chokidar = require('chokidar');
      } catch (cause) {
        throw new Error('watch requires chokidar to be installed', { cause });
      }
      const paths = this.searchPaths.filter(fs.existsSync);
      const watcher = chokidar.watch(paths);
      watcher.on('all', (event, fullname) => {
        fullname = path.resolve(fullname);
        if (event === 'change' && fullname in this.pathsToNames) {
          this.emit('update', this.pathsToNames[fullname], fullname);
        }
      });
      watcher.on('error', (error) => {
        console.log('Watcher error: ' + error);
      });
    }
  }

  /**
   * Get template source
   * @param {string} name The template name
   * @returns {TemplateSourceObject}
   */
  getSource (name) {
    let fullpath = null;
    const paths = this.searchPaths;

    for (let i = 0; i < paths.length; i++) {
      const basePath = path.resolve(paths[i]);
      const p = path.resolve(paths[i], name);

      // Only allow the current directory and anything
      // underneath it to be searched
      if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
        fullpath = p;
        break;
      }
    }

    if (!fullpath) {
      return null;
    }

    this.pathsToNames[fullpath] = name;

    const source = {
      src: fs.readFileSync(fullpath, 'utf-8'),
      path: fullpath,
      noCache: this.noCache
    };
    this.emit('load', name, source);
    return source;
  }
}

/**
 * Loads templates from the filesystem using node's require.resolve
 */
class NodeResolveLoader extends Loader {
  /**
   * @param {FileSystemLoaderOptions} opts Options
   */
  constructor (opts) {
    super();
    opts = opts || {};
    this.pathsToNames = {};
    this.noCache = !!opts.noCache;

    if (opts.watch) {
      try {
        chokidar = require('chokidar');
      } catch (cause) {
        throw new Error('watch requires chokidar to be installed', { cause });
      }
      this.watcher = chokidar.watch();

      this.watcher.on('change', (fullname) => {
        this.emit('update', this.pathsToNames[fullname], fullname);
      });
      this.watcher.on('error', (error) => {
        console.log('Watcher error: ' + error);
      });

      this.on('load', (name, source) => {
        this.watcher.add(source.path);
      });
    }
  }

  /**
   * Get template source
   * @param {string} name The template name
   * @returns {TemplateSourceObject}
   */
  getSource (name) {
    // Don't allow file-system traversal
    if ((/^\.?\.?(\/|\\)/).test(name)) {
      return null;
    }
    if ((/^[A-Z]:/).test(name)) {
      return null;
    }

    let fullpath;

    try {
      fullpath = require.resolve(name);
    } catch {
      return null;
    }

    this.pathsToNames[fullpath] = name;

    const source = {
      src: fs.readFileSync(fullpath, 'utf-8'),
      path: fullpath,
      noCache: this.noCache,
    };

    this.emit('load', name, source);
    return source;
  }
}

/**
 * Load templates from a plain object map of template names and source code
 * strings.
 *
 * @example
 * ```javascript
 * const loader = new DictLoader({
 *   "page.njk": "<h1>Hello {{ name }}!</h1>"
 * });
 * ```
 */
class DictLoader extends Loader {
  #dict;
  noCache;

  /**
   * @param {DictLoaderMap} [dict] Object map of template names and source code
   * @param {DictLoaderOptions} [opts] Options
   */
  constructor (dict = {}, opts = {}) {
    super();

    if (
      !isPlainObj(dict) ||
      Object.values(dict).some(v => typeof v !== 'string')
    ) {
      throw new TypeError('Map must be a flat object with string values');
    }

    this.#dict = new Map(Object.entries(dict));
    this.noCache = !!opts.noCache;
  }

  /**
   * Get template source
   * @param {string} name The template name
   * @returns {TemplateSourceObject}
   */
  getSource (name) {
    const src = this.#dict.get(name);
    if (!src) {
      return null;
    }

    const source = {
      src,
      path: name,
      noCache: this.noCache
    };

    this.emit('load', name, source);
    return source;
  }
}

module.exports = {
  FileSystemLoader,
  PrecompiledLoader,
  NodeResolveLoader,
  DictLoader,
};

/**
 * @typedef {object} TemplateSourceObject
 * @property {string} src Govjucks template source
 * @property {string} path Full file path to template
 * @property {boolean} noCache `true` if the template will not be cached
 */

/**
 * @typedef {object} FileSystemLoaderOptions
 * @property {boolean} watch If `true`, the system will automatically update
 *   templates. To use watch, make sure optional dependency chokidar is
 *   installed. when they are changed on the filesystem
 * @property {boolean} noCache If `true`, the system will avoid using a cache
 *   and templates will be recompiled every single time
 */

/**
 * @typedef {Record<string, string>} DictLoaderMap Object mapping template names
 *   to their source.
 */

/**
 * @typedef {object} DictLoaderOptions
 * @property {boolean} noCache If `true`, the system will avoid using a cache
 *   and templates will be recompiled every single time
 */
