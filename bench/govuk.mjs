import fs from 'node:fs';
import { join } from 'node:path';
import { summary, bench, run } from 'mitata';
import nunjucks from 'nunjucks';
import govjucks from '../index.js';

const govukPath = join(
  import.meta.dirname,
  '../../govuk-frontend/packages/govuk-frontend/src'
);

const govukReviewPath = join(
  import.meta.dirname,
  '../../govuk-frontend/packages/govuk-frontend-review/src/views'
);

const src = fs.readFileSync(
  join(govukReviewPath, 'full-page-examples', 'start-page', 'index.njk'),
  'utf-8'
);

const templatePaths = [govukPath, govukReviewPath];

const oldEnv = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(templatePaths)
);

const env = new govjucks.Environment(
  new govjucks.FileSystemLoader(templatePaths),
  {}
);

const oldTmpl = nunjucks.compile(src, oldEnv, null, null, true);
const tmpl = govjucks.compile(src, env, null, null, true);

summary(() => {
  bench('nunjucks', () => {
    oldTmpl.render();
  });

  bench('govjucks', () => {
    tmpl.render();
  });
});

run();
