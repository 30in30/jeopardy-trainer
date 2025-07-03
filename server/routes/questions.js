const { PrismaClient } = require('@prisma/client');
const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    try {
        const { categories, showSeen, afterDate, beforeDate } = req.query;

        if (!categories) {
            return res.status(400).json({ message: 'No category selected'});
        }

        const categoryList = String(categories).split(',').map((c) => c.trim()).filter((c) => c);

        if (categoryList.length === 0) {
            return res.status(400).json({ massage: 'No category selected'});
        }

        const where = {
            category: {
                in: categoryList,
            },
        }

        if (!showSeen) {
            where.responses = {
                none: {
                    userId: userId,
                }
            }
        }

        if (afterDate | beforeDate) {
            where.airDate = {};
            if (afterDate) where.airDate.gte = new Date(afterDate);
            if (beforeDate) where .airDate.lte = new Date(beforeDate)
        }

        const totalCount = await prisma.question.count({ where });

        if (totalCount === 0) {
            return res.status(404).json({ message: 'No matching questions'});
        }

        const offset = Math.floor(Math.random() * totalCount);
        const [randomQuestion] = await prisma.question.finidMany({
            where,
            skip:offset,
            take: 1,
        });

        return res.json(randomQuestion)
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error'});

    }
});

router.post('/', requiresAuth, async (req, res) => {
    try{
        const { userId, questionId } = req.body;

        if( !userId | !questionId) {
            return res.status(400).json({ message: "Missing userId or questionId" });
        }

        const existing = await prisma.userQuestionResponse.findFirst({
            where: { userId, questionId },
        });

        if (existing) {
            return res.status(409).json({ message: "Response already exists" });
        }

        const newResponse = await prisma.userQuestionResponse.create({
            data: {
                userId,
                quesitonId,
            },
        });

        return res.status(201).json(newResponse);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error "});
    }
})