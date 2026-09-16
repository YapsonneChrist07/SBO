const router = require('express').Router();
const ctrl = require('../controllers/supplier.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.get('/:id/reviews', ctrl.getReviews);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/:id/contacts', authenticate, ctrl.addContact);

module.exports = router;
