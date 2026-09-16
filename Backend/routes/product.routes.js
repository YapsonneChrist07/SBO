const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/image', ctrl.getImage);
router.get('/:id/inventory', ctrl.getInventory);
router.get('/:id/promotions', ctrl.getPromotions);
router.post('/', authenticate, authorizeAdmin, ctrl.create);
router.put('/:id', authenticate, authorizeAdmin, ctrl.update);
router.patch('/:id', authenticate, authorizeAdmin, ctrl.patch);
router.delete('/:id', authenticate, authorizeAdmin, ctrl.remove);

module.exports = router;
