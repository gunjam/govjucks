import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gTitle = gFilters.title;
const nTitle = nFilters.title;

summary(() => {
  group('title', () => {
    bench('govjucks', () => {
      gTitle('foo baz bar');
    });

    bench('nunjucks', () => {
      nTitle('foo baz bar');
    });
  });
});

run();
