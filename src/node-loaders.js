'use strict';

const fs = require('node:fs');
const path = require('node:path');
const isPlainObj = require('is-plain-obj').default;
const Loader = require('./loader');
const { PrecompiledLoader } = require('./precompiled-loader.js');

/**
 * @param {FileSystemLoader | NodeResolveLoader} instance
 * @param {string} watchPath
 * @returns {fs.WatchListener<string>}
 */
function getWatchHandler (instance, watchPath) {
  return (_, filename) => {
    if (filename) {
      const fullname = path.resolve(watchPath, filename);
      if (fullname in instance.pathsToNames) {
        instance.emit('update', instance.pathsToNames[fullname], fullname);
      }
    }
  };
}

/**
 * Load templates from the filesystem, using the searchPaths array as paths to
 * look for templates.
 */
class FileSystemLoader extends Loader {
  /** @type {fs.FSWatcher[] | undefined} */
  #watchers;

  /**
   * @param {string | string[]} [searchPaths] File paths to look for govjucks
   *   templates
   * @param {FileSystemLoaderOptions} [opts] Options
   */
  constructor (searchPaths, opts = {}) {
    super();

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
      this.#watchers = [];

      // Watch all the templates in the paths and fire an event when
      // they change
      for (const searchPath of this.searchPaths.filter(fs.existsSync)) {
        const watcher = fs.watch(searchPath, { recursive: true });
        watcher.on('change', getWatchHandler(this, searchPath));
        watcher.on('error', (error) => {
          console.log('Watcher error: ' + error);
        });
        this.#watchers.push(watcher);
      }
    }
  }

  /**
   * When in watch mode, stop watching the templates for changes. Once stopped,
   * the watchers can not be restarted.
   */
  stopWatching () {
    for (const watcher of this.#watchers) {
      watcher.close();
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
  /** @type {fs.FSWatcher[] | undefined} */
  #watchers;
  /** @type {Set<string> | undefined} */
  #watchPaths;
  /** @type {String[] | undefined} */
  #requirePaths;
  #watching = false;

  /**
   * @param {FileSystemLoaderOptions} opts Options
   */
  constructor (opts = {}) {
    super();

    this.pathsToNames = {};
    this.noCache = !!opts.noCache;
    this.#requirePaths = Array.isArray(opts.requirePaths)
      ? opts.requirePaths
      : undefined;

    if (opts.watch) {
      this.#watching = true;
      this.#watchers = [];
      this.#watchPaths = new Set();
      this.on('load', (_, source) => {
        const dir = path.dirname(source.path);

        // Don't watch the same path twice or any parent paths
        if (
          this.#watching === false ||
          this.#watchPaths.has(dir) ||
          Array.from(this.#watchPaths).some((p) => dir.startsWith(p))
        ) {
          return;
        }

        this.#watchPaths.add(dir);

        const watcher = fs.watch(dir, { recursive: true });
        watcher.on('change', getWatchHandler(this, dir));
        watcher.on('error', (error) => {
          console.log('Watcher error: ' + error);
        });
        this.#watchers.push(watcher);
      });
    }
  }

  /**
   * When in watch mode, stop watching the templates for changes. Once stopped,
   * the watchers can not be restarted.
   */
  stopWatching () {
    if (this.#watching) {
      for (const watcher of this.#watchers) {
        watcher.close();
      }
      this.#watching = false;
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
      const opts = this.#requirePaths
        ? { paths: this.#requirePaths }
        : undefined;

      fullpath = require.resolve(name, opts);
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

/**
 * A loader that uses a function to load the template. The function will receive
 * the template name (and optional callback function if the `async` option is
 * `true`) and must either return the source as a string or an object containing
 * the source as `src` the file path as `path`, and a function of `upToDateFunc`
 * that returns `true` if the source is up-to-date, or `false` if the cached
 * template should be removed and loaded again. If the template cannot be found
 * the loader function must return `null`.
 *
 * For async loaders the source may be passed back as the second parameter of
 * the callback function (the first is for any errors), or returned as a
 * `Promise`.
 */
class FunctionLoader extends Loader {
  #fn;

  /** @type {Map<string, import("./environment.js").Template>} */
  #cache = new Map();

  /** @type {Map<string, () => boolean>} */
  #upToDateFns = new Map();

  // Don't let environment add a cache as we have a getter to overlay logic
  set cache (_) {}

  // When environment tries to get a template from the loader cache, call the
  // the upToDateFunc first to check if we need to get new source.
  get cache () {
    return {
      get: (name) => {
        if (this.#upToDateFns.get(name)?.() === false) {
          this.cache.delete(name);
          return undefined;
        }
        return this.#cache.get(name);
      },
      set: (name, template) => {
        this.#cache.set(name, template);
      },
      delete: (name) => {
        this.#cache.delete(name);
      },
      clear: () => {
        this.#cache.clear();
      },
      has: (name) => {
        return this.#cache.has(name);
      },
    };
  }

  /**
   * @param {FunctionLoaderFunction} fn The function to load the template source.
   * @param {FunctionLoaderOptions} opts Options.
   */
  constructor (fn, opts = {}) {
    super();

    if (!(fn instanceof Function)) {
      throw new TypeError('Loader must be a function');
    }

    this.#fn = fn;
    this.noCache = !!opts.noCache;
    this.async = !!opts.async;
  }

  /**
   * Get the source for a given template name.
   * @param {string} name The name of the template to load.
   * @param {Function} [cb] The callback function to call with the source.
   * @returns {string | void} The template source when not aysnc.
   */
  getSource (name, cb) {
    /** @param {FunctionLoaderSourceObject | string} src */
    const toSourceObject = (src) => {
      if (!src) {
        return null;
      }

      let source;

      if (typeof src === 'object') {
        if (typeof src.upToDateFunc === 'function') {
          this.#upToDateFns.set(name, src.upToDateFunc);
        }

        source = {
          src: src.src,
          path: src.path,
          noCache: this.noCache
        };
      } else {
        source = {
          src,
          path: name,
          noCache: this.noCache
        };
      }

      return source;
    };

    if (this.async) {
      /** @type {FunctionLoaderFunctionCallback} */
      const handler = (err, src) => {
        try {
          if (err) {
            cb(err);
            return;
          }
          const source = toSourceObject(src);
          if (source) {
            this.emit('load', name, source);
          }
          cb(null, source);
        } catch (e) {
          cb(e);
        }
      };

      this.#fn(name, handler)?.then?.((src) => handler(null, src)).catch(cb);
    } else {
      const source = toSourceObject(this.#fn(name));
      if (source) {
        this.emit('load', name, source);
      }
      return source;
    }
  }
}

module.exports = {
  FileSystemLoader,
  PrecompiledLoader,
  NodeResolveLoader,
  DictLoader,
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
 * @typedef {Record<string, string>} DictLoaderMap Object mapping template names
 *   to their source.
 */

/**
 * @typedef {object} DictLoaderOptions
 * @property {boolean} noCache If `true`, the system will avoid using a cache
 *   and templates will be recompiled every single time
 */

/**
 * @typedef {object} FunctionLoaderOptions
 * @property {boolean} noCache If `true`, the system will avoid using a cache
 *   and templates will be recompiled every single time
 * @property {boolean} async Set to `true` if the loader function is async, it
 *   will then receive a callback function in as the second parameter to pass
 *   back the source, alternatively you can return a promise.
 */

/**
 * @typedef {object} FunctionLoaderSourceObject
 * @property {string} src Govjucks template source
 * @property {string} path Full file path to template
 * @property {() => boolean} upToDateFunc Function that returns a boolean value
 *   indicating whether the template is up to date (can remain in cache)
 */

/**
 * @callback FunctionLoaderFunction Function that loads a template
 * @param {string} name Template name Template name
 * @param {FunctionLoaderFunctionCallback} [callback] Optional callback function
 *   to pass back the source
 * @returns {string | FunctionLoaderSourceObject | null | Promise<string | FunctionLoaderSourceObject | null> | void}
 */

/** @typedef {(err: Error | null, src: string | FunctionLoaderSourceObject | null) => void} FunctionLoaderFunctionCallback */
