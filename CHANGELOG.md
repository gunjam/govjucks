# Changelog

## Unreleased

### New features

* Adding xmlattr filter that matches [the Jinja2 implementation](https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.xmlattr).


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
