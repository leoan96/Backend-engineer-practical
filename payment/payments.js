const path = require('path');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib/callback_api');
const Order = require('./models/orderModel');

// Configure environment variables
const env_file = '.env';
const env_path = path.join(__dirname, env_file);
const dotenv = require('dotenv').config({ path: env_path });

// Import MongoDB
const db = require('./server');

// Connect the Payment app to RabbitMQ to receive messages from Order app
const connectRabbitMQ = () => {
	const connectionString = process.env.RABBITMQ_HOST;
	amqp.connect(connectionString, (error0, connection) => {
		if (error0) {
			// https://www.cloudamqp.com/blog/2015-05-19-part2-2-rabbitmq-for-beginners_example-and-sample-code-node-js.html (app based solution)
			// Could use health checks for docker but might not work in kubernetes as they require the use of image and do not build images
			// If fail to connect, wait for 10 secs to reconnect
			return setTimeout(connectRabbitMQ, 10 * 1000);
		}
		connection.on('close', function () {
			console.error('[AMQP] reconnecting');
			return setTimeout(connectRabbitMQ, 5 * 1000);
		});
		connection.createChannel((error1, channel) => {
			if (error1) {
				throw error1;
			}
			const queue = 'rpc_queue';

			// Make sure the queue exists
			channel.assertQueue(queue, {
				durable: true,
			});
			// Setup so that each Payment app retrieve only 1 message at a time from the queue
			channel.prefetch(1);

			console.log('Waiting for messages in %s', queue);
			// Retrive message from the queue
			channel.consume(queue, async (msg) => {
				const encoded_order = Buffer.from(msg.content).toString('utf-8');
				console.log('Received order...');
				console.log("Received '%s'", encoded_order);

				const decoded_order = await promisify(jwt.verify)(
					encoded_order,
					process.env.JWT_SECRET
				);

				// Making assumption that the ID still exists (query to check if userID exist in MongoDB)
				// NOT IMPLEMENTED
				// const currentUser = await User.findById(decoded.id);
				// console.log('current user : ', currentUser);

				// if (!currentUser) {
				// 	return next(
				// 		new AppError('The user belonging to this account no longer exists!', 404)
				// 	);
				// }
				// Process payment from order app
				await processPayment(decoded_order);

				setTimeout(() => {
					channel.ack(msg);
				}, 1000);
			});
		});
	});
};
connectRabbitMQ();

// Payment processing logic (mock logic)
const processPayment = async (order) => {
	const currentTime = parseInt(Date.now() / 1000, 10);
	const orderTokenExpires = order.exp;

	// If more than 60secs (JWT token expires) have elapse since the issue of token, state is changed to 'cancelled'
	if (currentTime > orderTokenExpires) {
		await Order.findByIdAndUpdate(order.orderID, { state: 'cancelled' });
	} else {
		await Order.findByIdAndUpdate(order.orderID, { state: 'confirmed' });
		// Set state to 'delivered' after x = 5 secs
		setTimeout(async () => {
			await Order.findByIdAndUpdate(order.orderID, { state: 'delivered' });
		}, 5 * 1000);
	}
};
