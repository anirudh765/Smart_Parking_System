const express = require('express');
const router = express.Router();

const { getPricing, getEstimate } = require('../controllers/pricingController');

router.get('/', getPricing);
router.post('/estimate', getEstimate);

module.exports = router;
