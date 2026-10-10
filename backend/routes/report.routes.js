// report.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/report.controller');

router.get('/dashboard', authenticate, authorize('ADMIN'), ctrl.dashboard);
router.get('/lead-time', authenticate, authorize('ADMIN'), ctrl.leadTime);
router.get('/waiting-time', authenticate, authorize('ADMIN'), ctrl.waitingTime);
router.get('/employee-performance', authenticate, authorize('ADMIN'), ctrl.employeePerformance);
router.get('/property-right', authenticate, authorize('ADMIN'), ctrl.propertyRightReport);
router.get('/property-owner', authenticate, authorize('ADMIN'), ctrl.propertyOwnerReport);

module.exports = router;
