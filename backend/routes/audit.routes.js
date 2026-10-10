const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/audit.controller');

router.get('/', authenticate, authorize('ADMIN'), ctrl.getAll);
router.get('/stats', authenticate, authorize('ADMIN'), ctrl.getStats);
router.get('/:id', authenticate, authorize('ADMIN'), ctrl.getById);

module.exports = router;
