const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('../routes/reviewRoutes');

const router = express.Router();

// param middleware
// this type of middleware work only for certain parameters which in below case is 'id'
// The below middleware will only run for tours not users because it is defined in tourRoutes
// router.param('id', tourController.checkID);

// Routing
// In the post request we have two function. First one is a middleware and will run before 'createTour'

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/41.648915, 91.279615/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  // .post(tourController.checkBody, tourController.createTour);
  .post(
    tourController.filterTourData,
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

// Here, '1234' is tour id. So it means reviews for a particular tour.
// POST /tour/1234/reviews
// GET /tour/1234/reviews
// GET /tour/1234/reviews/0978 // particular review from a particular tour

// Nested routes
// We are not implementing it here because we are using reviewController in tourRoutes which is not a good thing
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview,
//   );

// Here, we are saying that if server gets the below route simply use reviewRouter. This is called mounting. It is also done in 'app.js'
router.use('/:tourId/reviews', reviewRouter);

module.exports = router;
