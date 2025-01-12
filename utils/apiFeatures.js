class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1. filtering
    // 127.0.0.1:3000/api/v1/tours?duration=5&difficulty=easy
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];

    // We are using forEach here because we don't want a new array.
    excludeFields.forEach((el) => delete queryObj[el]);

    // 2. Advanced filtering
    // 127.0.0.1:3000/api/v1/tours?duration[gte]=5&difficulty=easy&price[lt]=1500
    let queryStr = JSON.stringify(queryObj);
    // console.log(JSON.parse(queryStr));

    // What the below line does:
    // It converts the 'req.query' into a format so that we can apply operators on it.
    // { duration : { gte: '5'}, difficulty: 'easy'}
    // { duration: { '$gte': '5'}, difficulty: 'easy'}
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    // 'this' is simply the entire object.
    // console.log(this.query);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // split() will return a array
      // Here, 'req.query.sort' is a key
      const sortBy = this.queryString.sort.split(',').join(' ');

      // This is what does the sorting
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');

      // This is what does the projection
      this.query = this.query.select(fields);
    } else {
      // removing '__v' from the response.
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    // page=2&limit=10 -> page 1 to 10 is on page 1 and page 11 to 20 are on page 2 and we have to display page 2
    // skip first 10 page and limit is of 10.
    // query = query.skip(10).limit(10);

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
