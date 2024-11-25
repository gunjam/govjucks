import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gReverse = gFilters.reverse;
const nReverse = nFilters.reverse;

summary(() => {
  group('reverse - string', () => {
    bench('govjucks', () => {
      gReverse('1234567890');
    });

    bench('nunjucks', () => {
      nReverse('1234567890');
    });
  });

  group('reverse - array', () => {
    bench('govjucks', () => {
      gReverse(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    });

    bench('nunjucks', () => {
      nReverse(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    });
  });
});

run();
