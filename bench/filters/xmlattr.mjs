import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';

const gXmlattr = gFilters.xmlattr;

summary(() => {
  group('xmlattr - string', () => {
    bench('govjucks', () => {
      gXmlattr({ class: 'govuk-input', name: 'applicant-full-name' });
    });
  });

  group('xmlattr - string autospace off', () => {
    bench('govjucks', () => {
      gXmlattr({ class: 'govuk-input', name: 'applicant-full-name' }, false);
    });
  });

  group('xmlattr - undefined, null', () => {
    bench('govjucks', () => {
      gXmlattr({ class: 'govuk-input', name: undefined, value: null });
    });
  });

  group('xmlattr - number', () => {
    bench('govjucks', () => {
      gXmlattr({ class: 'govuk-input', id: 1, value: 5 });
    });
  });

  group('xmlattr - many small', () => {
    bench('govjucks', () => {
      gXmlattr({ a: 'b', c: 'd', e: 'f', g: 'h', i: 'j', k: 'l', m: 'n', o: 'p', q: 'r', s: 't', u: 'v' });
    });
  });

  group('xmlattr - many small autospace off', () => {
    bench('govjucks', () => {
      gXmlattr({ a: 'b', c: 'd', e: 'f', g: 'h', i: 'j', k: 'l', m: 'n', o: 'p', q: 'r', s: 't', u: 'v' }, false);
    });
  });
});

run();
