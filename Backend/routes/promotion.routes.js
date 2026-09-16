const router = require('express').Router();
const ctrl = require('../controllers/promotion.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, authorizeAdmin, ctrl.create);
router.delete('/:id', authenticate, authorizeAdmin, ctrl.remove);

module.exports = router;
