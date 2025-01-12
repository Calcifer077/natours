const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

dotenv.config({ path: './config.env' });

// Uncaught exceptions (errors in synchronous code)
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down');
  console.log(err.name, err.message);

  process.exit(1);
});

// This is used to connect to database locally.
// It returns a promise which is handled using 'then'
// mongoose
//   .connect(process.env.DATABASE_LOCAL, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log('DB connection successful'));

const DB = process.env.DATABASE_ATLAS.replace(
  '<db_password>',
  process.env.DATABASE_PASSWORD_ATLAS,
);

mongoose.connect(DB).then(() => console.log('DB connection successfull'));

// Creating a schema(How data is organized in database). In this version we have given only field names and their types. You can do much more by giving options which have been used later.
// const tourSchema new mongoose.Schema({
//   name: String,
//   rating: Number,
//   price: Number
// });

// const testTour = new Tour({
//   name: 'The Forest Hiker',
//   rating: 4.7,
//   price: 497,
// });

// saving it to database. It will return a promise.
// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log(`ERROR`, err);
//   });

// enviornment variables
// console.log(app.get('env')); // 'development' automatically set by express
// console.log(process.env); // set by nodejs

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

// listening for unhandled promise rejection event
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);

  // closing the server in a good way. In this way the server will first complete all the ongoing requests and then call the callback function which will close the server.
  server.close(() => {
    process.exit(1);
  });
});
