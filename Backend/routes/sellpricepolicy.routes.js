const router = require('express').Router();
const ctrl = require('../controllers/sellpricepolicy.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/product/:productID', authenticate, ctrl.getByProduct);
router.post('/', authenticate, authorizeAdmin, ctrl.upsert);
router.delete('/product/:productID/min/:minQuantity', authenticate, authorizeAdmin, ctrl.remove);

module.exports = router;
