'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, cpSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { before, after, describe, it } = require('node:test');
const path = require('node:path');
const { Environment } = require('../src/environment');
const { FileSystemLoader, NodeResolveLoader, DictLoader, FunctionLoader } = require('../src/node-loaders');

const templatesPath = 'tests/templates';
const tmpDir = tmpdir();
let tmp;

before(() => {
  tmp = mkdtempSync(path.join(tmpDir, 'loaders-'));
});

after(() => rmSync(tmp, { recursive: true }));

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
        assert.deepEqual(source, {
          src: '{% block test %}{% endblock test %}\n',
          path: path.resolve(templatesPath, 'simple-base.njk'),
          noCache: false
        });
        done();
      });

      loader.getSource('simple-base.njk');
    });

    it('should emit an "update" event on file change in watch mode', (t, done) => {
      const templatePath = path.join(tmp, 'fs-update.njk');
      writeFileSync(templatePath, 'test');

      const loader = new FileSystemLoader(tmp, { watch: true });
      loader.on('update', function (path, fullPath) {
        assert.equal(path, 'fs-update.njk');
        assert.equal(fullPath, templatePath);
        done();
      });

      // Get source so it's added to paths list
      loader.getSource('fs-update.njk');

      // Modify file
      writeFileSync(templatePath, 'updated');
      t.after(() => loader.stopWatching());
    });

    it('should load template from file system', (t) => {
      const loader = new FileSystemLoader(templatesPath);
      const source = loader.getSource('item.njk');
      assert.deepEqual(source, {
        src: 'showing {{ item }}',
        path: path.resolve(templatesPath, 'item.njk'),
        noCache: false
      });
    });

    it('should render templates', () => {
      const env = new Environment(new FileSystemLoader(templatesPath));
      const tmpl = env.getTemplate('item.njk');
      assert.equal(tmpl.render({ item: 'foo' }), 'showing foo');
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
        assert.deepEqual(source, {
          src: '{{ foo }}',
          path: require.resolve('dummy-pkg/simple-template.html'),
          noCache: false
        });
        done();
      });

      loader.getSource('dummy-pkg/simple-template.html');
    });

    it('should emit an "update" event on file change in watch mode', (t, done) => {
      const modules = path.join(tmp, 'node_modules');
      const templatePath = path.join(modules, 'dummy-pkg', 'simple-template.html');
      cpSync(path.join(__dirname, 'test-node-pkgs'), modules, { recursive: true });

      const loader = new NodeResolveLoader({ watch: true, requirePaths: [modules] });
      loader.on('update', function (path, fullPath) {
        const expectedPath = require.resolve('dummy-pkg/simple-template.html', {
          paths: [modules]
        });
        assert.equal(path, 'dummy-pkg/simple-template.html');
        assert.equal(fullPath, expectedPath);
        done();
      });

      // Get source so it's added to paths list
      loader.getSource('dummy-pkg/simple-template.html');

      // Modify file
      writeFileSync(templatePath, 'updated');
      t.after(() => loader.stopWatching());
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
      const loader = new DictLoader();
      assert.ok(loader instanceof DictLoader);
      assert.equal(loader.noCache, false);
    });

    it('should emit a "load" event', (t, done) => {
      const loader = new DictLoader({ 'page.njk': 'test' }, { noCache: true });
      const exptectSource = {
        path: 'page.njk',
        src: 'test',
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
      const env = new Environment(new DictLoader({ 'page.njk': '{{ foo }}' }));
      const tmpl = env.getTemplate('page.njk');
      assert.equal(tmpl.render({ foo: 'foo' }), 'foo');
    });

    it('should return null if no match', () => {
      const loader = new DictLoader({});
      const tmplName = 'dummy-pkg/does-not-exist.html';
      assert.equal(loader.getSource(tmplName), null);
    });

    it('should throw on bad dict', () => {
      assert.throws(() => new DictLoader({ 'page.njk': {} }), { name: 'TypeError' });
    });
  });

  describe('FunctionLoader', () => {
    it('should have default opts', () => {
      const loader = new FunctionLoader(() => {});
      assert.ok(loader instanceof FunctionLoader);
      assert.equal(loader.noCache, false);
    });

    describe('returning string', () => {
      it('should emit a "load" event', (t, done) => {
        function loaderFn (name) {
          return `<h1>Template ${name}</h1>`;
        }

        const loader = new FunctionLoader(loaderFn, { noCache: true });
        const exptectSource = {
          path: 'page.njk',
          src: '<h1>Template page.njk</h1>',
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

      it('should emit a "load" event - async callback', (t, done) => {
        function loaderFn (name, cb) {
          setImmediate(() => cb(null, `<h1>Template ${name}</h1>`));
        }

        const loader = new FunctionLoader(loaderFn, { async: true });
        const exptectSource = {
          path: 'page.njk',
          src: '<h1>Template page.njk</h1>',
          noCache: false
        };

        loader.on('load', function (name, source) {
          assert.equal(name, 'page.njk');
          assert.deepEqual(source, exptectSource);
          done();
        });

        loader.getSource('page.njk', (_, source) => {
          assert.deepEqual(source, exptectSource);
        });
      });

      it('should emit a "load" event - async promise', (t, done) => {
        async function loaderFn (name) {
          return `<h1>Template ${name}</h1>`;
        }

        const loader = new FunctionLoader(loaderFn, { async: true });
        const exptectSource = {
          path: 'page.njk',
          src: '<h1>Template page.njk</h1>',
          noCache: false
        };

        loader.on('load', function (name, source) {
          assert.equal(name, 'page.njk');
          assert.deepEqual(source, exptectSource);
          done();
        });

        loader.getSource('page.njk', (_, source) => {
          assert.deepEqual(source, exptectSource);
        });
      });

      it('should render templates', () => {
        function loaderFn (name) {
          return '{{ foo }}';
        }

        const env = new Environment(new FunctionLoader(loaderFn));
        const tmpl = env.getTemplate('page.njk');
        assert.equal(tmpl.render({ foo: 'foo' }), 'foo');
      });
    });

    describe('returning object', () => {
      it('should emit a "load" event', (t, done) => {
        function loaderFn (name) {
          return {
            path: `dir/${name}`,
            src: '<h1>Title</h1>',
            upToDateFunc: () => true,
          };
        }

        const loader = new FunctionLoader(loaderFn, { noCache: true });
        const exptectSource = {
          path: 'dir/page.njk',
          src: '<h1>Title</h1>',
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

      it('should emit a "load" event - async callback', (t, done) => {
        function loaderFn (name, cb) {
          setImmediate(() => cb(null, {
            path: `dir/${name}`,
            src: '<h1>Title</h1>',
            upToDateFunc: () => true,
          }));
        }

        const loader = new FunctionLoader(loaderFn, { async: true });
        const exptectSource = {
          path: 'dir/page.njk',
          src: '<h1>Title</h1>',
          noCache: false
        };

        loader.on('load', function (name, source) {
          assert.equal(name, 'page.njk');
          assert.deepEqual(source, exptectSource);
          done();
        });

        loader.getSource('page.njk', (_, source) => {
          assert.deepEqual(source, exptectSource);
        });
      });

      it('should emit a "load" event - async promise', (t, done) => {
        async function loaderFn (name) {
          return {
            path: `dir/${name}`,
            src: '<h1>Title</h1>',
            upToDateFunc: () => true,
          };
        }

        const loader = new FunctionLoader(loaderFn, { async: true });
        const exptectSource = {
          path: 'dir/page.njk',
          src: '<h1>Title</h1>',
          noCache: false
        };

        loader.on('load', function (name, source) {
          assert.equal(name, 'page.njk');
          assert.deepEqual(source, exptectSource);
          done();
        });

        loader.getSource('page.njk', (_, source) => {
          assert.deepEqual(source, exptectSource);
        });
      });

      it('should render templates', () => {
        function loaderFn (name) {
          return {
            path: `dir/${name}`,
            src: '{{ foo }}',
            upToDateFunc: () => true,
          };
        }

        const env = new Environment(new FunctionLoader(loaderFn));
        const tmpl = env.getTemplate('page.njk');
        assert.equal(tmpl.render({ foo: 'foo' }), 'foo');
      });

      it('should retain cached template when upToDateFunc returns true', () => {
        let i = 0;
        function loaderFn (name) {
          const source = {
            path: `dir/${name}`,
            src: i === 0 ? 'Template' : 'Updated',
            upToDateFunc: () => true,
          };
          i++;
          return source;
        }

        const env = new Environment(new FunctionLoader(loaderFn));

        {
          const template = env.getTemplate('fake.njk');
          assert.equal(template.render(), 'Template');
        }
        {
          const template = env.getTemplate('fake.njk');
          assert.equal(template.render(), 'Template');
        }
      });

      it('should clear cached template when upToDateFunc returns false', () => {
        let i = 0;
        function loaderFn (name) {
          const source = {
            path: `dir/${name}`,
            src: i === 0 ? 'Template' : 'Updated',
            upToDateFunc: () => false,
          };
          i++;
          return source;
        }

        const env = new Environment(new FunctionLoader(loaderFn));

        {
          const template = env.getTemplate('fake.njk');
          assert.equal(template.render(), 'Template');
        }
        {
          const template = env.getTemplate('fake.njk');
          assert.equal(template.render(), 'Updated');
        }
      });
    });

    it('should return null if loader returns null', () => {
      function loaderFn () {
        return null;
      }

      const loader = new FunctionLoader(loaderFn);
      assert.equal(loader.getSource('missing'), null);
    });

    it('should return null if loader returns null - async callback', (t, done) => {
      function loaderFn (_, cb) {
        return cb(null, null);
      }

      const loader = new FunctionLoader(loaderFn, { async: true });
      loader.getSource('missing', (_, source) => {
        assert.equal(source, null);
        done();
      });
    });

    it('should return null if loader returns null - async promise', (t, done) => {
      async function loaderFn () {
        return null;
      }

      const loader = new FunctionLoader(loaderFn, { async: true });
      loader.getSource('missing', (_, source) => {
        assert.equal(source, null);
        done();
      });
    });

    it('should throw if loader function errors', () => {
      function loaderFn () {
        throw new Error();
      }

      const loader = new FunctionLoader(loaderFn);
      assert.throws(() => loader.getSource('missing'));
    });

    it('should return error in callback if loader function errors - async callback', (t, done) => {
      const expectedError = new Error();

      function loaderFn (_, cb) {
        cb(expectedError);
      }

      const loader = new FunctionLoader(loaderFn, { async: true });
      loader.getSource('missing', (err) => {
        assert.equal(err, expectedError);
        done();
      });
    });

    it('should return error in callback if loader function errors - async promise', (t, done) => {
      const expectedError = new Error();

      async function loaderFn () {
        throw expectedError;
      }

      const loader = new FunctionLoader(loaderFn, { async: true });
      loader.getSource('missing', (err) => {
        assert.equal(err, expectedError);
        done();
      });
    });

    it('should throw if loader is not a function', () => {
      assert.throws(() => new FunctionLoader('bad'), { name: 'TypeError' });
    });
  });
});
