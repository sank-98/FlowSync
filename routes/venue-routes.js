const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venue-controller');

// Middleware for error handling
const handleErrors = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes
router.get('/zones', handleErrors(venueController.getZones));
router.get('/heatmap', handleErrors(venueController.getHeatmap));
router.get('/anomalies', handleErrors(venueController.getAnomalies));
router.get('/dashboard', handleErrors(venueController.getDashboard));
router.get('/zones/:id', handleErrors(venueController.getZoneById));
router.post('/route', handleErrors(venueController.postRoute));
router.post('/time-analysis', handleErrors(venueController.postTimeAnalysis));
router.get('/exit-strategy', handleErrors(venueController.getExitStrategy));
router.post('/ai-chat', handleErrors(venueController.postAiChat));
router.get('/stats', handleErrors(venueController.getStats));
router.post('/simulation', handleErrors(venueController.postSimulation));
router.post('/trigger-event-end', handleErrors(venueController.postTriggerEventEnd));
router.post('/reset', handleErrors(venueController.postReset));

module.exports = router;