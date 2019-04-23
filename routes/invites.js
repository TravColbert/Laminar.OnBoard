const express = require('express')
var router = express.Router()

module.exports = function (app) {
  router.get('/', app.tools.checkAuthentication, app.controllers['invites'].gets)
  router.get('/:id/', app.tools.checkAuthentication, app.controllers['invites'].attemptAccept)
  router.post('/:id/', app.tools.checkAuthentication, app.controllers['invites'].confirmAccept)
  return router
}
