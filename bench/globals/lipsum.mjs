import { group, summary, bench, run } from 'mitata';
import globals from '../../src/globals.js';

const lipsum = globals().lipsum;

summary(() => {
  group('lipsum', () => {
    bench('govjucks', () => {
      lipsum();
    });
  });

  group('lipsum - html false', () => {
    bench('govjucks', () => {
      lipsum(5, false);
    });
  });

  group('lipsum - html min 100, max 200', () => {
    bench('govjucks', () => {
      lipsum(5, false, 100, 200);
    });
  });
});

run();
