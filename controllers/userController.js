const multer = require('multer');
// 'sharp' is a image processing library for nodejs
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// We use the following when we want to store files to disk, but we are processing uploaded files in a function below so it will be best to store it in memory or buffer
// const multerStorage = multer.diskStorage({
//   // Order of arguments for below: 'req object', 'file that is uploaded', 'a callback function which is similar to next in express but it doesn't come from express'
//   destination: (req, file, cb) => {
//     // Arguments in below: 'any error otherwise null', 'actual destination to store image'
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-userID-timestamp.jpeg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// This is for storing image in buffer.
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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // It returns a promise.
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  // 'Object.keys' returns a array of key values of any object.
  // Then we used 'forEach' to check if the object contains keys from 'allowedFields'. If it does create a new object that have only the allowedfields.
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const users = await User.find();

//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users,
//     },
//   });
// });

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// This is for the user to update its information
exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file); // tells about the file uploaded
  // console.log(req.body);
  // 1. Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use  /updateMyPassword.',
        400,
      ),
    );
  }

  // 2. Filter out unwanted fields names that are not allowed to be updated

  // we are using 'filteredBody' instead of 'req.body' because then the user can even pass things like 'role' which is not allowed.
  const filteredBody = filterObj(req.body, 'name', 'email');

  // This is for storing photo name to the databse.
  if (req.file) filteredBody.photo = req.file.filename;

  // 3. Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  // 204 -> deleted
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: ' error',
    message: 'This route is notdefined! Please use /signUp instead',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

// Do NOT update passwords with this
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
