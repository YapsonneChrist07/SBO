const router = require('express').Router();
const ctrl = require('../controllers/shipment.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, ctrl.getAll);
router.get('/:id', authenticate, authorizeAdmin, ctrl.getById);
router.post('/', authenticate, authorizeAdmin, ctrl.create);
router.patch('/:id/status', authenticate, authorizeAdmin, ctrl.updateStatus);

module.exports = router;
