const { CloudTasksClient } = require('@google-cloud/tasks');

function createCloudTasksClient() {
  return new CloudTasksClient();
}

module.exports = { createCloudTasksClient };
