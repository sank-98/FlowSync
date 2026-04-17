const express = require('express');

function createEventsRouter(pubSubService) {
  const router = express.Router();

  router.post('/publish', async (req, res, next) => {
    try {
      const { topic, payload, attributes } = req.body;
      if (!topic || !payload) {
        return res.status(400).json({ error: 'topic and payload are required' });
      }

      const messageId = await pubSubService.publishMessage(topic, payload, attributes || {});
      return res.json({ messageId, topic });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/subscribe/:topic', async (req, res, next) => {
    try {
      const { topic } = req.params;
      const subscription = await pubSubService.subscribeToTopic(topic, async () => null);
      return res.json({ subscription });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/topics', async (_req, res, next) => {
    try {
      const topics = await pubSubService.listTopics();
      return res.json({ topics });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/topics/:topic/publish', async (req, res, next) => {
    try {
      const { topic } = req.params;
      const messageId = await pubSubService.publishMessage(topic, req.body.payload || req.body, req.body.attributes || {});
      return res.json({ messageId, topic });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createEventsRouter };
