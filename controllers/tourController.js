const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// 'fields' is used for handling more than one image.
exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1,
  },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // we use 'req.files' when there is more than one files
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Processing cover image
  // 'imageCover' is a field in schema which will be used to update database.
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Processing rest of images
  req.body.images = [];

  // 'Promise.all' will take a array of promises and wait until all of them are fulfilled.
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      // Here, 'file' is the argument from the map above.
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );
  next();
});

exports.aliasTopTours = async (req, res) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// 'next' is used in all of below route handlers because now they have become middleware. If there occurs any error it will propogate down until it reaches gloabl event handler in 'errorController'.
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // EXECUTE QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   // The above thing only works because we retun 'this' in each method and 'this' is the object itself which has access to each of these methods here, making it possible to chain them.

//   const tours = await features.query;

//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//   // Tour.findById(req.param.id) === Tour.findOne({ _id: req.param.id })
//   // 'populate' is used to replace the specified paths in the document with documents from other collections. It means that it will take data from one collection and send it to another with the use of ObjectID. In the below case we only have guides id and not their actual data but with the help of populate you can get all the data from users to tours.
//   // const tour = await Tour.findById(req.params.id).populate('guides');

//   // const tour = await Tour.findById(req.params.id).populate({
//   //   path: 'guides',
//   //   select: '-__v -passwordChangedAt', // '__v' and 'passwordChangedAt' will not appear in the output.
//   // });

//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   // This will only work for no found id. If the format is wrong meaning you have somewhat less or more number of characters in your id it will not work.
//   if (!tour) {
//     // We are returning here even though in express next with a argument skips everything and go to the last middleware but as we are using JS which will only finish the currently executing function
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

exports.filterTourData = (req, res, next) => {
  req.body.difficulty = req.body.difficulty.toLowerCase();
  next();
};

// exports.createTour = catchAsync(async (req, res, next) => {
//   // const newTour = new Tour({});
//   // newTour.save();

//   req.body.difficulty = req.body.difficulty.toLowerCase();
//   // It will return a promise which we are consuming using 'await'
//   // '.create' will create a new tour whose content will be 'req.body'
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   // arguments of the below functino. (id which has to be updated, what to update it with, options)
//   const newTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true, // will return the modified document not the original one
//     runValidators: true, // will run all the validators of the schema. Meaning that if someone pass a string to a field that only accepts a number it will give a error
//   });

//   if (!newTour) {
//     // We are returning here even though in express next with a argument skips everything and go to the last middleware but as we are using JS which will only finish the currently executing function
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     // We are returning here even though in express next with a argument skips everything and go to the last middleware but as we are using JS which will only finish the currently executing function
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

// Here, we are passing model(Tour). 'deleteOne' will return a function which was 'deleteTour' earlier.
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  // Aggreagation pipeline ->  is a mongodb feature but mongoose gives us access to it.
  // It means that every document which will be send back to the client will be processed through some stages known as pipeline which are mentioned in the form of array in the below 'aggregate' method.
  const stats = await Tour.aggregate([
    {
      // '$match' is used for selection of only a certain number of fields or one can say for filtering
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // It will group documents according to their difficulty meaning that all the below fields will be recalculated for each type of difficulty. '$toUpper' will convert the value of field difficulty to uppercase
        numTours: { $sum: 1 }, // As all the documents will go through this aggregate pipeline we simply added '1' for each document or tour in this case which will ultimately return the total number of tours.
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // sort in ascending order
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }, // It will remove all the documents that contain difficulty as 'EASY'
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // If there are more than one 'startDates' it will seperate them into their own documents.
    },
    {
      $match: {
        startDates: {
          // only get the dates of the current year(the one specified in the parameter)
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // '$month' will calculate month of the tour from the dates.
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' }, // adds a new field by the name of 'month' with the value of '_id'
    },
    {
      $project: {
        // helps in removal or addition of fields
        _id: 0, // 0 means field is removed and 1 means field is added. In this case it means that '_id' will not be shown.
      },
    },
    {
      $sort: {
        numTourStarts: -1, // sort in descending order
      },
    },
    {
      $limit: 12, // limit as the same as api feature
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// '/tours-within/:distance/center/:latlng/unit/:unit'
// /tours-within/233/center/41.648915, 91.279615/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // destructring
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // We are converting radius into radians because mongoDB expects radius in radians.
  // We are dividing the distance by radius of Earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please Provide latitude and longitude in the format (lat, lng)',
        400,
      ),
    );
  }

  // 'geoWithin' is a GEO operator. It finds documents within a certain geometry.
  // It is basically used when we want to select documents within a certain space in this case a sphere. So it will basically search in a sphere which have [lng, lat] as center and radius which is in radian
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format (lat, lng)',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      // 'geoNear' is geoSpatial aggregation pipeline
      // It needs to be the first pipeline in a aggregation pipeline. It means that if there is any pipeline in front of it, it will not work
      // 'geoNear' requiers that atleast one of our fields contains a geospatial index 'startLocation' in this case.
      // 'near' from where you calculate distance. Needs to be in the format of GeoJson.
      // It basically outputs documents in order of nearest to farthest from a specified point.
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // to convert meters into km
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
