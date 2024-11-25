import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gTruncate = gFilters.truncate;
const nTruncate = nFilters.truncate;

const longString = 'A'.repeat(500);

summary(() => {
  group('truncate', () => {
    bench('govjucks', () => {
      gTruncate('foo bar', 3);
    });

    bench('nunjucks', () => {
      nTruncate('foo bar', 3);
    });
  });

  group('truncate - kill words', () => {
    bench('govjucks', () => {
      gTruncate('foo bar', 5);
    });

    bench('nunjucks', () => {
      nTruncate('foo bar', 5);
    });
  });

  group('truncate - long with custom ellipsis', () => {
    bench('govjucks', () => {
      gTruncate(longString, 64, true, '(...)');
    });

    bench('nunjucks', () => {
      nTruncate(longString, 64, true, '(...)');
    });
  });
});

run();
