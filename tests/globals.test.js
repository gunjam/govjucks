'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');
const { equal, finish, render } = require('./util');
const { Environment } = require('../src/environment');
const { SafeString } = require('../src/runtime');
const globals = require('../src/globals');

describe('global', () => {
  it('should have range', (t, done) => {
    equal('{% for i in range(0, 10) %}{{ i }}{% endfor %}', '0123456789');
    equal('{% for i in range(10) %}{{ i }}{% endfor %}', '0123456789');
    equal('{% for i in range(5, 10) %}{{ i }}{% endfor %}', '56789');
    equal('{% for i in range(-2, 0) %}{{ i }}{% endfor %}', '-2-1');
    equal('{% for i in range(5, 10, 2) %}{{ i }}{% endfor %}', '579');
    equal('{% for i in range(5, 10, 2.5) %}{{ i }}{% endfor %}', '57.5');
    equal('{% for i in range(5, 10, 2.5) %}{{ i }}{% endfor %}', '57.5');

    equal('{% for i in range(10, 5, -1) %}{{ i }}{% endfor %}', '109876');
    equal('{% for i in range(10, 5, -2.5) %}{{ i }}{% endfor %}', '107.5');

    finish(done);
  });

  it('should have cycler', (t, done) => {
    equal(
      '{% set cls = cycler("odd", "even") %}' +
      '{{ cls.next() }}' +
      '{{ cls.next() }}' +
      '{{ cls.next() }}',
      'oddevenodd');

    equal(
      '{% set cls = cycler("odd", "even") %}' +
      '{{ cls.next() }}' +
      '{{ cls.reset() }}' +
      '{{ cls.next() }}',
      'oddodd');

    equal(
      '{% set cls = cycler("odd", "even") %}' +
      '{{ cls.next() }}' +
      '{{ cls.next() }}' +
      '{{ cls.current }}',
      'oddeveneven');

    finish(done);
  });

  it('should have joiner', (t, done) => {
    equal(
      '{% set comma = joiner() %}' +
      'foo{{ comma() }}bar{{ comma() }}baz{{ comma() }}',
      'foobar,baz,');

    equal(
      '{% set pipe = joiner("|") %}' +
      'foo{{ pipe() }}bar{{ pipe() }}baz{{ pipe() }}',
      'foobar|baz|');

    finish(done);
  });

  describe('lipsum', () => {
    it('should have lipsum', (t, done) => {
      const html = render('{{ lipsum() }}');
      assert.ok(SafeString.isSafeString(globals().lipsum()));
      assert.ok(html.startsWith('<p>'));
      assert.ok(html.endsWith('</p>'));
      finish(done);
    });

    it('should have no <p> tags when html is false', (t, done) => {
      const string = render('{{ lipsum(html=false) }}');
      assert.ok(typeof string === 'string');
      assert.ok(!string.startsWith('<p>'));
      assert.ok(!string.endsWith('</p>'));
      finish(done);
    });

    it('should render the correct number of lines', (t, done) => {
      const none = render('{{ lipsum(n=0, html=false) }}');
      assert.equal(none, '');

      for (let n = 1; n <= 50; n++) {
        const lines = render(`{{ lipsum(n=${n}, html=false) }}`);
        assert.equal(lines.match(/\n/g)?.length ?? 0, (n - 1) * 2);
      }
      finish(done);
    });

    it('should render the correct min words', (t, done) => {
      for (let i = 0; i < 5; i++) {
        const m = globals.randomBetween(20, 99);
        for (let i = 0; i < 10; i++) {
          const lines = render(`{{ lipsum(n=1, min=${m}, html=false) }}`);
          assert.ok(lines.match(/ /g).length >= m - 1);
        }
      }
      finish(done);
    });

    it('should render the correct max words', (t, done) => {
      for (let i = 0; i < 5; i++) {
        const m = globals.randomBetween(21, 100);
        for (let i = 0; i < 10; i++) {
          const lines = render(`{{ lipsum(n=1, max=${m}, html=false) }}`);
          assert.ok(lines.match(/ /g).length < m);
        }
      }
      finish(done);
    });
  });

  it('should allow addition of globals', (t, done) => {
    const env = new Environment();

    env.addGlobal('hello', function (arg1) {
      return 'Hello ' + arg1;
    });

    equal('{{ hello("World!") }}', 'Hello World!', env);

    finish(done);
  });

  it('should allow chaining of globals', (t, done) => {
    const env = new Environment();

    env.addGlobal('hello', function (arg1) {
      return 'Hello ' + arg1;
    }).addGlobal('goodbye', function (arg1) {
      return 'Goodbye ' + arg1;
    });

    equal('{{ hello("World!") }}', 'Hello World!', env);
    equal('{{ goodbye("World!") }}', 'Goodbye World!', env);

    finish(done);
  });

  it('should allow getting of globals', (t, done) => {
    const env = new Environment();
    const hello = function (arg1) {
      return 'Hello ' + arg1;
    };

    env.addGlobal('hello', hello);

    assert.equal(env.getGlobal('hello'), hello);

    finish(done);
  });

  it('should allow getting boolean globals', (t, done) => {
    const env = new Environment();
    const hello = false;

    env.addGlobal('hello', hello);

    assert.equal(env.getGlobal('hello'), hello);

    finish(done);
  });

  it('should fail on getting non-existent global', (t, done) => {
    const env = new Environment();

    // Using this format instead of .withArgs since env.getGlobal uses 'this'
    assert.throws(() => {
      env.getGlobal('hello');
    });

    finish(done);
  });

  it('should pass context as this to global functions', (t, done) => {
    const env = new Environment();

    env.addGlobal('hello', function () {
      return 'Hello ' + this.lookup('user');
    });

    equal('{{ hello() }}', {
      user: 'James'
    }, 'Hello James', env);
    finish(done);
  });

  it('should be exclusive to each environment', (t, done) => {
    const env = new Environment();

    env.addGlobal('hello', 'konichiwa');
    const env2 = new Environment();

    // Using this format instead of .withArgs since env2.getGlobal uses 'this'
    assert.throws(() => {
      env2.getGlobal('hello');
    });

    finish(done);
  });

  it('should return errors from globals', (t, done) => {
    const env = new Environment();

    env.addGlobal('err', function () {
      throw new Error('Global error');
    });

    try {
      render('{{ err() }}', null, {}, env);
    } catch (e) {
      assert.ok(e instanceof Error);
    }

    finish(done);
  });
});
