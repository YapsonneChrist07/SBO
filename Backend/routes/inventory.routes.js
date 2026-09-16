const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/product/:productID', authenticate, ctrl.getByProduct);
router.get('/product/:productID/options', authenticate, ctrl.getOptions);
router.post('/', authenticate, ctrl.upsert);

module.exports = router;
