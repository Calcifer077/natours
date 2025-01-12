const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// setting 'tour' and 'user' as index.
// It will make sure that any combination of tour and user is unique. This is to prevent duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
reviewSchema.pre(/^find/, function (next) {
  // Below will create an unnecessary chain of populates.
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// static methods -> are applied on model whereas instance methods are applied on documents.
// Below method is used to calculate ratings quantity and ratings average in real time as more reviews are added and then uses a post save middleware to save it to database.
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // 'this' points to current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  // when we are deleting our created reviews this will come into play
  if (stats.length > 0) {
    // as it returns a promise
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // 'this' points to current review

  // Here, 'Review' don't exist because it is declared in the next block of code. If we were to move this code below to get access of model 'Review' that of model declaration it will not contain this middleware.
  // Solution to above problem

  // 'this' points to the current document and constructor is the model who created that document.
  // this.constructor();

  // Review.calcAverageRatings(this.tour);

  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // Here, 'this' points to the current query but we want the current document. To do so we execute the query.
  // reviewDoc = await this.findOne();
  // console.log(reviewDoc);

  // we need to pass this 'reviewDoc' into the next middleware so that we can call the 'calcAverageRatings' on it but we simply can't so we set it as a property on this.
  this.reviewDoc = await this.findOne();
  // console.log(this.reviewDoc);

  // we want to call the function('calcAverageRatings') but we can't as it is pre middleware so the data is not updated in the database.

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does not work here, query has already executed
  await this.reviewDoc.constructor.calcAverageRatings(this.reviewDoc.tour);
});

// You can use the below middleware instead of the above two. It will be faster.
// Here, 'docs' is the currently executed document
// reviewSchema.post(/^findOneAnd/, async function (docs) {
//   if (docs) await docs.constructor.calcAverageRatings(docs.tour);
// });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
