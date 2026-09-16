const router = require('express').Router();
const ctrl = require('../controllers/creditcard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/types', ctrl.getTypes);
router.get('/contact/:contactID', authenticate, ctrl.getByContact);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.patch('/:id/deactivate', authenticate, ctrl.deactivate);

module.exports = router;
