'use strict';

const fs = require('node:fs');
const path = require('node:path');
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

module.exports = {
  FileSystemLoader,
  PrecompiledLoader,
  NodeResolveLoader,
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
