const { EventEmitter } = require('events');
const request = require('supertest');
const { app } = require('../server');
const { CloudStorageService } = require('../services/cloud-storage');
const { CloudTasksService } = require('../services/cloud-tasks');
const cloudMonitoring = require('../services/cloud-monitoring');
const cloudLogger = require('../services/cloud-logger');
const { CloudPubSubService } = require('../services/cloud-pubsub');

class MockWritable extends EventEmitter {
  constructor(shouldFail) {
    super();
    this.shouldFail = shouldFail;
  }

  write() {
    return true;
  }

  end() {
    if (this.shouldFail) {
      this.emit('error', new Error('upload failed'));
      return;
    }
    this.emit('finish');
  }
}

describe('google cloud services integration', () => {
  it('supports cloud storage upload/download/list/delete with metadata', async () => {
    const storageService = new CloudStorageService({ bucketName: 'test-bucket', maxUploadRetries: 2 });
    const metadata = { team: 'ops' };
    const fileMetadata = {
      contentType: 'text/plain',
      size: '4',
      metadata,
      updated: '2026-01-01T00:00:00.000Z',
    };

    const fakeFile = {
      createWriteStream: jest.fn(() => new MockWritable(false)),
      download: jest.fn().mockResolvedValue([Buffer.from('test')]),
      getMetadata: jest.fn().mockResolvedValue([fileMetadata]),
      delete: jest.fn().mockResolvedValue([{}]),
      name: 'file-1',
    };

    storageService.getBucket = jest.fn(() => ({
      file: jest.fn(() => fakeFile),
      getFiles: jest.fn().mockResolvedValue([[fakeFile]]),
      exists: jest.fn().mockResolvedValue([true]),
    }));

    const progress = [];
    const uploaded = await storageService.uploadFile({
      fileName: 'notes.txt',
      buffer: Buffer.from('test'),
      contentType: 'text/plain',
      metadata,
      onProgress: (value) => progress.push(value),
    });

    expect(uploaded.fileId).toContain('notes.txt');
    expect(progress[progress.length - 1]).toBe(100);

    const downloaded = await storageService.downloadFile(uploaded.fileId);
    expect(downloaded.buffer.toString()).toBe('test');

    const listed = await storageService.listFiles();
    expect(listed[0].metadata.team).toBe('ops');

    const deleted = await storageService.deleteFile(uploaded.fileId);
    expect(deleted.deleted).toBe(true);
  });

  it('handles cloud storage upload errors with retries', async () => {
    const storageService = new CloudStorageService({ bucketName: 'test-bucket', maxUploadRetries: 1 });

    storageService.getBucket = jest.fn(() => ({
      file: jest.fn(() => ({ createWriteStream: jest.fn(() => new MockWritable(true)) })),
    }));

    await expect(
      storageService.uploadFile({
        fileName: 'broken.txt',
        buffer: Buffer.from('broken'),
      })
    ).rejects.toThrow('upload failed after 1 attempts');
  });

  it('creates and tracks local cloud tasks when cloud tasks is disabled', async () => {
    const tasksService = new CloudTasksService({ enabled: false });
    const task = await tasksService.createTask({ url: 'https://example.com/task', payload: { id: 1 } });

    expect(task.local).toBe(true);

    const list = await tasksService.listTasks();
    expect(list.length).toBeGreaterThan(0);

    const status = await tasksService.getTaskStatus(task.name);
    expect(status.status).toBe('queued');
  });

  it('supports local pubsub publish and subscribe', async () => {
    const pubSubService = new CloudPubSubService({ enabled: false });
    const handler = jest.fn();

    await pubSubService.subscribeToTopic('anomaly-detection', handler);
    await pubSubService.publishMessage('anomaly-detection', { severity: 'high' });

    expect(handler).toHaveBeenCalledWith({ severity: 'high' });
  });

  it('returns false for monitoring write when cloud monitoring is disabled', async () => {
    const result = await cloudMonitoring.recordMetric('custom.googleapis.com/crowdflow/api_latency', 12);
    expect(result).toBe(false);
  });

  it('logs with cloud logger wrapper functions without throwing', () => {
    expect(() => {
      cloudLogger.logInfo('info test');
      cloudLogger.logWarning('warning test');
      cloudLogger.logDebug('debug test');
      cloudLogger.logAudit('audit-test', { actor: 'tester' });
      cloudLogger.logMetrics('latency', 15, { route: '/health' });
      cloudLogger.logError('error test', new Error('boom'));
    }).not.toThrow();
  });

  it('exposes health endpoint for all cloud services', async () => {
    const res = await request(app).get('/health/services');

    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('services.storage');
    expect(res.body).toHaveProperty('services.logging');
    expect(res.body).toHaveProperty('services.tasks');
    expect(res.body).toHaveProperty('services.monitoring');
    expect(res.body).toHaveProperty('services.pubsub');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('lastCheck');
  });

  it('supports cloud tasks and cloud events management routes', async () => {
    const taskResponse = await request(app)
      .post('/api/tasks/create')
      .set('x-csrf-token', 'test')
      .send({ url: 'https://example.com/tasks' });

    expect(taskResponse.statusCode).toBe(201);

    const eventsResponse = await request(app).get('/api/events/topics');
    expect(eventsResponse.statusCode).toBe(200);
    expect(Array.isArray(eventsResponse.body.topics)).toBe(true);
  });

  it('supports storage metadata and event message listing routes', async () => {
    const storageService = new CloudStorageService({ bucketName: 'test-bucket' });
    storageService.getBucket = jest.fn(() => ({
      file: jest.fn(() => ({
        getMetadata: jest.fn().mockResolvedValue([
          {
            contentType: 'text/plain',
            size: '10',
            updated: '2026-01-01T00:00:00.000Z',
            metadata: { uploadedBy: 'tester' },
          },
        ]),
      })),
    }));

    const metadata = await storageService.getFileMetadata('test-file-id');
    expect(metadata.metadata.uploadedBy).toBe('tester');

    const pubSubService = new CloudPubSubService({ enabled: false });
    await pubSubService.publishMessage('metrics-export', { latency: 42 });
    const messages = pubSubService.getMessages('metrics-export');
    expect(messages.length).toBe(1);
    expect(messages[0].payload.latency).toBe(42);
  });

  it('acknowledges and nacks pubsub messages through helper methods', () => {
    const pubSubService = new CloudPubSubService({ enabled: false });
    const ack = jest.fn();
    const nack = jest.fn();

    expect(pubSubService.acknowledgeMessage({ ack })).toBe(true);
    expect(ack).toHaveBeenCalledTimes(1);

    const handled = pubSubService.handleMessageError(new Error('failed'), { nack });
    expect(handled).toEqual({ handled: true, error: 'failed' });
    expect(nack).toHaveBeenCalledTimes(1);

    expect(pubSubService.acknowledgeMessage({})).toBe(false);
    expect(pubSubService.handleMessageError(new Error('fallback'))).toEqual({
      handled: true,
      error: 'fallback',
    });
  });
});
