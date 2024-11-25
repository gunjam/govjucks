import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gSlice = gFilters.slice;
const nSlice = nFilters.slice;

summary(() => {
  group('slice', () => {
    bench('govjucks', () => {
      gSlice(['1', '2', '3', '4', '5', '6'], '2');
    });

    bench('nunjucks', () => {
      nSlice(['1', '2', '3', '4', '5', '6'], '2');
    });
  });

  group('slice - remainder', () => {
    bench('govjucks', () => {
      gSlice(['1', '2', '3', '4', '5', '6'], '4');
    });

    bench('nunjucks', () => {
      nSlice(['1', '2', '3', '4', '5', '6'], '4');
    });
  });

  group('slice - fillWith', () => {
    bench('govjucks', () => {
      gSlice(['1', '2', '3', '4', '5', '6'], '4', '0');
    });

    bench('nunjucks', () => {
      nSlice(['1', '2', '3', '4', '5', '6'], '4', '0');
    });
  });
});

run();
