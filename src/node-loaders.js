'use strict';

const fs = require('node:fs');
const path = require('node:path');
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
 * A loader that uses a function to load the template. The function will receive
 * the template name and must either return the source as a string or `null` if
 * the template could not be loaded.
 *
 * @example
 * ```javascript
 * function loaderFn(name) {
 *   return getTemplateSource(name);
 * }

 * const loader = new FunctionLoader(loaderFn);
 * ```
 */
class FunctionLoader extends Loader {
  #fn;

  /**
   *
   * @param {Function} fn The function to load the template source.
   * @param {FunctionLoaderOptions} opts Options.
   */
  constructor (fn, opts = {}) {
    super();

    if (!(fn instanceof Function)) {
      throw new TypeError('Loader must be a function');
    }

    this.#fn = fn;
    this.noCache = !!opts.noCache;
  }

  getSource (name) {
    let src;

    try {
      src = this.#fn(name);
    } catch (e) {
      return null;
    }

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
  FunctionLoader,
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
 * @typedef {object} FunctionLoaderOptions
 * @property {boolean} noCache If `true`, the system will avoid using a cache
 *   and templates will be recompiled every single time
 */
