const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/register', [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('username').notEmpty().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(ctrl.ROLES),
  // supplier.name / transporter.name are varchar(45), businessDescription varchar(250)
  body('companyName').if(body('role').isIn(['supplier', 'transporter'])).trim().notEmpty().isLength({ max: 45 }),
  body('businessDescription').optional({ checkFalsy: true }).isLength({ max: 250 }),
], validate, ctrl.register);

router.post('/login', [
  body('username').notEmpty(),
  body('password').notEmpty(),
  body('role').optional().isIn(ctrl.ROLES),
], validate, ctrl.login);

router.get('/me', authenticate, ctrl.getMe);

router.put('/me', authenticate, [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('email').optional({ checkFalsy: true }).isEmail(),
], validate, ctrl.updateMe);

router.put('/me/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, ctrl.changePassword);

router.post('/forgot-password', [
  body('email').isEmail(),
], validate, ctrl.forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validate, ctrl.resetPassword);

module.exports = router;
