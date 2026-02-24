import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gIndent = gFilters.indent;
const nIndent = nFilters.indent;

summary(() => {
  group('indent', () => {
    bench('govjucks', () => {
      gIndent('Test\nTest\nTest\nTest\nTest');
    });

    bench('nunjucks', () => {
      nIndent('Test\nTest\nTest\nTest\nTest');
    });
  });

  group('indent - 8 spaces', () => {
    bench('govjucks', () => {
      gIndent('Test\nTest\nTest\nTest\nTest', 8);
    });

    bench('nunjucks', () => {
      nIndent('Test\nTest\nTest\nTest\nTest', 8);
    });
  });
});

run();
