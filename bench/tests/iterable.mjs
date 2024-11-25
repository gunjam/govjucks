import { summary, bench, run } from 'mitata';
import gTests from '../../src/tests.js';
import nTests from 'nunjucks/src/tests.js';

const gIterable = gTests.iterable;
const nIterable = nTests.iterable;

const int = 0;
const str = '';
const obj = {};
const arr = [];
const map = new Map();
const set = new Set();

summary(() => {
  bench('govjucks', () => {
    gIterable(int);
    gIterable(str);
    gIterable(obj);
    gIterable(arr);
    gIterable(map);
    gIterable(set);
  });

  bench('nunjucks', () => {
    nIterable(int);
    nIterable(str);
    nIterable(obj);
    nIterable(arr);
    nIterable(map);
    nIterable(set);
  });
});

run();
