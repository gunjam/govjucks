import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gTrim = gFilters.trim;
const nTrim = nFilters.trim;

const noSpaces = 'TestTestTest';
const noSpacesLong = 'TestTestTest'.repeat(1_000);

const spaces = '          TestTestTest          ';
const spaces250 = 'TestTestTest'.padStart(262, ' ').padEnd(512, ' ');
const spaces500 = 'TestTestTest'.padStart(512, ' ').padEnd(1_012, ' ');

summary(() => {
  group('trim - no spaces to trim', () => {
    bench('govjucks', () => {
      gTrim(noSpaces);
    });

    bench('nunjucks', () => {
      nTrim(noSpaces);
    });
  });

  group('trim - long string with no spaces', () => {
    bench('govjucks', () => {
      gTrim(noSpacesLong);
    });

    bench('nunjucks', () => {
      nTrim(noSpacesLong);
    });
  });

  group('trim - 10 spaces either side', () => {
    bench('govjucks', () => {
      gTrim(spaces);
    });

    bench('nunjucks', () => {
      nTrim(spaces);
    });
  });

  group('trim - 250 spaces either side', () => {
    bench('govjucks', () => {
      gTrim(spaces250);
    });

    bench('nunjucks', () => {
      nTrim(spaces250);
    });
  });

  group('trim - 500 spaces either side', () => {
    bench('govjucks', () => {
      gTrim(spaces500);
    });

    bench('nunjucks', () => {
      nTrim(spaces500);
    });
  });
});

run();
