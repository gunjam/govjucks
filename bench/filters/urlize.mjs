import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gUrlize = gFilters.urlize;
const nUrlize = nFilters.urlize;

summary(() => {
  group('urlize', () => {
    bench('govjucks', () => {
      gUrlize('foo https://www.example.com/ bar');
    });

    bench('nunjucks', () => {
      nUrlize('foo https://www.example.com/ bar');
    });
  });

  group('urlize - truncated', () => {
    bench('govjucks', () => {
      gUrlize('https://mozilla.github.io/', 10, true);
    });

    bench('nunjucks', () => {
      nUrlize('https://mozilla.github.io/', 10, true);
    });
  });

  group('urlize - lots of links', () => {
    bench('govjucks', () => {
      gUrlize('https://gov.uk/ https://gov.uk/ https://gov.uk/ https://gov.uk/ https://gov.uk/ https://gov.uk/');
    });

    bench('nunjucks ', () => {
      nUrlize('https://gov.uk/ https://gov.uk/ https://gov.uk/ https://gov.uk/ https://gov.uk/ https://gov.uk/');
    });
  });
});

run();
