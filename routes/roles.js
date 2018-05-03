const express = require('express');
var router = express.Router();

module.exports = function(app) {
  // router.get('/create/',app.tools.checkAuthentication,app.tools.showPage("rolecreate"));
  router.get('/',app.tools.checkAuthentication,app.controllers["roles"].getRoles);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["roles"].getRole);
  router.get('/:id/actions/edit/',app.tools.checkAuthentication,app.controllers["roles"].editRoleForm);
  router.get('/:id/users/',app.tools.checkAuthentication,app.controllers["roles"].getUsersByRoleId);
  router.get('/:id/domains/',app.tools.checkAuthentication,app.controllers["roles"].getDomainsByRoleId);
  router.post('/',app.tools.checkAuthentication,app.controllers["roles"].createRole);
  router.post('/:id/',app.tools.checkAuthentication,app.controllers["roles"].editRole);
  return router;
};