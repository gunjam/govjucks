'use strict';

const path = require('node:path');
const govjucks = require('../..');
const express = require('express');

const app = express();
govjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app,
  watch: true
});

// app
app.use(express.static(__dirname));

app.use((req, res, next) => {
  res.locals.user = 'hello';
  next();
});

app.get('/', (req, res) => {
  res.render('index.html', {
    username: 'James Long <strong>copyright</strong>'
  });
});

app.get('/about', (req, res) => {
  res.render('about.html');
});

app.listen(4_000, () => {
  console.log('Express server running on http://localhost:4000');
});
