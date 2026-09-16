const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, ctrl.getAll);
router.get('/product/:productID', authenticate, authorizeAdmin, ctrl.getByProduct);
router.get('/product/:productID/options', authenticate, ctrl.getOptions);
router.post('/', authenticate, authorizeAdmin, ctrl.upsert);

module.exports = router;
