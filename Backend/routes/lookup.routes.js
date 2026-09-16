const router = require('express').Router();
const ctrl = require('../controllers/lookup.controller');

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
router.get('/product-lines', ctrl.getProductLines);
router.get('/product-types', ctrl.getProductTypes);
router.get('/brands', ctrl.getBrands);
router.get('/client-types', ctrl.getClientTypes);
router.get('/supplier-types', ctrl.getSupplierTypes);
router.get('/broker-types', ctrl.getBrokerTypes);
router.get('/transporter-types', ctrl.getTransporterTypes);

module.exports = router;
