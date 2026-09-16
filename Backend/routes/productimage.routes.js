const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/productimage.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', ctrl.getImages);
router.get('/:imageID/raw', ctrl.getImageById);
router.post('/', authenticate, authorizeAdmin, ctrl.uploadImage);
router.delete('/:imageID', authenticate, authorizeAdmin, ctrl.deleteImage);

module.exports = router;
