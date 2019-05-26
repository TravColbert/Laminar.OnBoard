const express = require('express')
var router = express.Router()

module.exports = function (app) {
  router.get('/', app.controllers['comments'].commentPage)
  router.post('/', app.controllers['comments'].add)
  return router
}
