const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.showPage("register"));
  router.post('/',app.controllers["users"].registerUser);
  return router;
}