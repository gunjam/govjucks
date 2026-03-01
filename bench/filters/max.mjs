import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';

const gMax = gFilters.max;

summary(() => {
  group('max - numbers', () => {
    bench('govjucks', () => {
      gMax([5, 4, 1, 3, 8, 2]);
    });
  });

  group('max - strings', () => {
    bench('govjucks', () => {
      gMax(['AC', 'aa', 'BB', 'ba', 'AB']);
    });
  });

  group('max - strings case sensitive', () => {
    bench('govjucks', () => {
      gMax(['AC', 'aa', 'BB', 'ba', 'AB'], true);
    });
  });

  group('max - attribute', () => {
    bench('govjucks', () => {
      gMax([{ prop: 5 }, { prop: 4 }, { prop: 1 }, { prop: 3 }, { prop: 8 }, { prop: 2 }], false, 'prop');
    });
  });

  group('max - strings attribute case sensitive', () => {
    bench('govjucks', () => {
      gMax([{ prop: 'AC' }, { prop: 'aa' }, { prop: 'BB' }, { prop: 'ba' }, { prop: 'AB' }], false, 'prop');
    });
  });
});

run();
