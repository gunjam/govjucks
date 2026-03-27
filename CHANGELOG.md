# Changelog

## Unreleased

### New features

* Consistently support dot paths in attribute arguments for all filters. [#26](https://github.com/gunjam/govjucks/pull/26) @gunjam
* Add support for trailing commas in array and object literals. [#25](https://github.com/gunjam/govjucks/pull/25) @gunjam
* Add support for Map and Set to `in` operator. [#22](https://github.com/gunjam/govjucks/pull/22) @gunjam

### Fixes
* `in` operator should return `false` rather than throw on `undefined` values, consistent with Jinja. [#22](https://github.com/gunjam/govjucks/pull/22) @gunjam

## v0.2.0

This release adds new filters and tests to close the feature parity gap between govjucks and Jina.

9 new filters:

* [`map`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#map)
* [`filesizeformat`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#filesizeformat)
* [`format`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#format)
* [`xmlattr`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#xmlattr)
* [`min`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#min)
* [`max`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#max)
* [`tojson`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#tojson)
* [`unique`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#unique)

8 new tests and new [test documentation](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#builtin-tests).

* [`boolean`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#boolean)
* [`false`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#false) 
* [`filter`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#filter-1) 
* [`float`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#float-1) 
* [`in`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#in)  
* [`integer`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#integer) 
* [`test`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#test) 
* [`true`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#true)  

New lorem ipsum text generating global function [`lipsum`](https://github.com/gunjam/govjucks/blob/master/docs/templating.md#lipsumn5-htmltrue-min20-max100).

### New features

* Adding map filter based on the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.map). [#8](https://github.com/gunjam/govjucks/pull/8) @gunjam
* Added support for passing tests into the selectattr and rejectattr filters. This brings it inline with the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.selectattr). [#9](https://github.com/gunjam/govjucks/pull/9) @gunjam
* Adding a file size format filter which matches the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.filesizeformat). [#10](https://github.com/gunjam/govjucks/pull/10) @gunjam
* Adding a printf style format filter, like [Jinja](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.format).
  Maps directly to the [Node.js format util](https://nodejs.org/docs/latest-v24.x/api/util.html#utilformatformat-args),
  so may not behave exactly like the python equivalent. [#11](https://github.com/gunjam/govjucks/pull/11) @gunjam
* Adding xmlattr filter that matches the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.xmlattr). [#12](https://github.com/gunjam/govjucks/pull/12) @gunjam
* Adding min & max filters which match the [Jinja min](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.min)
  and [Jinja max](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.max) versions. [#14](https://github.com/gunjam/govjucks/pull/14) @gunjam
* Adding tojson filter based on the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.tojson). [#15](https://github.com/gunjam/govjucks/pull/15) @gunjam
* Added unique filter based on the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.tojson). [#16](https://github.com/gunjam/govjucks/pull/16) @gunjam
* Added lipsum global function based on the [Jinja implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-globals.lipsum). [#18](https://github.com/gunjam/govjucks/pull/18) @gunjam
* Add alias of `count` to `length` filter. [#21](https://github.com/gunjam/govjucks/pull/21) @gunjam
* Added tests that are in Jinja but missing from nunjucks. Add missing test documentation. [#17](https://github.com/gunjam/govjucks/pull/17) @gunjam

## v0.1.0 (First release)

This is the first release since forking nunjucks, a lot of work has been done
all over the codebase, so some things may be broken! (All tests pass!)

The primary focus of the initial refactoring was performance, and govjucks
should be around 5x faster than nunjucks (benchmarking based on rendering the
["start-page"](https://github.com/alphagov/govuk-frontend/blob/main/packages/govuk-frontend-review/src/views/full-page-examples/start-page/index.njk) example from GOV.UK's
[govuk-frontend](https://github.com/alphagov/govuk-frontend) repo):

```rust
clk: ~3.13 GHz
cpu: Apple M1 Pro
runtime: node 24.13.0 (arm64-darwin)

benchmark                   avg (min … max) p75 / p99    (min … top 1%)
------------------------------------------- -------------------------------
nunjucks                     220.45 µs/iter 211.25 µs █▃
                      (167.71 µs … 3.83 ms) 866.08 µs ██
                    ( 34.73 kb …   9.08 mb) 274.56 kb ██▆▃▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁

govjucks                      42.31 µs/iter  38.75 µs  █
                       (33.67 µs … 4.12 ms)  86.29 µs ▇█
                    (160.00  b …   6.46 mb) 117.78 kb ███▄▃▂▁▁▁▁▁▁▁▂▂▁▁▁▁▁▁

summary
  govjucks
   5.21x faster than nunjucks
```

### Breaking changes (vs nunjucks)

* Dropped support for all node version < 20.19.0
* Currently not supporting browsers, this support may return
