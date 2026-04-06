const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth');
const { transcribe, command } = require('../controllers/voiceController');

router.post('/transcribe', optionalAuth, transcribe);
router.post('/command', optionalAuth, command);

module.exports = router;
