const express = require('express')
var router = express.Router()

module.exports = function (app) {
  router.get('/:id/', app.controllers['users'].verifyUser)
  return router
}
