'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { finish, render } = require('./util');

describe('runtime', function() {
  it('should report the failed function calls to symbols', (t, done) => {
    render('{{ foo("cvan") }}', {}, {
      noThrow: true
    }, function(err) {
      assert.match(err.message, /Unable to call `foo`, which is undefined/);
    });

    finish(done);
  });

  it('should report the failed function calls to lookups', (t, done) => {
    render('{{ foo["bar"]("cvan") }}', {}, {
      noThrow: true
    }, function(err) {
      assert.match(err.message, /foo\["bar"\]/);
    });

    finish(done);
  });

  it('should report the failed function calls to calls', (t, done) => {
    render('{{ foo.bar("second call") }}', {}, {
      noThrow: true
    }, function(err) {
      assert.match(err.message, /foo\["bar"\]/);
    });

    finish(done);
  });

  it('should report full function name in error', (t, done) => {
    render('{{ foo.barThatIsLongerThanTen() }}', {}, {
      noThrow: true
    }, function(err) {
      assert.match(err.message, /foo\["barThatIsLongerThanTen"\]/);
    });

    finish(done);
  });

  it('should report the failed function calls w/multiple args', (t, done) => {
    render('{{ foo.bar("multiple", "args") }}', {}, {
      noThrow: true
    }, function(err) {
      assert.match(err.message, /foo\["bar"\]/);
    });

    render('{{ foo["bar"]["zip"]("multiple", "args") }}',
      {},
      {
        noThrow: true
      },
      function(err) {
        assert.match(err.message, /foo\["bar"\]\["zip"\]/);
      });

    finish(done);
  });

  it('should allow for undefined macro arguments in the last position', (t, done) => {
    render('{% macro foo(bar, baz) %}' +
      '{{ bar }} {{ baz }}{% endmacro %}' +
      '{{ foo("hello", nosuchvar) }}',
    {},
    {
      noThrow: true
    },
    function(err, res) {
      assert.equal(err, null);
      assert.equal(typeof res, 'string');
    });

    finish(done);
  });

  it('should allow for objects without a prototype macro arguments in the last position', (t, done) => {
    var noProto = Object.create(null);
    noProto.qux = 'world';

    render('{% macro foo(bar, baz) %}' +
    '{{ bar }} {{ baz.qux }}{% endmacro %}' +
    '{{ foo("hello", noProto) }}',
    {
      noProto: noProto
    },
    {
      noThrow: true
    },
    function(err, res) {
      assert.equal(err, null);
      assert.equal(res, 'hello world');
    });

    finish(done);
  });

  it('should not read variables property from Object.prototype', (t, done) => {
    var payload = 'function(){ return 1+2; }()';
    var data = {};
    Object.getPrototypeOf(data).payload = payload;

    render('{{ payload }}', data, {
      noThrow: true
    }, function(err, res) {
      assert.equal(err, null);
      assert.equal(res, payload);
    });
    delete Object.getPrototypeOf(data).payload;

    finish(done);
  });
});
