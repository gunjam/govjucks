'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { precompile, precompileString } = require('../src/precompile');

describe('precompile', () => {
  it('should return a string', () => {
    assert.equal(typeof precompileString('{{ test }}', {
      name: 'test.njk'
    }), 'string');
  });

  describe('templates', () => {
    it('should return *NIX path seperators', () => {
      let fileName;

      precompile('./tests/templates/item.njk', {
        wrapper (templates) {
          fileName = templates[0].name;
        }
      });

      assert.equal(fileName, './tests/templates/item.njk');
    });

    it('should return *NIX path seperators, when name is passed as option', () => {
      let fileName;

      precompile('<span>test</span>', {
        name: 'path\\to\\file.j2',
        isString: true,
        wrapper (templates) {
          fileName = templates[0].name;
        }
      });

      assert.equal(fileName, 'path/to/file.j2');
    });
  });
});
