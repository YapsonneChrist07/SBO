const router = require('express').Router();
const ctrl = require('../controllers/transaction.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id/status', authenticate, authorizeAdmin, ctrl.updateStatus);

module.exports = router;
