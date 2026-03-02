import { group, summary, bench, run, do_not_optimize } from 'mitata';
import gFilters from '../../src/filters.js';

const gTojson = gFilters.tojson;

summary(() => {
  group('tojson - undefined', () => {
    bench('govjucks', () => {
      do_not_optimize(gTojson(undefined));
    });
  });

  group('tojson - string', () => {
    bench('govjucks', () => {
      gTojson("some kind of test string");
    });
  });

  group('tojson - string needs escaping', () => {
    bench('govjucks', () => {
      gTojson("<script>alert('bad')</script>");
    });
  });

  group('tojson - object', () => {
    bench('govjucks', () => {
      gTojson({
        property: "value",
        nested: { property: "value" }
      });
    });
  });

  group('tojson - object indented', () => {
    bench('govjucks', () => {
      gTojson({
        property: "value",
        nested: { property: "value" }
      }, 2);
    });
  });
});

run();
