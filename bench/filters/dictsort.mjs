import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gDictsort = gFilters.dictsort;
const nDictsort = nFilters.dictsort;

summary(() => {
  group('dicsort', () => {
    bench('govjucks', () => {
      gDictsort({
        e: 1,
        d: 2,
        c: 3,
        a: 4,
        f: 5,
        b: 6
      });
    });

    bench('nunjucks', () => {
      nDictsort({
        e: 1,
        d: 2,
        c: 3,
        a: 4,
        f: 5,
        b: 6
      });
    });
  });

  group('dictsort - case sensitive', () => {
    bench('govjucks', () => {
      gDictsort({
        e: 1,
        d: 2,
        c: 3,
        a: 4,
        f: 5,
        b: 6
      }, true);
    });

    bench('nunjucks', () => {
      nDictsort({
        e: 1,
        d: 2,
        c: 3,
        a: 4,
        f: 5,
        b: 6
      });
    }, true);
  });

  group('dictsort - by value', () => {
    bench('govjucks', () => {
      gDictsort({
        e: 6,
        d: 3,
        c: 2,
        a: 4,
        f: 1,
        b: 5
      }, false, 'value');
    });

    bench('nunjucks', () => {
      nDictsort({
        e: 6,
        d: 3,
        c: 2,
        a: 4,
        f: 1,
        b: 5
      });
    }, false, 'value');
  });
});

run();
