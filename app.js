// Everything unrelated to express should not be done in app.js

const path = require('path');
const express = require('express');
const morgan = require('morgan'); // is a middleware
const rateLimit = require('express-rate-limit'); // for rate limiting to prevent brute force and denial of service attack
const helmet = require('helmet'); // setting http headers
const mongoSanitize = require('express-mongo-sanitize'); // for NoSql query infection attacks
const xss = require('xss-clean'); // for XSS attack
const hpp = require('hpp'); // hpp -> http parameter pollution
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// It will add various methods related to 'express' to 'app'.
const app = express();

// tells express about the template engine we are using
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
// middleware => it can modify the incoming request data. Will be used in post request

// For serving static files
// When you try to access this url using browser don't use 'public' in url as it will act as the root directory and '127.0.0.1:3000' will act the same as '127.0.0.1:3000/public'
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP headers
app.use(helmet());
// app.use(helmet({ contentSecurityPolicy: false }));
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'", 'data:', 'blob:'],

//       baseUri: ["'self'"],

//       fontSrc: ["'self'", 'https:', 'data:'],

//       scriptSrc: ["'self'", 'https://*.cloudflare.com'],

//       scriptSrc: ["'self'", 'https://*.stripe.com'],

//       scriptSrc: ["'self'", 'http:', 'https://*.mapbox.com', 'data:'],

//       frameSrc: ["'self'", 'https://*.stripe.com'],

//       objectSrc: ["'none'"],

//       styleSrc: ["'self'", 'https:', 'unsafe-inline'],

//       workerSrc: ["'self'", 'data:', 'blob:'],

//       childSrc: ["'self'", 'blob:'],

//       imgSrc: ["'self'", 'data:', 'blob:'],

//       // connectSrc: ["'self'", 'blob:', 'https://*.mapbox.com'],

//       upgradeInsecureRequests: [],
//     },
//   }),
// );

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        scriptSrc: [
          "'self'",
          'https:',
          'http:',
          'blob:',
          'https://*.mapbox.com',
          'https://js.stripe.com',
          'https://*.cloudflare.com',
        ],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        objectSrc: ['none'],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        workerSrc: ["'self'", 'data:', 'blob:'],
        childSrc: ["'self'", 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: [
          "'self'",
          'blob:',
          'wss:',
          'https://*.tiles.mapbox.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
        ],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

// Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/// Limit requests from same IP address
// How many requests are allowed from a particular IP address.
// Below will allow 100 requests in 1 hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  // If the limit is breached below message will be printed.
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter);

// Body parser, reading data from body into req.body
// Here, 'express.json' is added to middleware
// Below we are limiting the amount of data to be read from req.body. If it exceeds 10kb it will not work.
app.use(
  express.json({
    limit: '10kb',
  }),
);

// Used to read data from HTML forms when submitted using POST request.
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Below middleware is used to parse the data from the cookie
app.use(cookieParser());

/// Data sanitization -> to clean all the code that comes into the application from malicious code
// Data sanitizztion against NoSQL query injection

// Below middleware will look at the request body, the request query string and also at request.params, and then it will filter out all of the dollar sign and dots.
app.use(mongoSanitize()); // it will return a middleware function

// Data sanitization against cross-site scripting(XSS) attacks

// Below will clean user input from any malicious HTML code.
app.use(xss());

// prevent parameter pollution
// Below middleware comes into use when we have many parameters in the query.
// For example there are two parameters for sort 'duration' and 'price'. It will give a error. But if you use the below middleware it will sort according to the later 'price' in this case.
// But what if you want to have more than one parameter than you can add them to whitelist so that they will be ignored.
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// This is used to compress responses we send to clients.
app.use(compression());

// The below middleware applies to each request because we didn't specify any url.
// If you were to place this middleware after any route handler it will no be use in the route handler that is above it.
// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next(); // this is neccessary for creating middleware
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // Below gives us the req.headers which are used in authControllers
  // console.log(req.cookies);

  next();
});

///////////////////////////////////////////////////////////

// Routes

// It will render our website on the browser. 'base' is pug file.
// Here, we are passing data that can be used in the pug file. We pass them as a object. These variables or data will be called locals in the Pug file
// app.get('/', (req, res) => {
//   res.status(200).render('base', {
//     tour: 'The Park Camper',
//     user: 'Mahesh',
//   });
// });

// app.get('/overview', (req, res) => {
//   res.status(200).render('overview', {
//     title: 'ALl Tours',
//   });
// });

// app.get('/tour', (req, res) => {
//   res.status(200).render('tour', {
//     title: 'The Forest Hiker tour',
//   });
// });

// get to get a tour
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// post to create a new tour
// app.post('/api/v1/tours', createTour);
// modify a part
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// Mounting

// This is middleware. When any request hit the server one of the below two functions will be called.
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Error handling

// Error handling for wrong url
// The below middleware is used when we get a request which is not defined in our app. As the middleware depends on how they are writtern in the code. So, if a request passes the above two it will mean that no url was found for the request.
// 'all' will run for all the http methods(get, post, patch etc)
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server`, // 'req.originalUrl' is used to get the url as it was recieved.
  // });

  // creating a new error manually. Setting its status and statusCode.
  // const err = new Error(`Can't find ${req.originalUrl} on this server.`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // We usually don't pass anything to 'next' but if we pass anything to 'next' express will automatically send this to the error handling middleware skiping all the middleware in between.
  // next(err);

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
// Any middleware with four arguments is a error handling middleware. This middleware will only be called when there's an error.
// Order of arguments -> error, request, response, next
// app.use((err, req, res, next) => {
//   console.log(err.stack); // where the error started.

//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || 'error';

//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message,
//   });
//   next();
// });

// this is refactoring the above code in a seperate file
app.use(globalErrorHandler);

// Starting a server
module.exports = app;
