'use strict';

const path = require('path');
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

app.use(function (req, res, next) {
  res.locals.user = 'hello';
  next();
});

app.get('/', function (req, res) {
  res.render('index.html', {
    username: 'James Long <strong>copyright</strong>'
  });
});

app.get('/about', function (req, res) {
  res.render('about.html');
});

app.listen(4000, function () {
  console.log('Express server running on http://localhost:4000');
});
