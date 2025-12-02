const path = require('node:path');

/**
 *
 * @param {import("./environment.js").Environment} env
 * @param {import("express").Application} app
 * @returns
 */
module.exports = function express (env, app) {
  function GovjucksView (name, opts) {
    this.name = name;
    this.path = name;
    this.defaultEngine = opts.defaultEngine;
    this.ext = path.extname(name);
    if (!this.ext && !this.defaultEngine) {
      throw new Error('No default engine was specified and no extension was provided.');
    }
    if (!this.ext) {
      this.name += (this.ext = (this.defaultEngine[0] !== '.' ? '.' : '') + this.defaultEngine);
    }
  }

  GovjucksView.prototype.render = function render (opts, cb) {
    env.render(this.name, opts, cb);
  };

  app.set('view', GovjucksView);
  app.set('govjucksEnv', env);

  // For compatibilty with nunjucks
  app.set('nunjucksEnv', env);

  return env;
};
