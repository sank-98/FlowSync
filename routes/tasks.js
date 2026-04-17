const express = require('express');

function createTasksRouter(tasksService) {
  const router = express.Router();

  router.post('/create', async (req, res, next) => {
    try {
      const task = await tasksService.createTask(req.body);
      return res.status(201).json(task);
    } catch (error) {
      return next(error);
    }
  });

  router.post('/schedule', async (req, res, next) => {
    try {
      const task = await tasksService.scheduleTask({
        queueName: req.body.queueName,
        url: req.body.url,
        payload: req.body.payload,
        taskType: req.body.taskType,
        runAt: req.body.runAt,
      });
      return res.status(201).json(task);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/list', async (req, res, next) => {
    try {
      const tasks = await tasksService.listTasks(req.query.queueName);
      return res.json({ tasks, count: tasks.length });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:taskId', async (req, res, next) => {
    try {
      const result = await tasksService.deleteTask(req.params.taskId, req.query.queueName);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/status/:taskId', async (req, res, next) => {
    try {
      const status = await tasksService.getTaskStatus(req.params.taskId);
      return res.json(status);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createTasksRouter };
