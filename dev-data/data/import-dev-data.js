const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');
const Booking = require('../../models/bookingModel');

dotenv.config({ path: './config.env' });

// When using local database.
// mongoose
//   .connect(process.env.DATABASE_LOCAL, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log('DB connection successful'));

// When using ATLAS
const DB = process.env.DATABASE_ATLAS.replace(
  '<db_password>',
  process.env.DATABASE_PASSWORD_ATLAS,
);

mongoose.connect(DB).then(() => console.log('DB connection successfull'));

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);
// const bookings = JSON.parse(
//   fs.readFileSync(`${__dirname}/bookings.json`, 'utf-8'),
// );

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    // await Booking.create(bookings);
    await console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM COLLECTION
const deleteData = async () => {
  try {
    // will delete all of the documents in a certain collection
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    // await Booking.deleteMany();
    console.log('Data successfully deleted');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

// How to run the above script?
// To delete all data
// node dev-data/data/import-dev-data.js --delete
// To import all data
// node dev-data/data/import-dev-data.js --import

// Here, '--import' and '--delete' will be a part of 'process.argv'
