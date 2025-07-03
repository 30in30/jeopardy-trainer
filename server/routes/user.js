const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to validate JWT
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `${process.env.AUTH0_DOMAIN}.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: process.env.AUTH0_DOMAIN,
  algorithms: ['RS256']
});

// Example: GET /api/user/me
router.get('/user/me', checkJwt, async (req, res) => {
  const sub = req.auth?.sub;
  if (!sub) return res.status(401).json({ message: 'Invalid token' });

  const [provider, oauthId] = sub.split('|');

  // Check for existing user
  let user = await prisma.user.findFirst({
    where: {
      oauthProvider: provider,
      oauthId,
    },
  });

  // Create if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: req.auth.email,
        name: req.auth.name,
        oauthProvider: provider,
        oauthId,
      },
    });
  }

  return res.json(user);
});

module.exports = router;
