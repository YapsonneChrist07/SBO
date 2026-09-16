const router = require('express').Router();
const ctrl = require('../controllers/mobilemoney.controller');
const { authenticate } = require('../middleware/auth');

router.get('/operators', ctrl.getOperators);
router.get('/contact/:contactID', authenticate, ctrl.getByContact);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id/deactivate', authenticate, ctrl.deactivate);

module.exports = router;
