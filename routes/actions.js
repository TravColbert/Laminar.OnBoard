const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/create/role/',app.tools.checkAuthentication,app.controllers["roles"].createRoleForm);
  router.get('/create/domain/',app.tools.checkAuthentication,app.controllers["domains"].createDomainForm);
  router.get('/create/user/',app.tools.checkAuthentication,app.controllers["users"].createUserForm);
  // router.get('/',app.tools.checkAuthentication,app.controllers["roles"].getRoles);
  return router;
};