import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gEscape = gFilters.escape;
const nEscape = nFilters.escape;

const html = `
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
`;

summary(() => {
  group('escape', () => {
    bench('govjucks', () => {
      gEscape(html);
    });

    bench('nunjucks', () => {
      nEscape(html);
    });
  });

  group('escape - undefined', () => {
    bench('govjucks', () => {
      gEscape(undefined);
    });

    bench('nunjucks', () => {
      nEscape(undefined);
    });
  });
});

run();
