'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const { execFile } = require('node:child_process');

const rootDir = path.resolve(path.join(__dirname, '..'));
let precompileBin = path.join(rootDir, 'bin', 'precompile');

if (process.platform === 'win32') {
  precompileBin += '.cmd';
}

function execPrecompile (args, cb) {
  execFile(precompileBin, args, { cwd: rootDir, shell: true }, cb);
}

describe('precompile cli', () => {
  it('should echo a compiled template to stdout', (t, done) => {
    execPrecompile(['tests/templates/item.njk'], (err, stdout, stderr) => {
      if (err) {
        done(err);
        return;
      }
      assert.ok(stdout.includes('window.govjucksPrecompiled'));
      assert.equal(stderr, '');
      done();
    });
  });

  it('should support --name', (t, done) => {
    const args = [
      '--name', 'item.njk',
      'tests/templates/item.njk',
    ];
    execPrecompile(args, (err, stdout, stderr) => {
      if (err) {
        done(err);
        return;
      }
      assert.ok(stdout.includes('"item.njk"'));
      assert.equal(stderr, '');
      done();
    });
  });
});
