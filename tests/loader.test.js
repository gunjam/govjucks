'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, cpSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { before, after, describe, it } = require('node:test');
const path = require('node:path');
const { Environment } = require('../src/environment');
const { FileSystemLoader, NodeResolveLoader } = require('../src/node-loaders');

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
});
