const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/sell.controller');
const shipmentCtrl = require('../controllers/ordershipment.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', authenticate, ctrl.getAll);
router.get('/shipment-transporters', authenticate, authorizeAdmin, shipmentCtrl.getAvailableTransporters);
router.post('/shipping-options', authenticate, ctrl.shippingQuote);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id/status', authenticate, authorizeAdmin, ctrl.setStatus);
router.put('/:id/shipment', authenticate, authorizeAdmin, [
  body('transporterID').notEmpty(),
  body('expectedDaysDuration').optional({ values: 'falsy' }).isInt({ min: 0, max: 365 }),
], validate, shipmentCtrl.assign);
router.delete('/:id/shipment', authenticate, authorizeAdmin, shipmentCtrl.unassign);
router.delete('/:id', authenticate, authorizeAdmin, ctrl.remove);

module.exports = router;
