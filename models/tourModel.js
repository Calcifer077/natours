const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');
const User = require('./userModel');

// Validators: is a simple function that returns true or false if the input value is correct or not. can be both inbuilt or user defined
// requried, maxlength(only for string), minlength(only for string), min(for number and date), max(for number and date), enum(only for strings)
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // It is required otherwise it will give a error.
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'A tour name must only contain characters'],
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is not correct!',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, // If no value is provided it will take the default value of '4.5'
      min: [1, 'Rating must be above than 1.0'],
      max: [5, 'Rating must be less than 5.0'],
      set: (val) => Math.round(val * 10) / 10, // this is a setter function. It will be run every time a new value is set in this field.
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      // below function has access to the value that is inputted in this particular field
      validate: {
        validator: function (val) {
          // works only when creating a new document not when updating one
          return val < this.price;
        }, // the 'VALUE' mentioned below is the same as in the validator function.
        message: 'Discount price {{VALUE}} should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true, // removes all the white spaces from the end and the begining
      requied: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], // an array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // It will not be shown to the client
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // GeoJSON
    // The below field is a special type of field in schema. Like above we have schema type option with every field but in case of GeoJson we have schema type option as a sub-field.
    // For it to be recognized as GeoJSON we need two properties. 'type' and 'coordinates'
    startLocation: {
      // GEOJSON
      type: {
        type: String,
        default: 'Point',
        // 'enum' means that it can only take 'Point' not anythikng else.
        enum: ['Point'],
      },
      coordinates: [Number], // It means that it will accept an array of numbers with longitude first and than latitude.
      address: String,
      description: String,
    },
    // Below is a method to create embedded documents. We are using a array below.
    // By specifying an array of objects this will then create brand new documents inside of the parent document, which in this case is tour.
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // child referencing
    guides: [
      {
        // Here, type is mongoDb ID
        type: mongoose.Schema.ObjectId,
        // Below line will create a reference with 'User' because it will be contained in the ID.
        ref: 'User',
      },
    ],
  },
  {
    // Below two are options that say that when the data is outputted in the form of JSON or object virtuals should be visible.
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

// Here, we are setting 'price' as a index. It means that there will be a seperate field of prices in case we need to apply filters based on price. It will be stored in ascnding order as given by '1'
// You don't set the indexes on all the fields but only on the one which are more frequently used
// You create indexes by passing an object inside it. You can even add options to it by passing another object seperated by commas.
// tourSchema.index({ price: 1 });

// This is comppound index. Meaning making two indexes at one.
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// Because we are using earth dimensions
tourSchema.index({ startLocation: '2dsphere' });

// virtual properties are the one that are not saved to the database but are calculated at real time.
// can't use virtual properties in a query because they are not really part of the schema.
tourSchema.virtual('durationWeeks').get(function () {
  // Here, 'this' points to the current document.
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review', // model that we want to reference
  foreignField: 'tour', // name of the field in the other model(Review model) where the referenc to the current model is stored. In 'reviewModel' we have a field called 'tour' which contains tour ID.
  localField: '_id', // where the ID mentioned above is stored in the current model.
});

// mongoose middleware
// also known as pre and post hooks because you can define whether the function should run before or after a certain event.
// Four types of middleware in mongoose
// 1. Document middleware -> which is the middleware that can act on the currently processed document.
// 2. Query middleware -> allows us to run function before or after a certain query is executed.
// 3. Aggregate middleware
// 4. Model middleware

// DOCUMENT MIDDLEWARE -> runs before .save() and .create(). 'this' points to the current document
// You can have multiple pre and post middleware

// This callback function will be called before 'save' event.
tourSchema.pre('save', function (next) {
  // presave hook
  this.slug = slugify(this.name, {
    lower: true,
  });
  next();
});

// Drawback of embedding in the below case is that if a guide were to update its data it will not work so we will use child refrencing.
// tourSchema.pre('save', async function (next) {
//   // Below code will create whole new documents inside another document which is known as embedding.

//   // As the 'map' method have async inside it, it will create a array full of promises.
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   // 'Promise.all' takes input a set of promises and return a single fulfilled promise.
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save documents...');
//   next();
// });
//
// // post middleware are executed after all the pre middleware function have finished their execution.
// // In case of post middleware we don't get the 'this' keyword but instead get the processed document.
// tourSchema.post('save', function (doc, next) {
//   // postsave hook
//   // Here, 'doc' is the document that is just processed
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE --> 'this' points to the current query
// tourSchema.pre('find', function (next) {
// The below line means that the callback function will work for all the methods that start with 'find' like 'find', 'findOne', 'findOneAndDelete' etc.
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

// 'docs' all the documents currently processed.
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE --> 'this' points to the current aggregation object
// tourSchema.pre('aggregate', function (next) {
//   // 'this.pipeline()' gives the array of the aggregation pipeline

//   // 'unshift' is used to insert in front of array
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   // console.log(this.pipeline());
//   next();
// });

// mongoose.model is used to create a collection of a particular database.
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
