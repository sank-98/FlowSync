const path = require('path');
const { Storage } = require('@google-cloud/storage');

class CloudStorageService {
  constructor(options = {}) {
    this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID;
    this.bucketName = options.bucketName || process.env.GOOGLE_CLOUD_STORAGE_BUCKET || process.env.GCS_BUCKET_NAME;
    this.maxFileSizeBytes = Number(options.maxFileSizeBytes || process.env.CLOUD_STORAGE_MAX_FILE_SIZE_BYTES || 25 * 1024 * 1024);
    this.maxUploadRetries = Number(options.maxUploadRetries || process.env.CLOUD_STORAGE_MAX_UPLOAD_RETRIES || 3);
    this.client = new Storage({ projectId: this.projectId || undefined });
  }

  getBucket() {
    if (!this.bucketName) {
      throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET is not configured');
    }

    return this.client.bucket(this.bucketName);
  }

  validateUploadInput({ fileName, buffer }) {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('fileName is required');
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('file buffer is required');
    }

    if (buffer.length === 0) {
      throw new Error('empty file upload is not allowed');
    }

    if (buffer.length > this.maxFileSizeBytes) {
      throw new Error(`file exceeds max size of ${this.maxFileSizeBytes} bytes`);
    }
  }

  buildObjectName(fileName, destinationPrefix) {
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const prefix = destinationPrefix ? `${String(destinationPrefix).replace(/\/+$/, '')}/` : '';
    return `${prefix}${Date.now()}-${safeName}`;
  }

  async uploadFile({
    fileName,
    buffer,
    contentType,
    metadata = {},
    destinationPrefix,
    onProgress,
  }) {
    this.validateUploadInput({ fileName, buffer });

    const bucket = this.getBucket();
    const objectName = this.buildObjectName(fileName, destinationPrefix);
    const file = bucket.file(objectName);

    let attempt = 0;
    const chunkSize = 1024 * 1024;

    while (attempt < this.maxUploadRetries) {
      attempt += 1;

      try {
        await new Promise((resolve, reject) => {
          const stream = file.createWriteStream({
            resumable: buffer.length > 5 * 1024 * 1024,
            contentType: contentType || 'application/octet-stream',
            metadata: {
              metadata,
            },
          });

          let uploadedBytes = 0;

          stream.on('error', reject);
          stream.on('finish', resolve);

          for (let offset = 0; offset < buffer.length; offset += chunkSize) {
            const chunk = buffer.slice(offset, Math.min(buffer.length, offset + chunkSize));
            stream.write(chunk);
            uploadedBytes += chunk.length;
            if (typeof onProgress === 'function') {
              onProgress(Math.min(100, Math.round((uploadedBytes / buffer.length) * 100)));
            }
          }

          stream.end();
        });

        return {
          fileId: objectName,
          bucket: this.bucketName,
          url: `gs://${this.bucketName}/${objectName}`,
          metadata,
        };
      } catch (error) {
        if (attempt >= this.maxUploadRetries) {
          throw new Error(`upload failed after ${attempt} attempts: ${error.message}`);
        }
      }
    }

    throw new Error('upload failed');
  }

  async downloadFile(fileId) {
    if (!fileId) {
      throw new Error('fileId is required');
    }

    const file = this.getBucket().file(fileId);
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    return {
      fileId,
      buffer,
      contentType: metadata.contentType || 'application/octet-stream',
      metadata: metadata.metadata || {},
      size: Number(metadata.size || buffer.length),
    };
  }

  async deleteFile(fileId) {
    if (!fileId) {
      throw new Error('fileId is required');
    }

    await this.getBucket().file(fileId).delete();
    return { deleted: true, fileId };
  }

  async listFiles(prefix = '') {
    const [files] = await this.getBucket().getFiles({ prefix: prefix || undefined });

    return Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          fileId: file.name,
          contentType: metadata.contentType || 'application/octet-stream',
          size: Number(metadata.size || 0),
          updated: metadata.updated,
          metadata: metadata.metadata || {},
        };
      })
    );
  }

  async healthCheck() {
    try {
      await this.getBucket().exists();
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

module.exports = { CloudStorageService };
