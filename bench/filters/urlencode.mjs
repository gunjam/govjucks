import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gUrlencode = gFilters.urlencode;
const nUrlencode = nFilters.urlencode;

summary(() => {
  group('urlencode - string', () => {
    bench('govjucks', () => {
      gUrlencode('something to encode');
    });

    bench('nunjucks', () => {
      nUrlencode('something to encode');
    });
  });

  group('urlencode - array', () => {
    bench('govjucks', () => {
      gUrlencode([['search', 'test'], ['page', 1], ['count', 100]]);
    });

    bench('nunjucks', () => {
      nUrlencode([['search', 'test'], ['page', 1], ['count', 100]]);
    });
  });

  group('urlencode - object', () => {
    bench('govjucks', () => {
      gUrlencode({ search: 'test', page: 1, count: 100 });
    });

    bench('nunjucks', () => {
      nUrlencode({ search: 'test', page: 1, count: 100 });
    });
  });
});

run();
