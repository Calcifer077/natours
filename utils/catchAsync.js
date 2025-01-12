// You can put this error handler in the tourRoutes instead of tourController but this way you have to remember which function is async or not.

// This function will get the whole async function as an argument.
module.exports = (fn) => {
  // Below line returns the promise.
  return (req, res, next) => {
    // Below line calls that async function or runs it.
    // It returns a promise. If a promise is rejected it will go to the catch block. In the catch block we have sent the error to the global event handler as next contains a argument.
    fn(req, res, next).catch((err) => next(err));
  };
};
