const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/supplierportal.controller');
const { authenticate, authorizeOrganization } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorizeOrganization('supplier'));

router.get('/summary', ctrl.getSummary);

router.get('/catalog', ctrl.searchCatalog);
router.get('/products', ctrl.getProducts);
router.get('/products/:productID', ctrl.getProduct);
router.put('/products/:productID', [
  body('supplierUnitPrice').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  // productsupplier.supplierProductCode is varchar(15)
  body('supplierProductCode').optional({ checkFalsy: true }).trim().isLength({ max: 15 }).withMessage('Code produit : 15 caractères maximum'),
], validate, ctrl.upsertProduct);
router.delete('/products/:productID', ctrl.removeProduct);

router.put('/products/:productID/locations/:locationID', [
  body('supplierAreaUnitPrice').isFloat({ min: 0 }).withMessage('Prix invalide'),
], validate, ctrl.setShopPrice);
router.delete('/products/:productID/locations/:locationID', ctrl.removeShopPrice);

router.get('/purchases', ctrl.getPurchases);
router.get('/purchases/:id', ctrl.getPurchase);

router.get('/reviews', ctrl.getReviews);

module.exports = router;
