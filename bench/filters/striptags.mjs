import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gStriptags = gFilters.striptags;
const nStriptags = nFilters.striptags;

const html = `
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
`;

summary(() => {
  group('striptags', () => {
    bench('govjucks', () => {
      gStriptags(html);
    });

    bench('nunjucks', () => {
      nStriptags(html);
    });
  });

  group('striptags - preserve line breaks', () => {
    bench('govjucks', () => {
      gStriptags(html, true);
    });

    bench('nunjucks', () => {
      nStriptags(html, true);
    });
  });
});

run();
