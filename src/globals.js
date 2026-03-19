'use strict';

const { LOREM_IPSUM_WORDS } = require('./constants');
const { makeMacro, SafeString } = require('./runtime');

function cycler (items) {
  let index = -1;

  return {
    current: null,
    reset () {
      index = -1;
      this.current = null;
    },

    next () {
      index++;
      if (index >= items.length) {
        index = 0;
      }

      this.current = items[index];
      return this.current;
    },
  };
}

function joiner (sep) {
  sep = sep || ',';
  let first = true;

  return () => {
    const val = first ? '' : sep;
    first = false;
    return val;
  };
}

function randomBetween (min, max) {
  return ~~(Math.random() * (max - min + 1) + min);
}

function randomWord () {
  return LOREM_IPSUM_WORDS[~~(Math.random() * LOREM_IPSUM_WORDS.length)];
}

function lipsum (num = 5, html = true, min = 20, max = 100) {
  const result = [];

  for (let i = 0; i < num; i++) {
    const p = [];
    let nextCapitalised = true;
    let lastComma;
    let lastFullstop = 0;
    let word;
    let last;

    for (let i = 0, m = randomBetween(min, max); i < m; i++) {
      while (true) {
        word = randomWord();
        if (word !== last) {
          last = word;
          break;
        }
      }

      if (nextCapitalised) {
        word = word[0].toUpperCase() + word.slice(1);
        nextCapitalised = false;
      }

      if (i - randomBetween(3, 8) > lastComma) {
        lastComma = i;
        lastFullstop += 2;
        word += ',';
      }

      if (i - randomBetween(10, 20) > lastFullstop) {
        lastComma = lastFullstop = i;
        word += '.';
        nextCapitalised = true;
      }

      p.push(word);
    }

    let pStr = p.join(' ');

    if (pStr.endsWith(',')) {
      pStr = pStr.slice(0, -1) + '.';
    } else if (!pStr.endsWith('.')) {
      pStr += '.';
    }

    result.push(pStr);
  }

  if (!html) {
    return result.join('\n\n');
  }
  return new SafeString(`<p>${result.join('</p>\n<p>')}</p>`);
}

// Making this a function instead so it returns a new object
// each time it's called. That way, if something like an environment
// uses it, they will each have their own copy.
function globals () {
  return {
    range (start, stop, step) {
      if (typeof stop === 'undefined') {
        stop = start;
        start = 0;
        step = 1;
      } else if (!step) {
        step = 1;
      }

      const arr = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) {
          arr.push(i);
        }
      } else {
        for (let i = start; i > stop; i += step) {
          arr.push(i);
        }
      }
      return arr;
    },

    cycler (...args) {
      return cycler(args);
    },

    joiner (sep) {
      return joiner(sep);
    },

    lipsum: makeMacro(
      ['n', 'html', 'min', 'max'],
      lipsum
    ),
  };
}

module.exports = globals;
module.exports.randomBetween = randomBetween;
