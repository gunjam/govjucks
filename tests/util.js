/* eslint-disable vars-on-top */

'use strict';

const assert = require('node:assert/strict');
const { beforeEach } = require('node:test');
const govjucks = require('../index.js');
const Environment = govjucks.Environment;
const Loader = govjucks.FileSystemLoader;
const Template = govjucks.Template;
const precompileString = govjucks.precompileString;
const templatesPath = 'tests/templates';
const isSlim = false;

let numAsyncs;
let doneHandler;

beforeEach(() => {
  numAsyncs = 0;
  doneHandler = null;
});

function equal(str, ctx, opts, str2, env) {
  if (typeof ctx === 'string') {
    env = opts;
    str2 = ctx;
    ctx = null;
    opts = {};
  }
  if (typeof opts === 'string') {
    env = str2;
    str2 = opts;
    opts = {};
  }
  opts = opts || {};
  const res = render(str, ctx, opts, env);
  assert.equal(res, str2);
}

function jinjaEqual(str, ctx, str2, env) {
  const jinjaUninstalls = [govjucks.installJinjaCompat()];
  try {
    return equal(str, ctx, str2, env);
  } finally {
    for (let i = 0; i < jinjaUninstalls.length; i++) {
      jinjaUninstalls[i]();
    }
  }
}

function finish(done) {
  if (numAsyncs > 0) {
    doneHandler = done;
  } else {
    done();
  }
}

function normEOL(str) {
  if (!str) {
    return str;
  }
  return str.replace(/\r\n|\r/g, '\n');
}

function randomTemplateName() {
  const rand = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
  return rand + '.njk';
}

// eslint-disable-next-line consistent-return
function render(str, ctx, opts, env, cb) {
  if (typeof ctx === 'function') {
    cb = ctx;
    ctx = null;
    opts = null;
    env = null;
  } else if (typeof opts === 'function') {
    cb = opts;
    opts = null;
    env = null;
  } else if (typeof env === 'function') {
    cb = env;
    env = null;
  }

  opts = opts || {};
  opts.dev = true;

  let loader;
  let e;

  if (isSlim) {
    e = env || new Environment([], opts);
    loader = e.loaders[0];
  } else {
    loader = new Loader(templatesPath);
    e = env || new Environment(loader, opts);
  }

  let name;
  if (opts.filters) {
    for (name in opts.filters) {
      if (Object.prototype.hasOwnProperty.call(opts.filters, name)) {
        e.addFilter(name, opts.filters[name]);
      }
    }
  }

  if (opts.asyncFilters) {
    for (name in opts.asyncFilters) {
      if (Object.prototype.hasOwnProperty.call(opts.asyncFilters, name)) {
        e.addFilter(name, opts.asyncFilters[name], true);
      }
    }
  }

  if (opts.extensions) {
    for (name in opts.extensions) {
      if (Object.prototype.hasOwnProperty.call(opts.extensions, name)) {
        e.addExtension(name, opts.extensions[name]);
      }
    }
  }

  let tmplName;
  if (isSlim) {
    tmplName = randomTemplateName();
    let precompileJs = precompileString(str, {
      name: tmplName,
      asFunction: true,
      env: e
    });
    eval(precompileJs); // eslint-disable-line no-eval
  }

  ctx = ctx || {};

  let t;

  if (isSlim) {
    let tmplSource = loader.getSource(tmplName);
    t = new Template(tmplSource.src, e, tmplSource.path);
  } else {
    t = new Template(str, e);
  }

  if (!cb) {
    return t.render(ctx);
  } else {
    numAsyncs++;
    t.render(ctx, function(err, res) {
      if (err && !opts.noThrow) {
        throw err;
      }

      try {
        cb(err, normEOL(res));
      } catch (exc) {
        if (doneHandler) {
          doneHandler(exc);
          numAsyncs = 0;
          doneHandler = null;
        } else {
          throw exc;
        }
      }

      numAsyncs--;

      if (numAsyncs === 0 && doneHandler) {
        doneHandler();
      }
    });
  }
}

module.exports.render = render;
module.exports.equal = equal;
module.exports.jinjaEqual = jinjaEqual;
module.exports.finish = finish;
module.exports.normEOL = normEOL;
module.exports.isSlim = isSlim;
module.exports.Loader = Loader;
