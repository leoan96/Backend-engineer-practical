// Import required libraries
const path = require('path');
const express = require('express');
const morgan = require('morgan');

// Import AppError to create custom error
const AppError = require('./utils/appError');

// Import global app error handler
const globaAppError = require('./controllers/errorController');

// Configure environment variables
const env_file = '.env';
const env_path = path.join(__dirname, env_file);
const dotenv = require('dotenv').config({ path: env_path });

// Import routes
const orderRoutes = require('./routes/orderRoutes');

// Initialize Order Application instance
const app = express();

// Configure body-parser and json
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// Default root route
app.get('/', (req, res) => {
	res.status(200).json({
		status: 'success',
		data: {
			message: 'Hello, World!',
		},
	});
});

// Setup routes for the app
app.use('/api/v1/order', orderRoutes);

// Handle routes not defined
app.get('*', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Set global app handler
app.use(globaAppError);

module.exports = app;
