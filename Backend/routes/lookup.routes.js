const router = require('express').Router();
const ctrl = require('../controllers/lookup.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/countries', ctrl.getCountries);
router.get('/regions', ctrl.getRegions);
router.get('/cities', ctrl.getCities);
router.get('/colors', ctrl.getColors);
router.get('/lengths', ctrl.getLengths);
router.get('/zones', ctrl.getZones);
router.get('/trajects', ctrl.getTrajects);
router.get('/weight-limits', ctrl.getWeightLimits);
router.get('/volume-limits', ctrl.getVolumeLimits);
router.get('/product-divisions', ctrl.getProductDivisions);
router.post('/product-divisions', authenticate, authorizeAdmin, ctrl.createDivision);
router.put('/product-divisions/:id', authenticate, authorizeAdmin, ctrl.updateDivision);
router.delete('/product-divisions/:id', authenticate, authorizeAdmin, ctrl.removeDivision);

router.get('/product-lines', ctrl.getProductLines);
router.post('/product-lines', authenticate, authorizeAdmin, ctrl.createLine);
router.put('/product-lines/:id', authenticate, authorizeAdmin, ctrl.updateLine);
router.delete('/product-lines/:id', authenticate, authorizeAdmin, ctrl.removeLine);

router.get('/product-types', ctrl.getProductTypes);
router.post('/product-types', authenticate, authorizeAdmin, ctrl.createType);
router.put('/product-types/:id', authenticate, authorizeAdmin, ctrl.updateType);
router.delete('/product-types/:id', authenticate, authorizeAdmin, ctrl.removeType);

router.get('/brands', ctrl.getBrands);
router.get('/client-types', ctrl.getClientTypes);
router.get('/supplier-types', ctrl.getSupplierTypes);
router.get('/broker-types', ctrl.getBrokerTypes);
router.get('/transporter-types', ctrl.getTransporterTypes);

module.exports = router;
