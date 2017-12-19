const admin = require('firebase-admin')
const datastore = require('@google-cloud/datastore')()
const runtimeVariable = require('./getVariable.js')
var stripe

const stripeKey = 'stripeKey'
const deployment = process.env.FUNCTION_NAME.split('-')[0]
const environment = process.env.FUNCTION_NAME.split('-')[2]

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://' + process.env.GCP_PROJECT + '.firebaseio.com'
});

exports.stripeWebhookPaidOrder = function stripeWebhookPaidOrder(req, res) {

  req.key = stripeKey
  req.deployment = deployment

  runtimeVariable.get(req)
  .then(registerStripe)
  .then(getStripeEvent)
  .then(checkIfEventIsForAnOrder)
  .then(getUserID)
  .then(updateOrderObject)
  .then(function(request) {
    console.log(request);
    res.sendStatus(200)
  })
  .catch(function(error) {
    console.error(error)
    switch (error) {
      case 'It aint fucking here nigga' :
        return res.sendStatus(404)
      case 'It aint a fucking string nigga' :
        return res.sendStatus(404)
      default:
        return res.sendStatus(500)
    }
  })
}

var registerStripe = function(request) {
  stripe = require("stripe")(request[stripeKey])
  return Promise.resolve(request)
}

var getStripeEvent = function(request) {
  return stripe.events.retrieve(request.body.id)
  .then(function(event) {
    return Promise.resolve(event)
  })
  .catch(function(error) {
    return Promise.reject(error)
  })
}

var checkIfEventIsForAnOrder = function(event) {
  if (event.data.object.object == 'order') {
      return Promise.resolve(event)
    } else {
      return Promise.reject('Error: Incorrect event type')
    }
}

var getUserID = function(event) {
  const query = datastore.createQuery('user').select('__key__').filter('customerID', '=', event.data.object.customer).limit(2)
  return datastore.runQuery(query).then((results) => {
    if (results[0][0] === undefined) {
      return Promise.reject('It aint fucking here nigga')
    } else {
      if (typeof results[0][0][datastore.KEY].name == 'string') {
        event.userID = results[0][0][datastore.KEY].name
        return Promise.resolve(event)
      } else {
        return Promise.reject('It aint a fucking string nigga')
      }
    }
  })
}

var updateOrderObject = function(event) {

  const status = {status: event.data.object.status}
  
  return admin.database().ref().child('orders').child(event.userID).child(event.data.object.id).update(receipt).then(function() {
    return Promise.resolve(event)
  }).catch(function(error) {
    return Promise.reject(error)
  })
}
