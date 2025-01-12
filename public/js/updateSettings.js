// update data
/* elsint-disable */

import axios from 'axios';
import { showAlert } from './alert';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    // const url =
    //   type === 'password'
    //     ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
    //     : 'http://127.0.0.1:3000/api/v1/users/updateMe';
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH', // This is the method that will be used for a particular http request
      url, // this is the route that will be hit for that http request
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
