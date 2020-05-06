const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib/callback_api');
const AppError = require('../utils/appError');
const Order = require('../models/orderModel');

// Create jwt token
const signToken = (id, orderItems) => {
	return jwt.sign({ id, orderItems }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});
};

exports.createOrder = catchAsync(async (req, res, next) => {
	const orderItems = req.body.orderItems;
	const newOrder = await Order.create({ orderItems });

	// Hard coding the USER ID to 12345 (to simulate mocked auth details).
	// In actuality, need to get current user id.
	const signedJWT = signToken(12345, orderItems);

	// Send Remote Procedure Call(RPC) call to payment app server to process the order
	const connectionString = process.env.RABBITMQ_HOST;
	amqp.connect(connectionString, function (error, connection) {
		if (error) {
			throw error;
		}
		connection.createChannel(function (error1, channel) {
			if (error1) {
				throw error1;
			}

			const queue = 'rpc_queue';

			channel.assertQueue(queue, {
				durable: true,
			});

			channel.sendToQueue(queue, Buffer.from(signedJWT, 'utf8'), {
				persistent: true,
			});
			console.log('Processing payments for order...');
		});
	});

	res.status(201).json({
		status: 'success',
		data: {
			newOrder,
			token: signedJWT,
		},
	});
});

exports.getAllOrder = catchAsync(async (req, res, next) => {
	const orders = await Order.find({}).sort('-orderCreatedAt');

	res.status(200).json({
		status: 'success',
		data: {
			orders,
		},
	});
});

exports.checkState = catchAsync(async (req, res, next) => {
	const order = await Order.findById(req.params.orderID);

	if (!order) {
		return next(new AppError('No order found with that ID!', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			state: order.state,
		},
	});
});

exports.cancelOrder = catchAsync(async (req, res, next) => {
	const order = await Order.findByIdAndUpdate(
		req.params.orderID,
		{ state: 'cancelled' },
		{
			new: true,
			runValidators: true,
		}
	);

	if (!order) {
		return next(new AppError('No order found with that ID!', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			order,
		},
	});
});
