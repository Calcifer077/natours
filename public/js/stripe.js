/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alert';

// // The npm package of 'stripe' can be only used on the backend. To use it on the frontend you have to add a script in the head of HTML which is added in tour.pug

const stripe = Stripe(
  'pk_test_51PmJCUIHrReNnCcrw3jPHfa0XD5Kg3Fqw8r6VjXTczrBsoltu5tuZov2Py5ejmcvu7jD0nrWJfP5jRngoP7ErlI4009HRa97Rs',
);

export const bookTour = async (tourId) => {
  try {
    // 1. Get checkout session from endpoint
    const session = await axios(
      // `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
      `/api/v1/bookings/checkout-session/${tourId}`,
    );

    // console.log(session);
    // 2. Create checkout form + process charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
