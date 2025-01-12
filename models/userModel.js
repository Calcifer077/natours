const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'A user must have a email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // It will not be displayed in the response.
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // validator only returns true or false. If it returns true meaning that validation done
      // This only works on save or create
      validator: function (el) {
        return el === this.password;
      },
      // error message in case above validation fails
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // Only run this function if password is modified
  if (!this.isModified('password')) return next(); // Run only if the password has been modified

  // Don't run the below line when importing data from json if the password is already encrypted.
  // Hash the password with cost of 10
  // this.password = await bcrypt.hash(this.password, 10);

  // Delete passwordConfirm field
  // deleting 'passwordConfirm'. Even though 'passwordConfirm' is a required field. It means that it is a required input not required to be persisted in the database.
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;

  next();
});

// query middleware
// /^find/ means all the expressions that starts with find like findAndUpdate, findAndDelete
userSchema.pre('find', function (next) {
  // this points to current query

  // below will make sure that only those user will be outputed in which the below condition is satisfied which is that active should not be equal to false.
  this.find({ active: { $ne: false } });

  next();
});

// Instance method -> is a method that is gonna be available on all documents of a certain collection.
// 'this' points to the current document
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // candidatePassword -> is the one to whom which we have to compare
  // userPassword -> what the user entered

  // As the password stored in the database is encrypted. 'candidatePassword' in this case. That's why we are using 'bcrypt' for the comparison.
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // 'getTime' is used to convert a date to miilliseconds. Divided by 1000 to get seconds
    // 'parseInt' converts to Integer and 10(decimal) is weight.
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // console.log(changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // will create a random string. This string is sent to the user for password reseting
  const resetToken = crypto.randomBytes(32).toString('hex');

  // will create a random string. This is a encoded form of the above string. We are encoding it because we will save it in the database.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
