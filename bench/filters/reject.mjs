import { summary, bench, run, group } from 'mitata';
import { Environment as GEnvironment } from '../../src/environment.js';
import { Environment as NEnvironment } from 'nunjucks/src/environment.js';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gEnv = new GEnvironment();
const nEnv = new NEnvironment();

const gReject = gFilters.reject.bind({ env: gEnv });
const nReject = nFilters.reject.bind({ env: nEnv });

summary(() => {
  group('reject', () => {
    bench('govjucks', () => {
      gReject([0, 1, 2, 3, 4, 5]);
    });

    bench('nunjucks', () => {
      nReject([0, 1, 2, 3, 4, 5]);
    });
  });

  group('reject - odd', () => {
    bench('govjucks', () => {
      gReject([0, 1, 2, 3, 4, 5], 'odd');
    });

    bench('nunjucks', () => {
      nReject([0, 1, 2, 3, 4, 5], 'odd');
    });
  });

  group('reject - divisibleby', () => {
    bench('govjucks', () => {
      gReject([0, 1, 2, 3, 4, 5], 'divisibleby', 3);
    });

    bench('nunjucks', () => {
      nReject([0, 1, 2, 3, 4, 5], 'divisibleby', 3);
    });
  });

  group('reject - odd string', () => {
    bench('govjucks', () => {
      gReject('12345', 'odd');
    });

    bench('nunjucks', () => {
      nReject('12345', 'odd');
    });
  });

  group('reject - number (returns empty array)', () => {
    bench('govjucks', () => {
      gReject(0);
    });

    bench('nunjucks', () => {
      nReject(0);
    });
  });
});

run();
