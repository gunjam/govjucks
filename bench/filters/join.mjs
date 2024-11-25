import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gJoin = gFilters.join;
const nJoin = nFilters.join;

summary(() => {
  group('join', () => {
    bench('govjucks', () => {
      gJoin(['1', '2', '3']);
      gJoin(['1', '2', '3'], ',');
    });

    bench('nunjucks', () => {
      nJoin(['1', '2', '3']);
      nJoin(['1', '2', '3'], ',');
    });
  });

  group('join - join attr', () => {
    bench('govjucks', () => {
      gJoin([
        { name: 'foo' },
        { name: 'bar' },
        { name: 'bear' }
      ], ',', 'name');
    });

    bench('nunjucks', () => {
      nJoin([
        { name: 'foo' },
        { name: 'bar' },
        { name: 'bear' }
      ], ',', 'name');
    });
  });
});

run();
