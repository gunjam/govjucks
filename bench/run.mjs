import fs from 'node:fs';
import { join } from 'node:path';
import { summary, bench, run } from 'mitata';
import nunjucks from 'nunjucks';
import govjucks from '../index.js';

const src = fs.readFileSync(join(import.meta.dirname, 'case.html'), 'utf-8');

const oldEnv = new nunjucks.Environment(null);
const oldTmpl = new nunjucks.Template(src, oldEnv, null, null, true);

const env = new govjucks.Environment(null);
const tmpl = new govjucks.Template(src, env, null, null, true);

const ctx = {
  items: [
    {
      current: true,
      name: 'James'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    },
    {
      name: 'Foo',
      url: 'http://example.com'
    }
  ]
};

summary(() => {
  bench('nunjucks', () => {
    oldTmpl.render(ctx);
  });

  bench('govjucks', () => {
    tmpl.render(ctx);
  });
});

run();
