const google = require('googleapis');
var deploymentManager = google.deploymentmanager('v2');

exports.get = function (request) {
      return getAuth(request)
      .then(createScope)
      .then(getKey)
      .then(function(authObject) {
        
        return Promise.resolve(authObject.request)
      })
      .catch(function(error) {
        return Promise.reject(error)
      })
}

var getAuth = function(request) {

  return new Promise((resolve, reject) => {
    google.auth.getApplicationDefault(function(err, authClient, projectId) {
      if (err) {
        reject(err)
      } else {
        var authObject = {
          authClient: authClient,
          projectId: projectId,
          request: request
        }
        resolve(authObject)
      }
    })
  })

}

var createScope = function(authObject) {
  if (authObject.authClient.createScopedRequired && authObject.authClient.createScopedRequired()) {
          authObject.authClient = authObject.authClient.createScoped([
            'https://www.googleapis.com/auth/cloud-platform'
          ]);
  }
  return Promise.resolve(authObject)
}

var getKey = function(authObject) {
  return new Promise((resolve, reject) => {
    deploymentManager.resources.get({
      project: (process.env.GCP_PROJECT || authObject.projectId),
      deployment: authObject.request.deployment,
      resource_: authObject.request.key,
      auth: authObject.authClient
    }, function(err, response) {
      if (err) {
          return reject(err)
      }
      authObject.properties = response.finalProperties
      authObject.request[authObject.request.key] = response.finalProperties.split('\n')[1].split(': ')[1]
      resolve(authObject)
    });

  })

}
