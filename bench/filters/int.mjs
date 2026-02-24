import { group, summary, bench, run } from 'mitata';
import gFilters from '../../src/filters.js';
import nFilters from 'nunjucks/src/filters.js';
import gRuntime from '../../src/runtime.js';
import nRuntime from 'nunjucks/src/runtime.js';

const gInt = gFilters.int;
const nInt = nFilters.int;

const gMakeKeywordArgs = gRuntime.makeKeywordArgs;
const nMakeKeywordArgs = nRuntime.makeKeywordArgs;

summary(() => {
  group('int', () => {
    bench('govjucks', () => {
      gInt('1');
    });

    bench('nunjucks', () => {
      nInt('1');
    });
  });

  group('int - default', () => {
    bench('govjucks', () => {
      gInt('NaN', 1);
    });

    bench('nunjucks', () => {
      nInt('NaN', 1);
    });
  });

  group('int - base', () => {
    bench('govjucks', () => {
      gInt('1', 1, 5);
    });

    bench('nunjucks', () => {
      nInt('1', 1, 5);
    });
  });

  group('int keyword args', () => {
    bench('govjucks', () => {
      gInt('1', gMakeKeywordArgs({ base: 10 }));
    });

    bench('nunjucks', () => {
      nInt('1', nMakeKeywordArgs({ base: 10 }));
    });
  });
});

run();
