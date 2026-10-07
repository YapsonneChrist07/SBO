const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/purchase.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorizeAdmin);

router.get('/', ctrl.getAll);
router.get('/options', ctrl.getOptions);
router.get('/supplier-offer/:supplierID', ctrl.getSupplierOffer);
router.get('/:id', ctrl.getById);
router.post('/', [
  body('supplierID').notEmpty(),
  body('storeID').notEmpty(),
  body('transporterID').optional({ checkFalsy: true }).isString(),
  body('items').isArray({ min: 1 }),
  body('items.*.productID').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('transportCost').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('tax').optional({ checkFalsy: true }).isFloat({ min: 0 }),
], validate, ctrl.create);
router.post('/:id/receive', ctrl.receive);
router.delete('/:id', ctrl.remove);

module.exports = router;
