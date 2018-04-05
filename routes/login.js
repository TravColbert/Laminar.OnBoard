const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.loginPage);
  router.post('/',app.controllers["users"].authenticate,app.tools.redirectToOriginalReq);
  return router;
}