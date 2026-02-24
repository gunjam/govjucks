'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { beforeEach, describe, it } = require('node:test');
const express = require('express');
const inject = require('light-my-request');
const govjucks = require('../index');

const VIEWS = path.join(__dirname, '../samples/express/views');

describe('express', () => {
  let app;
  let env;

  beforeEach(() => {
    app = express();
    env = new govjucks.Environment(new govjucks.FileSystemLoader(VIEWS));
    env.express(app);
  });

  it('should have reference to govjucks env', () => {
    assert.deepEqual(app.settings.govjucksEnv, env);
  });

  it('should have reference to nunjucks env', () => {
    assert.deepEqual(app.settings.nunjucksEnv, env);
  });

  it('should render a view with extension', async () => {
    app.get('/', (req, res) => {
      res.render('about.html');
    });

    const res = await inject(app, { path: '/' });
    assert.match(res.payload, /This is just the about page/);
  });

  it('should render a view without extension', async () => {
    app.get('/', (req, res) => {
      res.render('about');
    });
    app.set('view engine', 'html');

    const res = await inject(app, { path: '/' });
    assert.match(res.payload, /This is just the about page/);
  });
});
