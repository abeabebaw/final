
// public.routes.js (no auth required)
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const ctrl = require('../controllers/public.controller');

router.get('/announcements', ctrl.getAnnouncements);
router.get('/services', ctrl.getServices);
router.get('/documents', ctrl.getPublicDocuments);
router.get('/admin/announcements', authenticate, authorize('ADMIN'), ctrl.getAnnouncementsAdmin);
router.get('/admin/services', authenticate, authorize('ADMIN'), ctrl.getServicesAdmin);
router.get('/admin/documents', authenticate, authorize('ADMIN'), ctrl.getPublicDocumentsAdmin);
router.post('/admin/announcements', authenticate, authorize('ADMIN'), ctrl.createAnnouncement);
router.post('/admin/services', authenticate, authorize('ADMIN'), ctrl.createService);
router.post('/admin/documents', authenticate, authorize('ADMIN'), ctrl.createPublicDocument);
router.get('/application-status', ctrl.checkApplicationStatus);
router.get('/application-status/:applicationId', (req, res, next) => {
  req.query.applicationId = req.params.applicationId;
  return ctrl.checkApplicationStatus(req, res, next);
});
router.get('/layers', ctrl.getLayers);
router.get('/maps', ctrl.getPredefinedMaps);

module.exports = router;
