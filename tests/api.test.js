'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const util = require('./util');
const Environment = require('../src/environment').Environment;
const Loader = require('../src/node-loaders').FileSystemLoader;
const templatesPath = 'tests/templates';

describe('api', () => {
  it('should always force compilation of parent template', () => {
    const env = new Environment(new Loader(templatesPath));
    const child = env.getTemplate('base-inherit.njk');

    assert.equal(child.render(), 'Foo*Bar*BazFizzle');
  });

  it('should only call the callback once when conditional import fails', (t, done) => {
    const env = new Environment(new Loader(templatesPath));
    let called = 0;

    env.render('broken-conditional-include.njk', () => {
      assert.equal(++called, 1);
      done();
    });
  });

  it('should handle correctly relative paths', () => {
    const env = new Environment(new Loader(templatesPath));
    const child1 = env.getTemplate('relative/test1.njk');
    const child2 = env.getTemplate('relative/test2.njk');

    assert.equal(child1.render(), 'FooTest1BazFizzle');
    assert.equal(child2.render(), 'FooTest2BazFizzle');
  });

  it('should handle correctly cache for relative paths', () => {
    const env = new Environment(new Loader(templatesPath));
    const test = env.getTemplate('relative/test-cache.njk');

    assert.equal(util.normEOL(test.render()), 'Test1\nTest2');
  });

  it('should handle correctly relative paths in renderString', () => {
    const env = new Environment(new Loader(templatesPath));

    assert.equal(env.renderString('{% extends "./relative/test1.njk" %}{% block block1 %}Test3{% endblock %}', {}, {
      path: path.resolve(templatesPath, 'string.njk')
    }), 'FooTest3BazFizzle');
  });

  it('should emit "load" event on Environment instance', (t, done) => {
    const env = new Environment(new Loader(templatesPath));

    env.on('load', (name, source) => {
      assert.equal(name, 'item.njk');
      done();
    });
    env.render('item.njk', {});
  });
});
