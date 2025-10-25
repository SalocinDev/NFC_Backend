const express = require('express');
const router = express.Router();
router.use('/', require('./aiRoute')); // mount /chat inside aiRoute
module.exports = router;
