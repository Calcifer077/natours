const express = require('express');
// const multer = require('multer'); // used for handling multi-form data like images.
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

// It tells where multer will store the images uploaded by user.
// const upload = multer({ dest: 'public/img/users' });

const router = express.Router();
 
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// To protect all routes below this.
// As middleware works in sequence this middleware will be applied to all the middleware that are below it.
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

// Here, 'upload.single('photo')' is a multer function to upload single image. 'photo' is a field in database. It will take the file and store in the location that we specified and then the rest of the handler will work the same. It will also add some property of the file uploaded on the 'req' object.
// router.patch('/updateMe', upload.single('photo'), userController.updateMe);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

// Mounting
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
