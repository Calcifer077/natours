const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

// creates a token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// gets a token and sends reponse
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // cookie -> a cookie is basically a small piece of text that a server can send to clients. Then when the client receives a cookie, it will automatically store it and then automatically send it back along with all future requests to the same server. A browser automatically stores a cookie that it receives and sends it back in all future requests to that server where it came from.

  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // secure: true, // only in production
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOption.secure = true;

  // There will be a cookie in the response object.
  res.cookie('jwt', token, cookieOption);

  //  Remove password from output
  user.password = undefined;

  // Below we are sending the token as just a plain string which is not safe.
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Below function is used to create a new user and grant him a token to access app
exports.signup = catchAsync(async (req, res, next) => {
  // In the below case we are getting user data from the 'req.body' as it is. In this way anyone can get role of 'admin'.
  // const newUser = await User.create(req.body);

  // In the below code we only get the data we need and don't take what we don't need.
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  // arguments in the below function -> payload, secret key, token header(created automatically)
  // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  //   expiresIn: process.env.JWT_EXPIRES_IN,
  // });

  // const token = signToken(newUser._id);

  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });

  // const url = 'http://127.0.0.1:3000/me';
  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

// The concept of a user logging in basically means to sign up a JSON web token and send it back to the client.
// How JWT works here? Everytime a user logs in or creates a new account a token is created specillay for that user. A user can only sign in using that token. If the token is not correct or has expired user will not be able to login and have to create  a new token.

// Below function is used to log in the user by giving him a token which he can use to access different things in the server.
exports.login = catchAsync(async (req, res, next) => {
  // const email = req.body.email;
  // const password = req.body.password;
  const { email, password } = req.body;

  // 1. Check if email and password exist (meaning that user has provided them or not)
  if (!email || !password) {
    // we are returning here so that this function finishes right away
    return next(new AppError('Please provide email and password!', 404));
  }

  // 2. Check if user exists and password is correct(entered user email exits and password is correct)

  // As we have 'select'(meaning that it will not be displayed in the response) the password field in the userModel so, we will not get password field. We are including it explicitly using '+'.
  const user = await User.findOne({ email: email }).select('+password');

  // password -> the one we get from the 'req.body'
  // user.password -> the one we get from the database.
  // as 'correctPassword' is a async function this will also be awaited
  // 'correctPassword' returns boolean if two passwords are equal or not.
  if (!user || !(await user.correctPassword(password, user.password))) {
    // 401 -> unauthorized
    return next(new AppError('Incorrect email or password!', 401));
  }

  // 3. If everything ok, send token to client
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });

  createSendToken(user, 200, res);
});

// What we are doing here to log out the user is send another cookie with the same name as 'jwt' but without the token
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// Below function is used to check if the current user is allowed to access certain resources or not
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Getting token and check if its there
  let token;

  // HTTP authorization header is used to authenticate a user.
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // 2. Validate token (Verification)
  // verify -> used for verification. will create test signature. The callback function mentioned below will run after the verification has been complete.
  // 'promisify' will create the below function into a promise. So, it will return a promise.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  // 3. Check if user still exist
  // It checks if in between the above verification and running of below code somehow the user no longer exist(deleted).
  const currentUser = await User.findById(decoded.id);
  // console.log(currentUser);

  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist',
        401,
      ),
    );
  }

  // 4. Check if user changed password after token was issued
  // 'iat' -> issued at
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  // 1. Getting token and check if its there
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      // 'res.locals' is used variables for the pug templates. In the below line we have set a variable named 'user' which will be avaialable in the templates.
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// You can't pass aguments to a middleware so we are using the below method.
// 'roles' is the array of arguments passed to the middleware which will be available in the middleware.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // 'roles' is a array which is available here due to closure.
    // this 'req.user' was created in previous middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      ); // 403 -> forbidden
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address.', 404));
  }

  // 2. Generate the random token
  const resetToken = user.createPasswordResetToken();

  // 'validateBeforeSave' will turn off the validators
  // we are turning off the validators here because in this case we will only provide email and not anything else which will create a lot of errors.
  await user.save({ validateBeforeSave: false });

  // 3. Send it to User's email
  // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forgot your password. please ignore this email!`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token(Valid for 10 min)',
    //   message,
    // });
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later'),
      500,
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. If token has not expired, and there is user, set the new password
  // if there is no token has expired 'user' will be undefined
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 3. Update changedPasswordAt  property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4. Log the user in, send JWT
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2. Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3. If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will not work here because middleware are pre save hooks and validators also work for save and create not update.

  // 4. Log new user in, send JWT
  createSendToken(user, 200, res);
});
