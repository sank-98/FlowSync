const express = require('express');
const multer = require('multer');

function createStorageRouter(storageService) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage() });

  router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'file is required (form-data key: file)' });
      }

      const result = await storageService.uploadFile({
        fileName: req.file.originalname,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
        destinationPrefix: req.body.destinationPrefix,
        metadata: {
          uploadedBy: req.body.uploadedBy || 'anonymous',
          source: req.body.source || 'api',
        },
      });

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/download/:fileId', async (req, res, next) => {
    try {
      const file = await storageService.downloadFile(req.params.fileId);
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Length', String(file.size));
      return res.send(file.buffer);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/delete/:fileId', async (req, res, next) => {
    try {
      const result = await storageService.deleteFile(req.params.fileId);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/list', async (req, res, next) => {
    try {
      const files = await storageService.listFiles(req.query.prefix || '');
      return res.json({ files, count: files.length });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/batch-upload', upload.array('files', 20), async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'files are required (form-data key: files)' });
      }

      const uploaded = await Promise.all(
        req.files.map((file) =>
          storageService.uploadFile({
            fileName: file.originalname,
            buffer: file.buffer,
            contentType: file.mimetype,
            destinationPrefix: req.body.destinationPrefix,
            metadata: {
              uploadedBy: req.body.uploadedBy || 'anonymous',
              source: 'batch-upload',
            },
          })
        )
      );

      return res.status(201).json({ uploaded, count: uploaded.length });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createStorageRouter };
