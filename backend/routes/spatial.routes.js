const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/spatial.controller');

const spatialRoles = ['DO', 'GO', 'SGO', 'ADMIN'];

// Cadastral Spatial Services (GeoJSON & Topology)
router.get('/spatial/parcels-geojson', authenticate, ctrl.getParcelsGeoJson);
router.post('/spatial/split-parcel', authenticate, authorize(...spatialRoles), ctrl.splitParcel);
router.post('/spatial/merge-parcels', authenticate, authorize(...spatialRoles), ctrl.mergeParcels);
router.post('/spatial/validate-topology', authenticate, authorize(...spatialRoles), ctrl.validateTopology);

// Border Points
router.post('/border-points', authenticate, authorize(...spatialRoles), ctrl.createBorderPoint);
router.delete('/border-points/:id', authenticate, authorize(...spatialRoles), ctrl.deleteBorderPoint);

// Boundary Lines
router.post('/boundary-lines', authenticate, authorize(...spatialRoles), ctrl.createBoundaryLine);
router.delete('/boundary-lines/:id', authenticate, authorize(...spatialRoles), ctrl.deleteBoundaryLine);

module.exports = router;
