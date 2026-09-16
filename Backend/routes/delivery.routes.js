const router = require('express').Router();
const ctrl = require('../controllers/delivery.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);

module.exports = router;
