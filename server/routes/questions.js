const { PrismaClient } = require('@prisma/client');
const express = require('express');
const router = express.Router();

const prisma = new PrismaClient();

// GET /api?categories=History,Science&showSeen=false
router.get('/', async (req, res) => {
  try {
    console.log('🔍 /api called with query:', req.query);

    const { categories, showSeen, afterDate, beforeDate } = req.query;

    if (!categories) {
      console.log('No categories provided');
      return res.status(400).json({ message: 'No category selected' });
    }

    const categoryList = String(categories)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const where = {
      categoryTitle: { in: categoryList },
    };

    // Check if user is signed in
    const sub = req.auth?.sub;
    console.log('User sub:', sub);

    if (!showSeen && sub) {
      const [provider, oauthId] = sub.split('|');
      const user = await prisma.user.findFirst({
        where: { oauthProvider: provider, oauthId },
      });

      if (user) {
        console.log('Found user:', user.id);
        where.responses = {
          none: { userId: user.id },
        };
      } else {
        console.log('User not found in DB, skipping response filter');
      }
    }

    if (afterDate || beforeDate) {
      where.airDate = {};
      if (afterDate) where.airDate.gte = new Date(afterDate);
      if (beforeDate) where.airDate.lte = new Date(beforeDate);
    }

    console.log('Prisma filter:', JSON.stringify(where));

    const totalCount = await prisma.question.count({ where });
    console.log('Matching question count:', totalCount);

    if (totalCount === 0) {
      return res.status(404).json({ message: 'No matching questions' });
    }

    const offset = Math.floor(Math.random() * totalCount);
    const [randomQuestion] = await prisma.question.findMany({
      where,
      skip: offset,
      take: 1,
    });

    return res.json(randomQuestion);
  } catch (err) {
    console.error('Route error:', err.stack || err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


// POST /api to mark a question as seen (only if signed in)
router.post('/', async (req, res) => {
  try {
    const sub = req.auth?.sub;
    const { questionId } = req.body;

    if (!sub) {
      return res.status(401).json({ message: 'Must be signed in to save progress' });
    }

    if (!questionId) {
      return res.status(400).json({ message: 'Missing questionId' });
    }

    const [provider, oauthId] = sub.split('|');

    let user = await prisma.user.findFirst({
      where: {
        oauthProvider: provider,
        oauthId,
      },
    });

    // Create the user if they don't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          oauthProvider: provider,
          oauthId,
          email: req.auth?.email ?? null,
          name: req.auth?.name ?? null,
        },
      });
    }

    const existing = await prisma.userQuestionResponse.findFirst({
      where: { userId: user.id, questionId },
    });

    if (existing) {
      return res.status(409).json({ message: 'Already marked as seen' });
    }

    const newResponse = await prisma.userQuestionResponse.create({
      data: {
        userId: user.id,
        questionId,
        wasCorrect: false, // default for now — can modify later
      },
    });

    return res.status(201).json(newResponse);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
