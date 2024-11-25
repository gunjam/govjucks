import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gBatch = gFilters.batch;
const nBatch = nFilters.batch;

summary(() => {
  group('batch', () => {
    bench('govjucks', () => {
      gBatch(['1', '2', '3', '4', '5', '6'], '2');
    });

    bench('nunjucks', () => {
      nBatch(['1', '2', '3', '4', '5', '6'], '2');
    });
  });

  group('batch - remainder', () => {
    bench('govjucks', () => {
      gBatch(['1', '2', '3', '4', '5', '6'], '4');
    });

    bench('nunjucks', () => {
      nBatch(['1', '2', '3', '4', '5', '6'], '4');
    });
  });

  group('batch - fillWith', () => {
    bench('govjucks', () => {
      gBatch(['1', '2', '3', '4', '5', '6'], '4', '0');
    });

    bench('nunjucks', () => {
      nBatch(['1', '2', '3', '4', '5', '6'], '4', '0');
    });
  });
});

run();
