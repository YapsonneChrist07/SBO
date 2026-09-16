const router = require('express').Router();
const ctrl = require('../controllers/purchase.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
