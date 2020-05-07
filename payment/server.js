// Import mongoose and configure the database
const mongoose = require('mongoose');
const DB = process.env.DATABASE_USERNAME;

const connectDB = mongoose
	.connect(DB, {
		useCreateIndex: true,
		useFindAndModify: false,
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log('Successfully connected to database!');
	})
	.catch((err) => {
		console.log(`Database connection error 💥 : ${err.message}`);
	});

// Handle errors after initial connection
mongoose.connection.on('error', (err) => {
	console.log(`Mongo connection error 💥 : ${err}`);
});

module.exports = connectDB;
