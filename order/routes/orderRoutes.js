const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router
	.route('/')
	.get(orderController.getAllOrder)
	.post(orderController.createOrder);

router
	.route('/:orderID')
	.get(orderController.checkState)
	.put(orderController.cancelOrder);

module.exports = router;
