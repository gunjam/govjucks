'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {
  after, before, describe, it
} = require('node:test');
const govjucks = require('../index');
const fs = require('fs-extra');

function rmdir(dirPath) {
  fs.emptyDirSync(dirPath);
  fs.rmdirSync(dirPath);
}

describe('govjucks.configure', () => {
  let tempdir;

  before(() => {
    try {
      tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'templates'));
      fs.emptyDirSync(tempdir);
    } catch (e) {
      rmdir(tempdir);
      throw e;
    }
  });

  after(() => {
    govjucks.reset();
    rmdir(tempdir);
  });

  it('should cache templates by default', () => {
    govjucks.configure(tempdir);

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}', 'utf-8');
    assert.equal(govjucks.render('test.html', {name: 'foo'}), 'foo');

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}-changed', 'utf-8');
    assert.equal(govjucks.render('test.html', {name: 'foo'}), 'foo');
  });

  it('should not cache templates with {noCache: true}', () => {
    govjucks.configure(tempdir, {noCache: true});

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}', 'utf-8');
    assert.equal(govjucks.render('test.html', {name: 'foo'}), 'foo');

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}-changed', 'utf-8');
    assert.equal(govjucks.render('test.html', {name: 'foo'}), 'foo-changed');
  });
});
