// Here, we are requiring stripe package and adding stripe secret key to it. By adding secret key we will get many option.
const Stripe = require('stripe');
const stripe = Stripe(
  'sk_test_51PmJCUIHrReNnCcrOnCt2elYWAa6LyaU4zdmClkgQRIvsmF7wVEH9epeMPm8MtpYmpZJLcax7oek4Q0FOYrvk5kG0070jAndL7',
);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2. Create checkout session
  // it will create a promise because setting all the things below will basically make a API call to stripe.
  const session = await stripe.checkout.sessions.create({
    // Below is the information about the session
    payment_method_types: ['card'],
    // The below method of 'success_url' is not secure because by this if anyone knows about the 'success_url' they can simply access that and create a new booking.
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',

    // Below is the information about the product that the user is gonna purchase
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });

  // 3. Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// Below function is used to create bookings in the database.
// How it works. This middleware is attached to the base url. Above function is used to create a checkout session whose success url is base url and some properties which are used to create that booking. If the base url have those properties it will create a booking in the document and remove those properties from the url and redirect it to the home page. If there is not the above properties mentioned it will be simply skipped.
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only temporary, because its unsecure as everyone can make booking without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
