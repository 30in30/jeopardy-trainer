const userRoutes = require('./routes/user');
const questionRoutes = require('./routes/questions');
const { auth } = require('express-openid-connect');
const express = require('express')
const dotenv = require('dotenv')

dotenv.config();

const app = express();

const config = {
    authRequired: false,
    auth0logout: true
};

const port = process.env.PORT || 3000;
if (!config.baseURL && !process.env.BASE_URL && process.env.PORT && process.env.NODE_ENV !== 'production') {
    config.baseURL = `http://localhost:${port}`;
}

app.use(function (req, res, next) {
    res.locals.user = req.oidc.user;
    next();
});

app.use('/api', questionRoutes);
app.use('/api', userRoutes);

app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

http.createServer(app)
  .listen(port, () => {
    console.log(`Listening on ${config.baseURL}`);
  });
