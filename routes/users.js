const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.controllers["users"].getUsers);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["users"].getUser);
  router.get('/:id/actions/edit',app.tools.checkAuthentication,app.controllers["users"].editUserForm);
  router.get('/:id/domains/',app.tools.checkAuthentication,app.controllers["users"].getDomainsByUserId);
  router.get('/:id/roles/',app.tools.checkAuthentication,app.controllers["users"].getRolesByUserId);
  router.post('/:id/edit/',app.tools.checkAuthentication,app.controllers["users"].editUser);
  return router;
};
