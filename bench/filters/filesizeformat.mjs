import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';

const filesizeformat = gFilters.filesizeformat;

summary(() => {
  group('govjucks', () => {
    bench('filesizeformat - under 1 kB', () => {
      filesizeformat(900);
    });

    bench('filesizeformat - under 1 KiB', () => {
      filesizeformat(1_020, true);
    });

    bench('filesizeformat - 1.5 MB', () => {
      filesizeformat(1_500_000);
    });

    bench('filesizeformat - 1.5 MiB', () => {
      filesizeformat(1_572_864, true);
    });

    bench('filesizeformat - 1.5 MB string', () => {
      filesizeformat('1500000');
    });
  });
});

run();
