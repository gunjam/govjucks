import { summary, bench, run } from 'mitata';
import gTests from '../../src/tests.js';
import nTests from 'nunjucks/src/tests.js';

const gMapping = gTests.mapping;
const nMapping = nTests.mapping;

const obj = {};
const arr = [];
const map = new Map();
const set = new Set();

summary(() => {
  bench('govjucks', () => {
    gMapping(obj);
    gMapping(arr);
    gMapping(map);
    gMapping(set);
  });

  bench('nunjucks', () => {
    nMapping(obj);
    nMapping(arr);
    nMapping(map);
    nMapping(set);
  });
});

run();
