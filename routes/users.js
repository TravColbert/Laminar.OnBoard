const express = require('express');
var router = express.Router();

module.exports = function(app) {
  // router.get('/create/',app.tools.checkAuthentication,app.tools.showPage("usercreate"));
  router.get('/',app.tools.checkAuthentication,app.controllers["users"].getUsers);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["users"].getUser);
  router.get('/:id/actions/edit',app.tools.checkAuthentication,app.controllers["users"].editUserForm);
  router.get('/:id/domains/',app.tools.checkAuthentication,app.controllers["users"].getDomainsByUserId);
  router.get('/:id/roles/',app.tools.checkAuthentication,app.controllers["users"].getRolesByUserId);
  router.post('/',app.tools.checkAuthentication,app.controllers["users"].createUser);
  router.post('/:id/',app.tools.checkAuthentication,app.controllers["users"].editUser);
  return router;
};
