import { summary, bench, run, group } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gNl2br = gFilters.nl2br;
const nNl2br = nFilters.nl2br;

summary(() => {
  group('nl2br', () => {
    bench('govjucks', () => {
      gNl2br('Test\nTest\nTest\nTest\nTest');
    });

    bench('nunjucks', () => {
      nNl2br('Test\nTest\nTest\nTest\nTest');
    });
  });
});

run();
