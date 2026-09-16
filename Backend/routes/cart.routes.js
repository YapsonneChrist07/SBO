const router = require('express').Router();
const ctrl = require('../controllers/cart.controller');

router.post('/', ctrl.createCart);
router.get('/:cartID', ctrl.getCart);
router.post('/:cartID/items', ctrl.addItem);
router.delete('/:cartID/items/:productID', ctrl.removeItem);
router.delete('/:cartID', ctrl.clearCart);

module.exports = router;
