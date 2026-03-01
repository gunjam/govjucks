import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';

const gMin = gFilters.min;

summary(() => {
  group('min - numbers', () => {
    bench('govjucks', () => {
      gMin([5, 4, 1, 3, 8, 2]);
    });
  });

  group('min - strings', () => {
    bench('govjucks', () => {
      gMin(['AC', 'aa', 'BB', 'ba', 'AB']);
    });
  });

  group('min - strings case sensitive', () => {
    bench('govjucks', () => {
      gMin(['AC', 'aa', 'BB', 'ba', 'AB'], true);
    });
  });

  group('min - attribute', () => {
    bench('govjucks', () => {
      gMin([{ prop: 5 }, { prop: 4 }, { prop: 1 }, { prop: 3 }, { prop: 8 }, { prop: 2 }], false, 'prop');
    });
  });

  group('min - strings attribute case sensitive', () => {
    bench('govjucks', () => {
      gMin([{ prop: 'AC' }, { prop: 'aa' }, { prop: 'BB' }, { prop: 'ba' }, { prop: 'AB' }], false, 'prop');
    });
  });
});

run();
