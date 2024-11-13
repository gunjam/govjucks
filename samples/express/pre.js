#!/usr/bin/env node

'use strict';

const { precompileString } = require('../..');
const fs = require('node:fs');
const path = require('node:path');

let out = 'window.baseTmpl = ' +
precompileString(
  fs.readFileSync(path.join(__dirname, 'views/base.html'), 'utf-8'), {
    name: 'base.html',
    asFunction: true
  });

out += 'window.aboutTmpl = ' +
precompileString(
  fs.readFileSync(path.join(__dirname, 'views/about.html'), 'utf-8'), {
    name: 'about.html',
    asFunction: true
  });

fs.writeFileSync(path.join(__dirname, 'js/templates.js'), out, 'utf-8');

fs.writeFileSync(path.join(__dirname, 'js/govjucks.js'),
  fs.readFileSync(path.join(__dirname, '../../browser/govjucks.js'), 'utf-8'),
  'utf-8');
