const router = require('express').Router();
const ctrl = require('../controllers/wishlist.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.post('/:id/items', ctrl.addItem);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
