module.exports = function(app) {
  mailjet = require('node-mailjet').connect(app.secrets['mail-api-key'], app.secrets['mail-api-secret'], {
    url: app.locals.smtpServer, // default is the API url
    version: 'v3.1', // default is '/v3'
    perform_api_call: true // used for tests. default is true
  })
  return mailjet
}
