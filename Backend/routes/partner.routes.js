const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/partner.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorizeAdmin);

router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getAll);
// A company can be approved/re-enabled ('active') or disabled; it never goes back to 'pending'.
router.patch('/:type/:id/status', [
  body('status').isIn(['active', 'disabled']),
], validate, ctrl.setStatus);

module.exports = router;
