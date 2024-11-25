import { group, summary, bench, run } from 'mitata';
import gLib from '../../src/lib.js';
import nLib from 'nunjucks/src/lib.js';

const gEscape = gLib.escape;
const nEscape = nLib.escape;

const html = `
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
  <p class="body">A paragraph of text</p>
`;

const lotsOfHtml = html.repeat(1_000);

summary(() => {
  group('escape', () => {
    bench('govjucks', () => {
      gEscape(html);
    });

    bench('nunjucks', () => {
      nEscape(html);
    });
  });

  group('escape - long string', () => {
    bench('govjucks', () => {
      gEscape(lotsOfHtml);
    });

    bench('nunjucks', () => {
      nEscape(lotsOfHtml);
    });
  });
});

run();
