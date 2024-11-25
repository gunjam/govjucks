import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gReplace = gFilters.replace;
const nReplace = nFilters.replace;

summary(() => {
  group('replace', () => {
    bench('govjucks', () => {
      gReplace('123456123456123456', '4', '.');
    });

    bench('nunjucks', () => {
      nReplace('123456123456123456', '4', '.');
    });
  });

  group('replace - count', () => {
    bench('govjucks', () => {
      gReplace('aaaaaabbbbbbcccccc', 'a', 'x', 3);
    });

    bench('nunjucks', () => {
      nReplace('aaaaaabbbbbbcccccc', 'a', 'x', 3);
    });
  });

  group('replace - pattern', () => {
    bench('govjucks', () => {
      gReplace('aaabbbccc', 'ab', 'x', 2);
    });

    bench('nunjucks', () => {
      nReplace('aaabbbccc', 'ab', 'x', 2);
    });
  });

  group('replace - regex', () => {
    bench('govjucks', () => {
      gReplace('abbcabbcabbc', /ab/g, 'x', 3);
    });

    bench('nunjucks', () => {
      nReplace('abbcabbcabbc', /ab/g, 'x', 3);
    });
  });

  group('replace - no old', () => {
    bench('govjucks', () => {
      gReplace('aaabbbccc', '', '.');
    });

    bench('nunjucks', () => {
      nReplace('aaabbbccc', '', '.');
    });
  });
});

run();
