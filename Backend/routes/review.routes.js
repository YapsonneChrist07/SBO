const router = require('express').Router();
const ctrl = require('../controllers/review.controller');
const { authenticate } = require('../middleware/auth');

router.post('/products', authenticate, ctrl.createProductReview);
router.post('/suppliers', authenticate, ctrl.createSupplierReview);
router.get('/products/:productID/average', ctrl.getProductRatings);
router.get('/suppliers/:supplierID/average', ctrl.getSupplierRatings);
router.get('/recent', ctrl.getRecentReviews);

module.exports = router;
