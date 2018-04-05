const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.tools.secureTest);
  return router;
}