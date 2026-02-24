import { summary, bench, run, group } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gReject = gFilters.rejectattr;
const nReject = nFilters.rejectattr;

summary(() => {
  group('reject', () => {
    bench('govjucks', () => {
      gReject([{ a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }], 'b');
    });

    bench('nunjucks', () => {
      nReject([{ a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }], 'b');
    });
  });
});

run();
