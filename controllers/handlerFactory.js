const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// The below function will recieve a model and return a function that performs all the work. This works because of closures.
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      // We are returning here even though in express next with a argument skips everything and go to the last middleware but as we are using JS which will only finish the currently executing function
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // arguments of the below functino. (id which has to be updated, what to update it with, options)
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // will return the modified document not the original one
      runValidators: true, // will run all the validators of the schema. Meaning that if someone pass a string to a field that only accepts a number it will give a error
    });

    if (!doc) {
      // We are returning here even though in express next with a argument skips everything and go to the last middleware but as we are using JS which will only finish the currently executing function
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // const newTour = new Tour({});
    // newTour.save();

    // It will return a promise which we are consuming using 'await'
    // '.create' will create a new tour whose content will be 'req.body'
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query.populate(populateOptions);
    const doc = await query;

    // This will only work for no found id. If the format is wrong meaning you have somewhat less or more number of characters in your id it will not work.
    if (!doc) {
      // We are returning here even though in express next with a argument skips everything and go to the last middleware but as we are using JS which will only finish the currently executing function
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // The above thing only works because we retun 'this' in each method and 'this' is the object itself which has access to each of these methods here, making it possible to chain them.

    // 'explain' will explain about the query
    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
