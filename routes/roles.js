const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/create/',app.tools.checkAuthentication,app.tools.showPage("rolecreate"));
  router.get('/',app.tools.checkAuthentication,app.controllers["roles"].getRoles);
  router.post('/',app.tools.checkAuthentication,app.controllers["roles"].createRole);
  return router;
}