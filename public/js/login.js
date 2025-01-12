// We are disabling 'eslint' here because we have configured eslint for nodejs and not for js. So it will give us an error

/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  // 'axios' is used to send http requests from the client side. It will give error if there is any error in the input or from the result of api request.

  try {
    const res = await axios({
      method: 'POST',
      // url: 'http://127.0.0.1:3000/api/v1/users/login',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');

      // Below is used to set a timer. It will go to the homepage '/' afte 1.5 seconds which is done by 'location.assign'
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      // url: 'http://127.0.0.1:3000/api/v1/users/logout',
      url: '/api/v1/users/logout',
    });

    // 'location.reload(true)' in this case will force the page to reload not from the browser side but from the server side.
    if ((res.data.status = 'success')) location.reload(true);
  } catch (err) {
    console.log(err);
    showAlert('error', 'Error logging out! Try again.');
  }
};
