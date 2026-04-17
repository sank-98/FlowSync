const { Storage } = require('@google-cloud/storage');

function createStorageClient() {
  return new Storage();
}

async function uploadBuffer({ bucketName, filename, buffer, contentType }) {
  const storage = createStorageClient();
  const file = storage.bucket(bucketName).file(filename);
  await file.save(buffer, { contentType, resumable: false });
  return `gs://${bucketName}/${filename}`;
}

module.exports = { createStorageClient, uploadBuffer };
