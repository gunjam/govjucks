import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gCenter = gFilters.center;
const nCenter = nFilters.center;

summary(() => {
  group('center', () => {
    bench('govjucks', () => {
      gCenter('test test test', 50);
    });

    bench('nunjucks', () => {
      nCenter('test test test', 50);
    });
  });
});

run();
