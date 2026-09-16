const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/summary', authenticate, authorizeAdmin, ctrl.getSummary);
router.get('/sales-trend', authenticate, authorizeAdmin, ctrl.getSalesTrend);
router.get('/visits', ctrl.getVisitCount);

module.exports = router;
