const { CloudTasksClient } = require('@google-cloud/tasks');
const cloudTasksConfig = require('../config/cloud-tasks-config');

class CloudTasksService {
  constructor(options = {}) {
    this.config = {
      ...cloudTasksConfig,
      ...options,
      retryConfig: {
        ...cloudTasksConfig.retryConfig,
        ...(options.retryConfig || {}),
      },
      rateLimits: {
        ...cloudTasksConfig.rateLimits,
        ...(options.rateLimits || {}),
      },
      queueNames: {
        ...cloudTasksConfig.queueNames,
        ...(options.queueNames || {}),
      },
    };
    this.client = this.config.enabled ? new CloudTasksClient() : null;
    this.taskStatus = new Map();
  }

  getQueuePath(queueName = this.config.queueName) {
    const project = this.config.projectId;
    if (!project) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is not configured');
    }

    return this.client.queuePath(project, this.config.location, queueName);
  }

  getTaskName(taskId, queueName = this.config.queueName) {
    return `${this.getQueuePath(queueName)}/tasks/${taskId}`;
  }

  async createTask({ queueName, url, payload = {}, taskType = 'generic', scheduleTime }) {
    if (!url) {
      throw new Error('url is required');
    }

    if (!this.client) {
      const localId = `local-${Date.now()}`;
      this.taskStatus.set(localId, { status: 'queued', taskType, createdAt: new Date().toISOString() });
      return { name: localId, queueName: queueName || this.config.queueName, local: true };
    }

    const parent = this.getQueuePath(queueName || this.config.queueName);
    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ taskType, ...payload })).toString('base64'),
      },
      dispatchDeadline: { seconds: this.config.timeoutSeconds },
    };

    if (scheduleTime) {
      task.scheduleTime = {
        seconds: Math.floor(new Date(scheduleTime).getTime() / 1000),
      };
    }

    const [response] = await this.client.createTask({ parent, task });
    this.taskStatus.set(response.name, {
      status: 'queued',
      taskType,
      createdAt: new Date().toISOString(),
      queueName: queueName || this.config.queueName,
    });

    return response;
  }

  async scheduleTask({ queueName, url, payload, taskType, runAt }) {
    return this.createTask({ queueName, url, payload, taskType, scheduleTime: runAt });
  }

  async deleteTask(taskId, queueName) {
    if (!taskId) {
      throw new Error('taskId is required');
    }

    if (!this.client) {
      this.taskStatus.set(taskId, { status: 'cancelled', cancelledAt: new Date().toISOString() });
      return { deleted: true, taskId, local: true };
    }

    const name = taskId.includes('/tasks/') ? taskId : this.getTaskName(taskId, queueName);
    await this.client.deleteTask({ name });
    this.taskStatus.set(name, { status: 'cancelled', cancelledAt: new Date().toISOString() });

    return { deleted: true, taskId: name };
  }

  async listTasks(queueName) {
    if (!this.client) {
      return [...this.taskStatus.entries()].map(([name, state]) => ({ name, ...state }));
    }

    const [tasks] = await this.client.listTasks({ parent: this.getQueuePath(queueName || this.config.queueName) });
    return tasks.map((task) => ({
      name: task.name,
      scheduleTime: task.scheduleTime,
      dispatchCount: task.dispatchCount,
      responseCount: task.responseCount,
      firstAttempt: task.firstAttempt,
      lastAttempt: task.lastAttempt,
    }));
  }

  async getTaskStatus(taskId) {
    if (!taskId) {
      throw new Error('taskId is required');
    }

    if (this.taskStatus.has(taskId)) {
      return { taskId, ...this.taskStatus.get(taskId) };
    }

    if (!this.client) {
      return { taskId, status: 'unknown' };
    }

    const [task] = await this.client.getTask({ name: taskId });
    return {
      taskId,
      status: task.dispatchCount > 0 ? 'dispatched' : 'queued',
      dispatchCount: task.dispatchCount,
      responseCount: task.responseCount,
    };
  }

  async processUserRouteHistory(payload) {
    return this.createTask({
      queueName: this.config.queueNames.routeHistory,
      taskType: 'process-user-route-history',
      url: payload.url,
      payload,
    });
  }

  async generateAnomalyReport(payload) {
    return this.scheduleTask({
      queueName: this.config.queueNames.anomalyReports,
      taskType: 'generate-anomaly-reports',
      url: payload.url,
      payload,
      runAt: payload.runAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  }

  async cleanupOldSimulationData(payload) {
    return this.scheduleTask({
      queueName: this.config.queueNames.cleanup,
      taskType: 'cleanup-old-simulation-data',
      url: payload.url,
      payload,
      runAt: payload.runAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async exportStatistics(payload) {
    return this.scheduleTask({
      queueName: this.config.queueNames.exports,
      taskType: 'export-statistics',
      url: payload.url,
      payload,
      runAt: payload.runAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendNotification(payload) {
    return this.createTask({
      queueName: this.config.queueNames.notifications,
      taskType: 'send-notification',
      url: payload.url,
      payload,
    });
  }

  async healthCheck() {
    try {
      await this.listTasks();
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

module.exports = { CloudTasksService };
