import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gList = gFilters.list;
const nList = nFilters.list;

summary(() => {
  group('list - string', () => {
    bench('govjucks', () => {
      gList('testtesttest');
    });

    bench('nunjucks', () => {
      nList('testtesttest');
    });
  });

  group('list - object', () => {
    bench('govjucks', () => {
      gList({ a: 'test', b: 'test', c: 'test' });
    });

    bench('nunjucks', () => {
      nList({ a: 'test', b: 'test', c: 'test' });
    });
  });

  group('list - array', () => {
    bench('govjucks', () => {
      gList(['test', 'test', 'test']);
    });

    bench('nunjucks', () => {
      nList(['test', 'test', 'test']);
    });
  });
});

run();
