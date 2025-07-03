const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { auth } = require('express-openid-connect');
const questionRoutes = require('./routes/questions');
const userRoutes = require('./routes/user');
const cors = require('cors')

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL || `http://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
};

app.use(auth(config));
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

app.use('/api', questionRoutes);
app.use('/api', userRoutes);

app.use((req, res, next) => {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack || err);
  res.status(err.status || 500).json({
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
});

http.createServer(app).listen(port, () => {
  console.log(`Server listening on ${config.baseURL}`);
});
