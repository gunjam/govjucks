import { group, summary, bench, run } from 'mitata';
import { Environment } from '../../src/environment.js';
import { Environment as OldEnvironment } from 'nunjucks';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gEnv = new Environment();
const nEnv = new OldEnvironment();

const gSort = gFilters.sort.bind({ env: gEnv });
const nSort = nFilters.sort.bind({ env: nEnv });

summary(() => {
  group('sort - ints', () => {
    bench('govjucks', () => {
      gSort([
        9,
        3,
        4,
        2,
        5,
        1,
        6,
        0,
        8,
        7
      ]);
    });

    bench('nunjucks', () => {
      nSort([
        9,
        3,
        4,
        2,
        5,
        1,
        6,
        0,
        8,
        7
      ]);
    });
  });

  group('sort - strings', () => {
    bench('govjucks', () => {
      gSort([
        'IiIiIiIiIiIi',
        'CcCcCcCcCcCc',
        'DdDdDdDdDdDd',
        'BbBbBbBbBbBb',
        'EeEeEeEeEeEe',
        'AaAaAaAaAaAa',
        'FfFfFfFfFfFf',
        'JjJjJjJjJjJj',
        'HhHhHhHhHhHh',
        'GgGgGgGgGgGg'
      ]);
    });

    bench('nunjucks', () => {
      nSort([
        'IiIiIiIiIiIi',
        'CcCcCcCcCcCc',
        'DdDdDdDdDdDd',
        'BbBbBbBbBbBb',
        'EeEeEeEeEeEe',
        'AaAaAaAaAaAa',
        'FfFfFfFfFfFf',
        'JjJjJjJjJjJj',
        'HhHhHhHhHhHh',
        'GgGgGgGgGgGg'
      ]);
    });
  });

  group('sort - int reverse', () => {
    bench('govjucks', () => {
      gSort([
        9,
        3,
        4,
        2,
        5,
        1,
        6,
        0,
        8,
        7
      ], true);
    });

    bench('nunjucks', () => {
      nSort([
        9,
        3,
        4,
        2,
        5,
        1,
        6,
        0,
        8,
        7
      ], true);
    });
  });

  group('sort - case sensitive', () => {
    bench('govjucks', () => {
      gSort([
        'IiIiIiIiIiIi',
        'CcCcCcCcCcCc',
        'DdDdDdDdDdDd',
        'BbBbBbBbBbBb',
        'EeEeEeEeEeEe',
        'AaAaAaAaAaAa',
        'FfFfFfFfFfFf',
        'JjJjJjJjJjJj',
        'HhHhHhHhHhHh',
        'GgGgGgGgGgGg'
      ], false, true);
    });

    bench('nunjucks', () => {
      nSort([
        'IiIiIiIiIiIi',
        'CcCcCcCcCcCc',
        'DdDdDdDdDdDd',
        'BbBbBbBbBbBb',
        'EeEeEeEeEeEe',
        'AaAaAaAaAaAa',
        'FfFfFfFfFfFf',
        'JjJjJjJjJjJj',
        'HhHhHhHhHhHh',
        'GgGgGgGgGgGg'
      ], false, true);
    });
  });

  group('sort - attribute', () => {
    bench('govjucks', () => {
      gSort([
        { attr: 9 },
        { attr: 3 },
        { attr: 4 },
        { attr: 2 },
        { attr: 5 },
        { attr: 1 },
        { attr: 6 },
        { attr: 0 },
        { attr: 8 },
        { attr: 7 }
      ], false, false, 'attr');
    });

    bench('nunjucks', () => {
      nSort([
        { attr: 9 },
        { attr: 3 },
        { attr: 4 },
        { attr: 2 },
        { attr: 5 },
        { attr: 1 },
        { attr: 6 },
        { attr: 0 },
        { attr: 8 },
        { attr: 7 }
      ], false, false, 'attr');
    });
  });
});

run();
