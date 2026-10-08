const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/transporterportal.controller');
const { authenticate, authorizeOrganization } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorizeOrganization('transporter'));

router.get('/summary', ctrl.getSummary);

router.get('/shipments', ctrl.getShipments);
router.get('/shipments/:sellID', ctrl.getShipment);
router.post('/shipments/:sellID/pickup', ctrl.pickUpShipment);
router.post('/shipments/:sellID/deliver', ctrl.deliverShipment);

router.get('/pickups', ctrl.getPickups);
router.get('/pickups/:id', ctrl.getPickup);

router.get('/tariffs', ctrl.getTariffZones);
router.get('/tariffs/:zoneID', ctrl.getZoneTariffs);
router.put('/tariffs', [
  body('zoneID').notEmpty(),
  body('trajectID').optional({ values: 'falsy' }).isString(),
  body('rates').isArray({ min: 1, max: 50 }),
  body('rates.*.weightLimitID').notEmpty(),
  body('rates.*.transportCost').optional({ values: 'null' }).custom((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0)),
], validate, ctrl.saveTariffs);

module.exports = router;
