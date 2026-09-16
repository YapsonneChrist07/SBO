const router = require('express').Router();
const ctrl = require('../controllers/quote.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id/status', authenticate, ctrl.updateStatus);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
