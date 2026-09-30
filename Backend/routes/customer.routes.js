const router = require('express').Router();
const ctrl = require('../controllers/customer.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, ctrl.getAll);
router.get('/:id', authenticate, authorizeAdmin, ctrl.getById);

module.exports = router;
