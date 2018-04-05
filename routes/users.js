const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.controllers["users"].getUsers);
  router.get('/:id/edit/',app.tools.checkAuthentication,app.controllers["users"].editUserForm);
  router.post('/:id/edit/',app.tools.checkAuthentication,app.controllers["users"].editUser);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["users"].getUser);
  return router;
}
