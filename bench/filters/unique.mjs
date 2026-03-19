import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';

const gUnique = gFilters.unique;

summary(() => {
  group('unique strings - case sensitive', () => {
    bench('govjucks 1', () => {
      gUnique(['b', 'A', 'a', 'b'], true);
    });
  });

  group('unique strings - attribute case sensitive', () => {
    bench('govjucks 1', () => {
      gUnique([
        { value: 'c' },
        { value: 'B' },
        { value: 'd' },
        { value: 'a' },
        { value: 'b' }
      ], true, 'value');
    });
  });

  group('unique strings', () => {
    bench('govjucks 1', () => {
      gUnique(['b', 'A', 'a', 'b']);
    });
  });

  group('unique - attribute', () => {
    bench('govjucks 1', () => {
      gUnique([
        { value: 'c' },
        { value: 'B' },
        { value: 'd' },
        { value: 'a' },
        { value: 'b' }
      ], false, 'value');
    });
  });
});

run();
