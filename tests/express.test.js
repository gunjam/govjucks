'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { beforeEach, describe, it } = require('node:test');
const express = require('express');
const request = require('supertest');
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

  it('should render a view with extension', (t, done) => {
    app.get('/', (req, res) => {
      res.render('about.html');
    });
    request(app)
      .get('/')
      .expect(/This is just the about page/)
      .end(done);
  });

  it('should render a view without extension', (t, done) => {
    app.get('/', (req, res) => {
      res.render('about');
    });
    app.set('view engine', 'html');
    request(app)
      .get('/')
      .expect(/This is just the about page/)
      .end(done);
  });
});
