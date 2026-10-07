const router = require('express').Router();
const ctrl = require('../controllers/supplier.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, ctrl.getAll);
router.get('/:id', authenticate, authorizeAdmin, ctrl.getById);
router.get('/:id/reviews', ctrl.getReviews);
router.post('/', authenticate, authorizeAdmin, ctrl.create);
router.put('/:id', authenticate, authorizeAdmin, ctrl.update);
router.delete('/:id', authenticate, authorizeAdmin, ctrl.remove);
router.post('/:id/contacts', authenticate, authorizeAdmin, ctrl.addContact);

module.exports = router;
