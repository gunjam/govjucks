import { summary, bench, run, group } from 'mitata';
import { Environment } from '../../src/environment.js';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const env = new Environment();

const gSelect = gFilters.select.bind({ env });
const nSelect = nFilters.select.bind({ env });

summary(() => {
  group('select', () => {
    bench('govjucks', () => {
      gSelect([0, 1, 2, 3, 4, 5]);
    });

    bench('nunjucks', () => {
      nSelect([0, 1, 2, 3, 4, 5]);
    });
  });

  group('select - odd', () => {
    bench('govjucks', () => {
      gSelect([0, 1, 2, 3, 4, 5], 'odd');
    });

    bench('nunjucks', () => {
      nSelect([0, 1, 2, 3, 4, 5], 'odd');
    });
  });

  group('select - divisibleby', () => {
    bench('govjucks', () => {
      gSelect([0, 1, 2, 3, 4, 5], 'divisibleby', 3);
    });

    bench('nunjucks', () => {
      nSelect([0, 1, 2, 3, 4, 5], 'divisibleby', 3);
    });
  });

  group('select - odd string', () => {
    bench('govjucks', () => {
      gSelect('12345', 'odd');
    });

    bench('nunjucks', () => {
      nSelect('12345', 'odd');
    });
  });

  group('select - number (returns empty array)', () => {
    bench('govjucks', () => {
      gSelect(0);
    });

    bench('nunjucks', () => {
      nSelect(0);
    });
  });
});

run();
