const path = require('path');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib/callback_api');

// Configure environment variables
const env_file = '.env';
const env_path = path.join(__dirname, env_file);
const dotenv = require('dotenv').config({ path: env_path });

const connectionString = process.env.RABBITMQ_HOST;
amqp.connect(connectionString, (error0, connection) => {
	if (error0) {
		throw error0;
	}
	connection.createChannel((error1, channel) => {
		if (error1) {
			throw error1;
		}
		const queue = 'rpc_queue';

		channel.assertQueue(queue, {
			durable: true,
		});
		channel.prefetch(1);

		console.log('Waiting for messages in %s', queue);
		channel.consume(queue, (msg) => {
			console.log('Received order...');
			console.log("Received '%s'", Buffer.from(msg.content).toString('utf-8'));

			setTimeout(() => {
				channel.ack(msg);
			}, 1000);
		});
	});
});
