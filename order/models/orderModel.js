const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
	{
		state: {
			type: String,
			required: [true, 'An order must have a state!'],
			default: 'created',
			enum: {
				values: ['created', 'confirmed', 'cancelled', 'delivered'],
				message: 'Invalid state value!',
			},
		},
		orderCreatedAt: {
			type: Date,
			default: Date.now(),
		},
		orderItems: [String],
		// Used to refer to User model for user shipping details such as email, address, payment details \
		// (can uncomment this if User model is implemented)
		// userID: {
		// 	type: mongoose.Schema.ObjectId,
		// 	ref: 'User',
		// },
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
