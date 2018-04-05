const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.logoutPage);
  return router;
}