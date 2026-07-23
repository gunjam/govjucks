'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { Environment } = require('../src/environment');
const { FileSystemLoader, NodeResolveLoader, FunctionLoader } = require('../src/node-loaders');

const templatesPath = 'tests/templates';

describe('loader', () => {
  it('should allow a simple loader to be created', () => {
    // From Docs: http://mozilla.github.io/govjucks/api.html#writing-a-loader
    // We should be able to create a loader that only exposes getSource
    function MyLoader () {
      // configuration
    }

    MyLoader.prototype.getSource = function () {
      return {
        src: 'Hello World',
        path: '/tmp/somewhere'
      };
    };

    const env = new Environment(new MyLoader(templatesPath));
    const parent = env.getTemplate('fake.njk');
    assert.equal(parent.render(), 'Hello World');
  });

  it('should catch loader error', (t, done) => {
    // From Docs: http://mozilla.github.io/govjucks/api.html#writing-a-loader
    // We should be able to create a loader that only exposes getSource
    function MyLoader () {
      // configuration
      this.async = true;
    }

    MyLoader.prototype.getSource = function (s, cb) {
      setTimeout(() => {
        cb(new Error('test'));
      }, 1);
    };

    const env = new Environment(new MyLoader(templatesPath));
    env.getTemplate('fake.njk', function (err, parent) {
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
      loader.on('load', function (name, source) {
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
      loader.on('load', function (name, source) {
        assert.equal(name, 'dummy-pkg/simple-template.html');
        done();
      });

      loader.getSource('dummy-pkg/simple-template.html');
    });

    it('should render templates', () => {
      const env = new Environment(new NodeResolveLoader());
      const tmpl = env.getTemplate('dummy-pkg/simple-template.html');
      assert.equal(tmpl.render({ foo: 'foo' }), 'foo');
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

  describe('DictLoader', () => {
    it('should have default opts', () => {
      const loader = new FunctionLoader(() => {});
      assert.ok(loader instanceof FunctionLoader);
      assert.equal(loader.noCache, false);
    });

    it('should emit a "load" event', (t, done) => {
      function loaderFn (name) {
        return `test-${name}`;
      }

      const loader = new FunctionLoader(loaderFn, { noCache: true });
      const exptectSource = {
        path: 'page.njk',
        src: 'test-page.njk',
        noCache: true
      };

      loader.on('load', function (name, source) {
        assert.equal(name, 'page.njk');
        assert.deepEqual(source, exptectSource);
        done();
      });

      const source = loader.getSource('page.njk');
      assert.deepEqual(source, exptectSource);
    });

    it('should render templates', () => {
      function loaderFn (name) {
        return '{{ foo }}';
      }

      const env = new Environment(new FunctionLoader(loaderFn));
      const tmpl = env.getTemplate('page.njk');
      assert.equal(tmpl.render({ foo: 'foo' }), 'foo');
    });

    it('should return null if loader returns null', () => {
      function loaderFn () {
        return null;
      }

      const loader = new FunctionLoader(loaderFn);
      assert.equal(loader.getSource('missing'), null);
    });

    it('should return null if loader function errors', () => {
      function loaderFn () {
        throw new Error();
      }

      const loader = new FunctionLoader(loaderFn);
      assert.equal(loader.getSource('missing'), null);
    });

    it('should throw if loader is not a function', () => {
      assert.throws(() => new FunctionLoader('bad'), { name: 'TypeError' });
    });
  });
});
