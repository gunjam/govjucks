import { summary, bench, run, group } from 'mitata';
import { Environment } from '../../src/environment.js';
import gFilters from '../../src/filters.js';
import runtime from '../../src/runtime.js';

const env = new Environment();
const gMap = gFilters.map.bind({ env });

const attributeKwargs = runtime.makeKeywordArgs({
  attribute: 'a'
});

const attributeDefaultKwargs = runtime.makeKeywordArgs({
  attribute: 'a',
  default: 'b'
});

// Not available in nunjucks
summary(() => {
  group('map', () => {
    bench('govjucks', () => {
      gMap(['A', 'B', 'C', 'D', 'E'], 'lower');
    });
  });

  group('map - attribute', () => {
    bench('govjucks', () => {
      gMap([{ a: 'A' }, { a: 'B' }, { a: 'C' }, { a: 'D' }, { a: 'E' }], attributeKwargs);
    });
  });

  group('map - attribute default', () => {
    bench('govjucks', () => {
      gMap([{ a: 'A' }, { a: 'B' }, { a: undefined }, { a: 'D' }, { a: undefined }], attributeDefaultKwargs);
    });
  });
});

run();
