import { summary, bench, run, group } from 'mitata';
import { Environment as GEnvironment } from '../../src/environment.js';
import { Environment as NEnvironment } from 'nunjucks';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';

const gEnv = new GEnvironment();
const nEnv = new NEnvironment();

const gSelectAttr = gFilters.selectattr.bind({ env: gEnv });
const nSelectAttr = nFilters.selectattr.bind({ env: nEnv });

summary(() => {
  group('selectattr', () => {
    bench('govjucks', () => {
      gSelectAttr([{ a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }], 'b');
    });

    bench('nunjucks', () => {
      nSelectAttr([{ a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }, { a: 1 }, { b: 1 }], 'b');
    });
  });

  // Not supported in nunjucks
  group('selectattr - with test', () => {
    bench('govjucks', () => {
      gSelectAttr([{ a: 1 }, { b: 1 }, { b: 2 }, { b: 1 }, { a: 1 }, { b: 1 }], 'b', 'odd');
    });
  });
});

run();
