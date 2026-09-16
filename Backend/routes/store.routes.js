const router = require('express').Router();
const ctrl = require('../controllers/store.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, authorizeAdmin, ctrl.create);
router.put('/:id', authenticate, authorizeAdmin, ctrl.update);
router.delete('/:id', authenticate, authorizeAdmin, ctrl.remove);

module.exports = router;
