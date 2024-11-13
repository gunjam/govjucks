'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { equal, render } = require('./util');

describe('tests', () => {
  it('callable should detect callability', () => {
    const callable = render('{{ foo is callable }}', {
      foo () {
        return '!!!';
      }
    });
    const uncallable = render('{{ foo is not callable }}', {
      foo: '!!!'
    });
    assert.equal(callable, 'true');
    assert.equal(uncallable, 'true');
  });

  it('defined should detect definedness', () => {
    assert.equal(render('{{ foo is defined }}'), 'false');
    assert.equal(render('{{ foo is not defined }}'), 'true');
    assert.equal(render('{{ foo is defined }}', {
      foo: null
    }), 'true');
    assert.equal(render('{{ foo is not defined }}', {
      foo: null
    }), 'false');
  });

  it('should support "is defined" in {% if %} expressions', () => {
    assert.equal(
      render('{% if foo is defined %}defined{% else %}undefined{% endif %}',
        {})
      , 'undefined');
    assert.equal(
      render('{% if foo is defined %}defined{% else %}undefined{% endif %}',
        { foo: null })
      , 'defined');
  });

  it('should support "is not defined" in {% if %} expressions', () => {
    assert.equal(
      render('{% if foo is not defined %}undefined{% else %}defined{% endif %}',
        {})
      , 'undefined');
    assert.equal(
      render('{% if foo is not defined %}undefined{% else %}defined{% endif %}',
        { foo: null })
      , 'defined');
  });

  it('undefined should detect undefinedness', () => {
    assert.equal(render('{{ foo is undefined }}'), 'true');
    assert.equal(render('{{ foo is not undefined }}'), 'false');
    assert.equal(render('{{ foo is undefined }}', {
      foo: null
    }), 'false');
    assert.equal(render('{{ foo is not undefined }}', {
      foo: null
    }), 'true');
  });

  it('none/null should detect strictly null values', () => {
    // required a change in lexer.js @ 220
    assert.equal(render('{{ null is null }}'), 'true');
    assert.equal(render('{{ none is none }}'), 'true');
    assert.equal(render('{{ none is null }}'), 'true');
    assert.equal(render('{{ foo is null }}'), 'false');
    assert.equal(render('{{ foo is not null }}', {
      foo: null
    }), 'false');
  });

  it('divisibleby should detect divisibility', () => {
    const divisible = render('{{ "6" is divisibleby(3) }}');
    const notDivisible = render('{{ 3 is not divisibleby(2) }}');
    assert.equal(divisible, 'true');
    assert.equal(notDivisible, 'true');
  });

  it('escaped should test whether or not something is escaped', () => {
    const escaped = render('{{ (foo | safe) is escaped }}', {
      foo: 'foobarbaz'
    });
    const notEscaped = render('{{ foo is escaped }}', {
      foo: 'foobarbaz'
    });
    assert.equal(escaped, 'true');
    assert.equal(notEscaped, 'false');
  });

  it('even should detect whether or not a number is even', () => {
    const fiveEven = render('{{ "5" is even }}');
    const fourNotEven = render('{{ 4 is not even }}');
    assert.equal(fiveEven, 'false');
    assert.equal(fourNotEven, 'false');
  });

  it('odd should detect whether or not a number is odd', () => {
    const fiveOdd = render('{{ "5" is odd }}');
    const fourNotOdd = render('{{ 4 is not odd }}');
    assert.equal(fiveOdd, 'true');
    assert.equal(fourNotOdd, 'true');
  });

  it('mapping should detect Maps or hashes', () => {
    /* global Map */
    let map1, map2, mapOneIsMapping, mapTwoIsMapping;
    if (typeof Map === 'undefined') {
      this.skip();
    } else {
      map1 = new Map();
      map2 = {};
      mapOneIsMapping = render('{{ map is mapping }}', {
        map: map1
      });
      mapTwoIsMapping = render('{{ map is mapping }}', {
        map: map2
      });
      assert.equal(mapOneIsMapping, 'true');
      assert.equal(mapTwoIsMapping, 'true');
    }
  });

  it('falsy should detect whether or not a value is falsy', () => {
    const zero = render('{{ 0 is falsy }}');
    const pancakes = render('{{ "pancakes" is not falsy }}');
    assert.equal(zero, 'true');
    assert.equal(pancakes, 'true');
  });

  it('truthy should detect whether or not a value is truthy', () => {
    const nullTruthy = render('{{ null is truthy }}');
    const pancakesNotTruthy = render('{{ "pancakes" is not truthy }}');
    assert.equal(nullTruthy, 'false');
    assert.equal(pancakesNotTruthy, 'false');
  });

  it('greaterthan than should detect whether or not a value is less than another', () => {
    const fiveGreaterThanFour = render('{{ "5" is greaterthan(4) }}');
    const fourNotGreaterThanTwo = render('{{ 4 is not greaterthan(2) }}');
    assert.equal(fiveGreaterThanFour, 'true');
    assert.equal(fourNotGreaterThanTwo, 'false');
  });

  it('ge should detect whether or not a value is greater than or equal to another', () => {
    const fiveGreaterThanEqualToFive = render('{{ "5" is ge(5) }}');
    const fourNotGreaterThanEqualToTwo = render('{{ 4 is not ge(2) }}');
    assert.equal(fiveGreaterThanEqualToFive, 'true');
    assert.equal(fourNotGreaterThanEqualToTwo, 'false');
  });

  it('lessthan than should detect whether or not a value is less than another', () => {
    const fiveLessThanFour = render('{{ "5" is lessthan(4) }}');
    const fourNotLessThanTwo = render('{{ 4 is not lessthan(2) }}');
    assert.equal(fiveLessThanFour, 'false');
    assert.equal(fourNotLessThanTwo, 'true');
  });

  it('le should detect whether or not a value is less than or equal to another', () => {
    const fiveLessThanEqualToFive = render('{{ "5" is le(5) }}');
    const fourNotLessThanEqualToTwo = render('{{ 4 is not le(2) }}');
    assert.equal(fiveLessThanEqualToFive, 'true');
    assert.equal(fourNotLessThanEqualToTwo, 'true');
  });

  it('ne should detect whether or not a value is not equal to another', () => {
    const five = render('{{ 5 is ne(5) }}');
    const four = render('{{ 4 is not ne(2) }}');
    assert.equal(five, 'false');
    assert.equal(four, 'false');
  });

  it('iterable should detect that a generator is iterable', (t, done) => {
    let iterable;
    try {
      /* eslint-disable-next-line no-eval */
      iterable = eval('(function* iterable() { yield true; })()');
    } catch (e) {
      return this.skip(); // Browser does not support generators
    }
    equal('{{ fn is iterable }}', { fn: iterable }, 'true');
    return done();
  });

  it('iterable should detect that an Array is not non-iterable', () => {
    equal('{{ arr is not iterable }}', { arr: [] }, 'false');
  });

  it('iterable should detect that a Map is iterable', () => {
    if (typeof Map === 'undefined') {
      this.skip();
    } else {
      equal('{{ map is iterable }}', { map: new Map() }, 'true');
    }
  });

  it('iterable should detect that a Set is not non-iterable', () => {
    /* global Set */
    if (typeof Set === 'undefined') {
      this.skip();
    } else {
      equal('{{ set is not iterable }}', { set: new Set() }, 'false');
    }
  });

  it('number should detect whether a value is numeric', () => {
    const num = render('{{ 5 is number }}');
    const str = render('{{ "42" is number }}');
    assert.equal(num, 'true');
    assert.equal(str, 'false');
  });

  it('string should detect whether a value is a string', () => {
    const num = render('{{ 5 is string }}');
    const str = render('{{ "42" is string }}');
    assert.equal(num, 'false');
    assert.equal(str, 'true');
  });

  it('equalto should detect value equality', () => {
    const same = render('{{ 1 is equalto(2) }}');
    const notSame = render('{{ 2 is not equalto(2) }}');
    assert.equal(same, 'false');
    assert.equal(notSame, 'false');
  });

  it('sameas should alias to equalto', () => {
    const obj = {};
    const same = render('{{ obj1 is sameas(obj2) }}', {
      obj1: obj,
      obj2: obj
    });
    assert.equal(same, 'true');
  });

  it('lower should detect whether or not a string is lowercased', () => {
    assert.equal(render('{{ "foobar" is lower }}'), 'true');
    assert.equal(render('{{ "Foobar" is lower }}'), 'false');
  });

  it('upper should detect whether or not a string is uppercased', () => {
    assert.equal(render('{{ "FOOBAR" is upper }}'), 'true');
    assert.equal(render('{{ "Foobar" is upper }}'), 'false');
  });
});
