let stripe, customer, price, card;
var newCID = 0;

let priceInfo = {
  basic: {
    amount: '2000',
    name: 'CA2-Comment',
    interval: 'monthly',
    currency: 'USD',
  }
};

function stripeElements(publishableKey) {
  stripe = Stripe(publishableKey);

  if (document.getElementById('card-element')) {
    let elements = stripe.elements();

    // Card Element styles
    let style = {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#a0aec0',
        },
      },
    };

    card = elements.create('card', {
      style: style
    });

    card.mount('#card-element');

    card.on('focus', function () {
      let el = document.getElementById('card-element-errors');
      el.classList.add('focused');
    });

    card.on('blur', function () {
      let el = document.getElementById('card-element-errors');
      el.classList.remove('focused');
    });

    card.on('change', function (event) {
      displayError(event);
    });
  }

  // https://q8lktd0l6l.execute-api.us-east-1.amazonaws.com/createNewStripeUser
  let paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      changeLoadingStatePrices(true);
      createCustomer().then((result) => {
        newCID = result.customer.id;
        // If a previous payment was attempted, get the lastest invoice
        const latestInvoicePaymentIntentStatus = localStorage.getItem(
          'latestInvoicePaymentIntentStatus'
        );
        console.log('invoice payment status :' + latestInvoicePaymentIntentStatus)

        if (latestInvoicePaymentIntentStatus === 'requires_payment_method') {
          const invoiceId = localStorage.getItem('latestInvoiceId');
          console.log('invoice id: ' + invoiceId)
          const isPaymentRetry = true;
          console.log("NEWCID " + newCID);
          // create new payment method & retry payment on invoice with new payment method
          createPaymentMethod({
            card,
            isPaymentRetry,
            invoiceId,
            newCID,
          });
        } else {
          // create new payment method & create subscription
          const invoiceId = localStorage.getItem('latestInvoiceId');
          console.log('invoice id: ' + invoiceId)
          console.log("NEWCID ELSE " + newCID);
          createPaymentMethod({
            card,
            invoiceId,
            newCID,
          });
        }
      });
    });
  }
}

function displayError(event) {
  changeLoadingStatePrices(false);
  let displayError = document.getElementById('card-element-errors');
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = '';
  }
}

function createPaymentMethod({
  card,
  isPaymentRetry,
  invoiceId,
  newCID
}) {
  const customerId = newCID;
  console.log("TEST CID2 " + newCID)
  console.log("CUSTOMER ID " + customerId)
  // Set up payment method for recurring usage
  let billingName = document.querySelector('#name').value;

  let priceId = document.getElementById('priceId').innerHTML.toUpperCase();

  stripe
    .createPaymentMethod({
      type: 'card',
      card: card,
      billing_details: {
        name: billingName,
      },
    })
    .then((result) => {
      console.log(result)
      if (result.error) {
        console.log(result.error)
        displayError(result);
      } else {
        if (isPaymentRetry) {
          // Update the payment method and retry invoice payment
          retryInvoiceWithNewPaymentMethod({
            customerId: customerId,
            paymentMethodId: result.paymentMethod.id,
            invoiceId: invoiceId,
            priceId: priceId,
          });
          console.log("IF " + result.paymentMethod.id)
        } else {
          // Create the subscription
          console.log("ELSE " + result.paymentMethod.id)
          console.log(priceId)
          console.log(customerId)
          createSubscription({
            customerId: customerId,
            paymentMethodId: result.paymentMethod.id,
            priceId: priceId,
          });
        }
      }
    });
}

function goToPaymentPage(priceId) {
  // Show the payment screen
  document.querySelector('#payment-form').classList.remove('hidden');

  document.getElementById('total-due-now').innerText = getFormattedAmount(
    priceInfo[priceId].amount
  );

  // Add the price selected
  document.getElementById('price-selected').innerHTML =
    '→ Subscribing to ' +
    '<span id="priceId" class="font-bold">' +
    priceInfo[priceId].name +
    '</span>';

  // Show which price the user selected
  if (priceId === 'premium') {
    document.querySelector('#submit-premium-button-text').innerText =
      'Selected';
    document.querySelector('#submit-basic-button-text').innerText = 'Select';
  } else {
    document.querySelector('#submit-premium-button-text').innerText = 'Select';
    document.querySelector('#submit-basic-button-text').innerText = 'Selected';
  }

  // Update the border to show which price is selected
  changePriceSelection(priceId);
}

function createCustomer() {
  // let billingEmail = document.querySelector('#email').value; CHANGE TO EMAIL FROM LOCAL STORAGE OR FIREBASE CURRENT USER
  var userEmail = localStorage.getItem('userEmail');
  console.log("signup works 2")
  return fetch('/create-customer', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
      }),
    })
    .then((response) => {
      return response.json();
    })
    .then((result) => {
      return result;
    });
}

function handleCustomerActionRequired({
  subscription,
  invoice,
  priceId,
  paymentMethodId,
  isRetry,
}) {
  if (subscription && subscription.status === 'active') {
    // subscription is active, no customer actions required.
    return {
      subscription,
      priceId,
      paymentMethodId
    };
  }

  // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
  // If it's a retry, the payment intent will be on the invoice itself.
  let paymentIntent = invoice ?
    invoice.payment_intent :
    subscription.latest_invoice.payment_intent;

  if (
    paymentIntent.status === 'requires_action' ||
    (isRetry === true && paymentIntent.status === 'requires_payment_method')
  ) {
    return stripe
      .confirmCardPayment(paymentIntent.client_secret, {
        payment_method: paymentMethodId,
      })
      .then((result) => {
        if (result.error) {
          // start code flow to handle updating the payment details
          // Display error message in your UI.
          // The card was declined (i.e. insufficient funds, card has expired, etc)
          throw result;
        } else {
          if (result.paymentIntent.status === 'succeeded') {
            // There's a risk of the customer closing the window before callback
            // execution. To handle this case, set up a webhook endpoint and
            // listen to invoice.payment_succeeded. This webhook endpoint
            // returns an Invoice.
            return {
              priceId: priceId,
              subscription: subscription,
              invoice: invoice,
              paymentMethodId: paymentMethodId,
            };
          }
        }
      });
  } else {
    // No customer action needed
    return {
      subscription,
      priceId,
      paymentMethodId
    };
  }
}

function handlePaymentMethodRequired({
  subscription,
  paymentMethodId,
  priceId,
}) {
  if (subscription.status === 'active') {
    // subscription is active, no customer actions required.
    return {
      subscription,
      priceId,
      paymentMethodId
    };
  } else if (
    subscription.latest_invoice.payment_intent.status ===
    'requires_payment_method'
  ) {
    // Using localStorage to store the state of the retry here
    // (feel free to replace with what you prefer)
    // Store the latest invoice ID and status
    localStorage.setItem('latestInvoiceId', subscription.latest_invoice.id);
    localStorage.setItem(
      'latestInvoicePaymentIntentStatus',
      subscription.latest_invoice.payment_intent.status
    );
    throw {
      error: {
        message: 'Your card was declined.'
      }
    };
  } else {
    return {
      subscription,
      priceId,
      paymentMethodId
    };
  }
}

function onSubscriptionComplete(result) {
  console.log(result);

  // Change your UI to show a success message to your customer.
  onSubscriptionSampleDemoComplete(result);
  // Call your backend to grant access to your service based on
  // the product your customer subscribed to.
  // Get the product by using result.subscription.price.product
}

function createSubscription({
  customerId,
  paymentMethodId,
  priceId
}) {
  return (
    fetch('/create-subscription', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customerId,
        paymentMethodId: paymentMethodId,
        priceId: priceId,
      }),
    })
    .then((response) => {
      return response.json();
    })
    // If the card is declined, display an error to the user.
    .then((result) => {
      if (result.error) {
        // The card had an error when trying to attach it to a customer
        throw result;
      }
      return result;
    })
    // Normalize the result to contain the object returned
    // by Stripe. Add the addional details we need.
    .then((result) => {
      return {
        // Use the Stripe 'object' property on the
        // returned result to understand what object is returned.
        subscription: result,
        paymentMethodId: paymentMethodId,
        priceId: priceId,
      };
    })
    // Some payment methods require a customer to do additional
    // authentication with their financial institution.
    // Eg: 2FA for cards.
    .then(handleCustomerActionRequired)
    // If attaching this card to a Customer object succeeds,
    // but attempts to charge the customer fail. You will
    // get a requires_payment_method error.
    .then(handlePaymentMethodRequired)
    // No more actions required. Provision your service for the user.
    .then(onSubscriptionComplete)
    .catch((error) => {
      // An error has happened. Display the failure to the user here.
      // We utilize the HTML element we created.
      displayError(error);
    })
  );
}

function retryInvoiceWithNewPaymentMethod({
  customerId,
  paymentMethodId,
  invoiceId,
  priceId,
}) {
  return (
    fetch('/retry-invoice', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customerId,
        paymentMethodId: paymentMethodId,
        invoiceId: invoiceId,
      }),
    })
    .then((response) => {
      return response.json();
    })
    // If the card is declined, display an error to the user.
    .then((result) => {
      if (result.error) {
        // The card had an error when trying to attach it to a customer
        throw result;
      }
      return result;
    })
    // Normalize the result to contain the object returned
    // by Stripe. Add the addional details we need.
    .then((result) => {
      return {
        // Use the Stripe 'object' property on the
        // returned result to understand what object is returned.
        invoice: result,
        paymentMethodId: paymentMethodId,
        priceId: priceId,
        isRetry: true,
      };
    })
    // Some payment methods require a customer to be on session
    // to complete the payment process. Check the status of the
    // payment intent to handle these actions.
    .then(handleCustomerActionRequired)
    // No more actions required. Provision your service for the user.
    .then(onSubscriptionComplete)
    .catch((error) => {
      // An error has happened. Display the failure to the user here.
      // We utilize the HTML element we created.
      displayError(error);
    })
  );
}

function retrieveUpcomingInvoice(customerId, subscriptionId, newPriceId) {
  return fetch('/retrieve-upcoming-invoice', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customerId,
        subscriptionId: subscriptionId,
        newPriceId: newPriceId,
      }),
    })
    .then((response) => {
      return response.json();
    })
    .then((invoice) => {
      return invoice;
    });
}

function retrieveCustomerPaymentMethod(paymentMethodId) {
  return fetch('/retrieve-customer-payment-method', {
      method: 'post',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId: paymentMethodId,
      }),
    })
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      return response;
    });
}

function getConfig() {
  return fetch('/config', {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      // Set up Stripe Elements
      stripeElements(response.publishableKey);
    });
}

getConfig();

/* ------ Sample helpers ------- */

function getFormattedAmount(amount) {
  // Format price details and detect zero decimal currencies
  var amount = amount;
  var numberFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'symbol',
  });
  var parts = numberFormat.formatToParts(amount);
  var zeroDecimalCurrency = true;
  for (var part of parts) {
    if (part.type === 'decimal') {
      zeroDecimalCurrency = false;
    }
  }
  amount = zeroDecimalCurrency ? amount : amount / 100;
  var formattedAmount = numberFormat.format(amount);

  return formattedAmount;
}

function capitalizeFirstLetter(string) {
  let tempString = string.toLowerCase();
  return tempString.charAt(0).toUpperCase() + tempString.slice(1);
}

function getDateStringFromUnixTimestamp(date) {
  let nextPaymentAttemptDate = new Date(date * 1000);
  let day = nextPaymentAttemptDate.getDate();
  let month = nextPaymentAttemptDate.getMonth() + 1;
  let year = nextPaymentAttemptDate.getFullYear();

  return month + '/' + day + '/' + year;
}


// For demo purpose only
function getCustomersPaymentMethod() {
  let params = new URLSearchParams(document.location.search.substring(1));

  let paymentMethodId = params.get('paymentMethodId');
  if (paymentMethodId) {
    retrieveCustomerPaymentMethod(paymentMethodId).then(function (response) {
      document.getElementById('credit-card-last-four').innerText =
        capitalizeFirstLetter(response.card.brand) +
        ' •••• ' +
        response.card.last4;

      document.getElementById(
        'subscribed-price'
      ).innerText = capitalizeFirstLetter(params.get('priceId'));
    });
  }
}

getCustomersPaymentMethod();

// Shows the cancellation response
function subscriptionCancelled() {
  document.querySelector('#subscription-cancelled').classList.remove('hidden');
  document.querySelector('#subscription-settings').classList.add('hidden');
}

/* Shows a success / error message when the payment is complete */
function onSubscriptionSampleDemoComplete({
  priceId: priceId,
  subscription: subscription,
  paymentMethodId: paymentMethodId,
  invoice: invoice,
}) {
  let subscriptionId;
  let currentPeriodEnd;
  let customerId;
  let payment_intent;

  payment_intent = subscription.latest_invoice.payment_intent.id

  if (subscription) {
    subscriptionId = subscription.id;
    currentPeriodEnd = subscription.current_period_end;
    if (typeof subscription.customer === 'object') {
      customerId = subscription.customer.id;
    } else {
      customerId = subscription.customer;
    }
  } else {
    const params = new URLSearchParams(document.location.search.substring(1));
    subscriptionId = invoice.subscription;
    currentPeriodEnd = params.get('currentPeriodEnd');
    customerId = invoice.customer;
  }
  var userEmail = localStorage.getItem('userEmail');
  var body = {
    "email": userEmail,
    "customerId": customerId,
    "priceId": priceId,
    "paymentMethodId": paymentMethodId,
    "subscriptionId": subscriptionId,
    "currentPeriodEnd": currentPeriodEnd,
    "paymentIntentId": payment_intent
  }
  console.log(body)
  // Insert into DynamoDb newly created subscription
  $.ajax({
    url: 'https://qvk57e7h9a.execute-api.us-east-1.amazonaws.com/v1/createnewuser',
    type: 'POST',
    contentType: "application/json",
    crossDomain: true,
    dataType: "json",
    data: JSON.stringify(body),
    success: function (data, status, xhr) {
      console.log("Inserted to Dynamo")
      $.ajax({
        url: 'http://localhost:8085/setUserIsPaidUser',
        type: 'POST',
        success: function (data, status, xhr) {
          console.log("Set custom claims true")
          window.location.href =
            '/talents.html';
        }
      });
    }
  });
}

function demoChangePrice() {
  document.querySelector('#basic').classList.remove('border-pasha');
  document.querySelector('#premium').classList.remove('border-pasha');
  document.querySelector('#price-change-form').classList.add('hidden');

  const params = new URLSearchParams(document.location.search.substring(1));
  const priceId = params.get('priceId').toLowerCase();

  // Show the change price screen
  document.querySelector('#prices-form').classList.remove('hidden');
  document
    .querySelector('#' + priceId.toLowerCase())
    .classList.add('border-pasha');

  let elements = document.querySelectorAll(
    '#submit-' + priceId + '-button-text'
  );
  for (let i = 0; i < elements.length; i++) {
    elements[0].childNodes[3].innerText = 'Current';
  }
  if (priceId === 'premium') {
    document.getElementById('submit-premium').disabled = true;
    document.getElementById('submit-basic').disabled = false;
  } else {
    document.getElementById('submit-premium').disabled = false;
    document.getElementById('submit-basic').disabled = true;
  }
}

// Changes the price selected
function changePriceSelection(priceId) {
  document.querySelector('#basic').classList.remove('border-pasha');
  document.querySelector('#premium').classList.remove('border-pasha');
  document
    .querySelector('#' + priceId.toLowerCase())
    .classList.add('border-pasha');
}

// Show a spinner on subscription submission
function changeLoadingState(isLoading) {
  if (isLoading) {
    document.querySelector('#button-text').classList.add('hidden');
    document.querySelector('#loading').classList.remove('hidden');
    document.querySelector('#signup-form button').disabled = true;
  } else {
    document.querySelector('#button-text').classList.remove('hidden');
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#signup-form button').disabled = false;
  }
}

// Show a spinner on subscription submission
function changeLoadingStatePrices(isLoading) {
  console.log(isLoading);
  if (isLoading) {
    document.querySelector('#button-text').classList.add('hidden');
    document.querySelector('#loading').classList.remove('hidden');

    document.querySelector('#submit-basic').classList.add('invisible');
    document.querySelector('#submit-premium').classList.add('invisible');
    if (document.getElementById('confirm-price-change-cancel')) {
      document
        .getElementById('confirm-price-change-cancel')
        .classList.add('invisible');
    }
  } else {
    document.querySelector('#button-text').classList.remove('hidden');
    document.querySelector('#loading').classList.add('hidden');

    document.querySelector('#submit-basic').classList.remove('invisible');
    document.querySelector('#submit-premium').classList.remove('invisible');
    if (document.getElementById('confirm-price-change-cancel')) {
      document
        .getElementById('confirm-price-change-cancel')
        .classList.remove('invisible');
      document
        .getElementById('confirm-price-change-submit')
        .classList.remove('invisible');
    }
  }
}
