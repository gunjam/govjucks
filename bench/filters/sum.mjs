import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gSum = gFilters.sum;
const nSum = nFilters.sum;

summary(() => {
  group('sum', () => {
    bench('govjucks', () => {
      gSum([1, 2, 3]);
    });

    bench('nunjucks', () => {
      nSum([1, 2, 3]);
    });
  });

  group('sum - attribute', () => {
    bench('govjucks', () => {
      gSum([
        { val: 1 },
        { val: 2 },
        { val: 3 }
      ], 'val');
    });

    bench('nunjucks', () => {
      nSum([
        { val: 1 },
        { val: 2 },
        { val: 3 }
      ], 'val');
    });
  });
});

run();
