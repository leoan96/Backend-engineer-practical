const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const Order = require('../models/orderModel');

// Libraries for RabbitMQ
const amqp = require('amqplib/callback_api');
const uuid = require('uuid');

// Create jwt token for verification
const signToken = (userId, orderID, orderItems) => {
	return jwt.sign({ userId, orderID, orderItems }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});
};

// Create an order
exports.createOrder = catchAsync(async (req, res, next) => {
	const orderItems = req.body.orderItems;
	const newOrder = await Order.create({ orderItems });

	// Hard coding the USER ID to 12345 (to simulate mocked auth details).
	// Send the ID of the newly connected order and it's item
	// In actuality, need to get current user id.
	const signedJWT = signToken(12345, newOrder.id, orderItems);
	const orderDetails = Buffer.from(signedJWT, 'utf8');

	// Send Remote Procedure Call(RPC) call to payment app server to process the order
	try {
		const connectionString = process.env.RABBITMQ_HOST;
		// amqp.connect(connectionString, function (error, connection) {
		// 	if (error) {
		// 		throw error;
		// 	}
		// 	connection.createChannel(function (error1, channel) {
		// 		if (error1) {
		// 			throw error1;
		// 		}

		// 		const queue = 'rpc_queue';

		// 		channel.assertQueue(queue, {
		// 			durable: true,
		// 		});

		// 		channel.sendToQueue(queue, Buffer.from(signedJWT, 'utf8'), {
		// 			persistent: true,
		// 		});
		// 		console.log('Processing payments for order...');
		// 	});
		// });
		amqp.connect(connectionString, (err1, connection) => {
			if (err1) throw err1;
			connection.createChannel((err2, channel) => {
				if (err2) throw err2;

				let correlationId;
				channel.assertQueue('', { exclusive: true }, (err3, q) => {
					if (err3) throw err3;
					// Generate a unique uuid for this message in order to receive back response from the payment app
					correlationId = uuid.v4();

					// Consume the response from the Payment app
					channel.consume(
						q.queue,
						(msg) => {
							if (msg.properties.correlationId === correlationId) {
								const results = JSON.parse(msg.content.toString());

								setTimeout(() => {
									connection.close();

									res.status(201).json({
										status: 'success',
										data: {
											results,
											token: signedJWT,
										},
									});
								}, 300);
							}
						},
						{ noAck: true }
					);

					// Send message from the Order app to Payment app
					channel.sendToQueue('rpc_queue', orderDetails, {
						correlationId: correlationId,
						replyTo: q.queue,
					});
					console.log('Processing payments for order...');
				});
			});
		});
	} catch (err) {
		console.log(`Error! 💥: ${err.message}`);
	}

	// res.status(201).json({
	// 	status: 'success',
	// 	data: {
	// 		newOrder,
	// 		token: signedJWT,
	// 	},
	// });
});

// Retrieve all orders
exports.getAllOrder = catchAsync(async (req, res, next) => {
	const orders = await Order.find({}).sort('-orderCreatedAt');

	res.status(200).json({
		status: 'success',
		data: {
			orders,
		},
	});
});

// Check the state of an individual order
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

// Cancel the individual order
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
