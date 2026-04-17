const { CloudStorageService } = require('../services/cloud-storage');
const { CloudTasksService } = require('../services/cloud-tasks');
const { CloudPubSubService } = require('../services/cloud-pubsub');
const cloudLogger = require('../services/cloud-logger');
const cloudMonitoring = require('../services/cloud-monitoring');

function createGoogleServices() {
  const storageService = new CloudStorageService();
  const tasksService = new CloudTasksService();
  const pubSubService = new CloudPubSubService();

  return {
    storageService,
    tasksService,
    pubSubService,
    cloudLogger,
    cloudMonitoring,
  };
}

module.exports = { createGoogleServices };
