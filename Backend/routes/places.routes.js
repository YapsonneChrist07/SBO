const router = require('express').Router();
const ctrl = require('../controllers/places.controller');

router.get('/nearby', ctrl.nearby);
router.get('/photo', ctrl.photo);

module.exports = router;
