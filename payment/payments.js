const path = require('path');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib/callback_api');

// Configure environment variables
const env_file = '.env';
const env_path = path.join(__dirname, env_file);
const dotenv = require('dotenv').config({ path: env_path });

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
			channel.consume(queue, (msg) => {
				console.log('Received order...');
				console.log(
					"Received '%s'",
					Buffer.from(msg.content).toString('utf-8')
				);

				setTimeout(() => {
					channel.ack(msg);
				}, 1000);
			});
		});
	});
};
connectRabbitMQ();
