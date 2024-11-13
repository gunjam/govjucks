'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { Environment } = require('../src/environment');
const { FileSystemLoader, NodeResolveLoader } = require('../src/node-loaders');

const templatesPath = 'tests/templates';

describe('loader', () => {
  it('should allow a simple loader to be created', () => {
    // From Docs: http://mozilla.github.io/govjucks/api.html#writing-a-loader
    // We should be able to create a loader that only exposes getSource
    let env, parent;

    function MyLoader() {
      // configuration
    }

    MyLoader.prototype.getSource = function() {
      return {
        src: 'Hello World',
        path: '/tmp/somewhere'
      };
    };

    env = new Environment(new MyLoader(templatesPath));
    parent = env.getTemplate('fake.njk');
    assert.equal(parent.render(), 'Hello World');
  });

  it('should catch loader error', (t, done) => {
    // From Docs: http://mozilla.github.io/govjucks/api.html#writing-a-loader
    // We should be able to create a loader that only exposes getSource
    let env;

    function MyLoader() {
      // configuration
      this.async = true;
    }

    MyLoader.prototype.getSource = function(s, cb) {
      setTimeout(() => {
        cb(new Error('test'));
      }, 1);
    };

    env = new Environment(new MyLoader(templatesPath));
    env.getTemplate('fake.njk', function(err, parent) {
      assert.ok(err instanceof Error);
      assert.equal(parent, undefined);

      done();
    });
  });

  describe('FileSystemLoader', () => {
    it('should have default opts', () => {
      const loader = new FileSystemLoader(templatesPath);
      assert.ok(loader instanceof FileSystemLoader);
      assert.equal(loader.noCache, false);
    });

    it('should emit a "load" event', (t, done) => {
      const loader = new FileSystemLoader(templatesPath);
      loader.on('load', function(name, source) {
        assert.equal(name, 'simple-base.njk');
        done();
      });

      loader.getSource('simple-base.njk');
    });
  });

  describe('NodeResolveLoader', () => {
    it('should have default opts', () => {
      const loader = new NodeResolveLoader();
      assert.ok(loader instanceof NodeResolveLoader);
      assert.equal(loader.noCache, false);
    });

    it('should emit a "load" event', (t, done) => {
      const loader = new NodeResolveLoader();
      loader.on('load', function(name, source) {
        assert.equal(name, 'dummy-pkg/simple-template.html');
        done();
      });

      loader.getSource('dummy-pkg/simple-template.html');
    });

    it('should render templates', () => {
      const env = new Environment(new NodeResolveLoader());
      const tmpl = env.getTemplate('dummy-pkg/simple-template.html');
      assert.equal(tmpl.render({foo: 'foo'}), 'foo');
    });

    it('should not allow directory traversal', () => {
      const loader = new NodeResolveLoader();
      const dummyPkgPath = require.resolve('dummy-pkg/simple-template.html');
      assert.equal(loader.getSource(dummyPkgPath), null);
    });

    it('should return null if no match', () => {
      const loader = new NodeResolveLoader();
      const tmplName = 'dummy-pkg/does-not-exist.html';
      assert.equal(loader.getSource(tmplName), null);
    });
  });
});
