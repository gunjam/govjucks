'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');
const govjucks = require('../index');

describe('govjucks.configure', () => {
  let tempdir;

  before(() => {
    tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'templates'));
  });

  after(() => {
    govjucks.reset();
    fs.rmSync(tempdir, { recursive: true, force: true });
  });

  it('should cache templates by default', () => {
    govjucks.configure(tempdir);

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}', 'utf-8');
    assert.equal(govjucks.render('test.html', { name: 'foo' }), 'foo');

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}-changed', 'utf-8');
    assert.equal(govjucks.render('test.html', { name: 'foo' }), 'foo');
  });

  it('should not cache templates with {noCache: true}', () => {
    govjucks.configure(tempdir, { noCache: true });

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}', 'utf-8');
    assert.equal(govjucks.render('test.html', { name: 'foo' }), 'foo');

    fs.writeFileSync(tempdir + '/test.html', '{{ name }}-changed', 'utf-8');
    assert.equal(govjucks.render('test.html', { name: 'foo' }), 'foo-changed');
  });
});
