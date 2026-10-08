const router = require('express').Router();
const ctrl = require('../controllers/delivery.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, ctrl.getAll);
router.get('/:id', authenticate, authorizeAdmin, ctrl.getById);
router.post('/', authenticate, authorizeAdmin, ctrl.create);

module.exports = router;
