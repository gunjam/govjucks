import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';
import rFilters from 'govjucks/src/filters.js';

const gStriptags = gFilters.striptags;
const nStriptags = nFilters.striptags;
const rStriptags = rFilters.striptags;

const html = `
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
`;

const htmlLong = `
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
`.repeat(10);

summary(() => {
  group('striptags', () => {
    bench('govjucks - current', () => {
      gStriptags(html, false);
    });

    bench('govjucks - release', () => {
      rStriptags(html, false);
    });

    bench('nunjucks', () => {
      nStriptags(html, false);
    });
  });

  group('striptags - long', () => {
    bench('govjucks - current', () => {
      gStriptags(htmlLong, false);
    });

    bench('govjucks - release', () => {
      rStriptags(htmlLong, false);
    });

    bench('nunjucks', () => {
      nStriptags(htmlLong, false);
    });
  });

  group('striptags - preserve line breaks', () => {
    bench('govjucks - current', () => {
      gStriptags(html, true);
    });

    bench('govjucks - release', () => {
      rStriptags(html, true);
    });

    bench('nunjucks', () => {
      nStriptags(html, true);
    });
  });

  group('striptags - preserve line breaks long', () => {
    bench('govjucks - current', () => {
      gStriptags(htmlLong, true);
    });

    bench('govjucks - release', () => {
      rStriptags(htmlLong, true);
    });

    bench('nunjucks', () => {
      nStriptags(htmlLong, true);
    });
  });
});

run();
