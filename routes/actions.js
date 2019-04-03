const express = require('express')
var router = express.Router()

module.exports = function (app) {
  router.get('/:action/:model/', app.tools.checkAuthentication, app.tools.showForm)
  return router
}
