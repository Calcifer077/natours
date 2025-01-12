const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};

//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });

exports.getAllReviews = factory.getAll(Review);

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tourId) req.body.tour = req.params.tourId;
  req.body.user = req.user.id;

  next();
};

// exports.createReview = catchAsync(async (req, res, next) => {
//   // Allowed nested routes to work that are implmented in tourRoutes
//   // if (!req.body.tour) req.body.tour = req.params.tourId;

//   // There is a problem with a below line of code that is any user can write review for any other user just by specifying it in the body as a different user.
//   // if (!req.body.user) req.body.user = req.user.id; // we get user.id from protect middleware

//   const newReview = await Review.create(req.body);

//   // To solve the above problem
//   // const newReview = await Review.create({
//   //   tour: req.params.tourId,
//   //   ...req.body,
//   //   user: req.user.id,
//   // });

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
