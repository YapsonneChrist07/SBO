const router = require('express').Router();
const ctrl = require('../controllers/sell.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id/status', authenticate, authorizeAdmin, ctrl.setStatus);
router.delete('/:id', authenticate, authorizeAdmin, ctrl.remove);

module.exports = router;
