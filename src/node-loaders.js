'use strict';

const fs = require('node:fs');
const path = require('node:path');
const isPlainObj = require('is-plain-obj').default;
const Loader = require('./loader');
const NullObject = require('./null-object.js');
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

    this.pathsToNames = new NullObject();
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
        // Since we are watching recursively, don't watch sub folders of folders
        // we are already watching.
        if (this.#watchers.some(p => searchPath.startsWith(p))) {
          continue;
        }

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
   * @param {NodeResolveLoaderOptions} opts Options
   */
  constructor (opts = {}) {
    super();

    this.pathsToNames = new NullObject();
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
 * Loads templates from a specific node module using node's module resolution
 * algorithm.
 *
 * @example
 * ```javascript
 * const loader = new PackageLoader('govuk-frontend', 'dist');
 *
 * // node_modules/govuk-frontend/dist/govuk/components/button/macro.njk
 * loader.getSource('govuk/components/button/macro.njk');
 * ```
 */
class PackageLoader extends NodeResolveLoader {
  #packagePath;

  /**
   *
   * @param {string} packageName Name of node module to load template from
   * @param {string} [packagePath] Optional file path within module root
   * @param {NodeResolveLoaderOptions} [opts] Loader options
   */
  constructor (packageName, packagePath = '/', opts = {}) {
    super(opts);

    try {
      require.resolve(packageName);
    } catch (err) {
      throw new Error(`Failed to resolve package "${packageName}"`, {
        cause: err
      });
    }

    this.#packagePath = path.join(packageName, packagePath);
  }

  /**
   * Get template source
   * @param {string} name The template name
   * @returns {TemplateSourceObject}
   */
  getSource (name) {
    return super.getSource(path.join(this.#packagePath, name));
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

/**
 * Use multiple loaders mapped to a tempalte path prefix. The prefix is delimited
 * by a slash by default, but can be configured by passing a string to the
 * `delimiter` parameter.
 *
 * @example
 * ```javascript
 * const loader = new PrefixLoader({
 *   app1: new FileSystemLoader(['./some-app/views']),
 *   app2: new FileSystemLoader(['./another-app/src/views'])
 * });
 *
 * const app1Page = loader.getSource('app1/page.njk');
 * const app2Page = loader.getSource('app2/page.njk');
 * ```
 */
class PrefixLoader extends Loader {
  #loaderMap = new Map();
  #delimiter;
  async = false;

  /**
   * @param {PrefixLoaderMap} [loaderMap] Object map of prefixes and loaders
   * @param {string} [delimiter='/'] Prefix delimiter, default is `'/'`
   */
  constructor (loaderMap = {}, delimiter = '/') {
    super();

    if (!isPlainObj(loaderMap)) {
      throw new TypeError('Map must be a plain object of prefixes and loaders');
    }
    if (typeof delimiter !== 'string') {
      throw new TypeError('Delimiter must ba a string');
    }

    this.#delimiter = delimiter;

    for (const prefix of Object.keys(loaderMap)) {
      const loader = loaderMap[prefix];
      if (typeof loader.getSource !== 'function') {
        throw new TypeError('All loaders must have a getSource() method');
      }
      this.async ||= loader.async;
      this.#loaderMap.set(prefix, loader);

      // Pass through events to environment which will be listening on this
      loader.on('load', (...args) => this.emit('load', ...args));
      loader.on('update', (...args) => this.emit('update', ...args));
    }
  }

  /**
   * Get template source
   * @param {string} prefixedName The template name
   * @param {function} [cb] Asynchronous callback, required if one or more of
   *    the loaders is asynchronous
   * @returns {TemplateSourceObject}
   */
  getSource (prefixedName, cb) {
    const [prefix, name] = prefixedName.split(this.#delimiter, 2);
    const loader = this.#loaderMap.get(prefix);

    if (!loader) {
      if (!this.async) {
        return null;
      }
      cb(null, null);
    } else if (loader.async) {
      loader.getSource(name, cb);
    } else if (this.async) {
      try {
        const source = loader.getSource(name);
        cb(null, source);
      } catch (e) {
        cb(e);
      }
    } else {
      return loader.getSource(name);
    }
  }
}

module.exports = {
  FileSystemLoader,
  PrecompiledLoader,
  NodeResolveLoader,
  PackageLoader,
  DictLoader,
  FunctionLoader,
  PrefixLoader,
};

/**
 * @typedef {object} TemplateSourceObject
 * @property {string} src Govjucks template source
 * @property {string} path Full file path to template
 * @property {boolean} noCache `true` if the template will not be cached
 */

/**
 * @typedef {object} FileSystemLoaderOptions
 * @property {boolean} [watch] If `true`, the system will automatically update
 *   templates when they are changed on the filesystem
 * @property {boolean} [noCache] If `true`, the system will avoid using a cache
 *   and templates will be recompiled every single time
 */

/**
 * @typedef {object} NodeResolveOptions
 * @property {string[]} [requirePaths] Paths to resolve node module locations
 *   from, if set they are used over the default resolution paths
 *   (eg: `node_modules`, etc).
 */

/**
 * @typedef {FileSystemLoaderOptions & NodeResolveOptions} NodeResolveLoaderOptions
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

/**
 * @typedef {Record<string, Loader>} PrefixLoaderMap Object mapping prefixes to
 *   loaders names.
 */
