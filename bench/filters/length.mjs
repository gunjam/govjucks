import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';
import { SafeString } from '../../src/runtime.js';

const gLength = gFilters.length;
const nLength = nFilters.length;

const safe = new SafeString('1234567890');
const set = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const str = '1234567890';
const map = new Map([
  ['a', 0],
  ['b', 0],
  ['c', 0],
  ['d', 0],
  ['e', 0],
  ['f', 0],
  ['g', 0],
  ['h', 0],
  ['i', 0],
  ['j', 0]
]);

summary(() => {
  group('length - Set', () => {
    bench('govjucks', () => {
      gLength(set);
    });

    bench('nunjucks', () => {
      nLength(set);
    });
  });

  group('length - Array', () => {
    bench('govjucks', () => {
      gLength(arr);
    });

    bench('nunjucks', () => {
      nLength(arr);
    });
  });

  group('length - Map', () => {
    bench('govjucks', () => {
      gLength(map);
    });

    bench('nunjucks', () => {
      nLength(map);
    });
  });

  group('length - String', () => {
    bench('govjucks', () => {
      gLength(str);
    });

    bench('nunjucks', () => {
      nLength(str);
    });
  });

  group('length - SafeString', () => {
    bench('govjucks', () => {
      gLength(safe);
    });

    bench('nunjucks', () => {
      nLength(safe);
    });
  });

  group('length - undefined', () => {
    bench('govjucks', () => {
      gLength(undefined);
    });

    bench('nunjucks', () => {
      nLength(undefined);
    });
  });
});

run();
