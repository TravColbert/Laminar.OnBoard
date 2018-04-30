const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.controllers["domains"].getDomains);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["domains"].getDomain);
  router.get('/:id/roles/',app.tools.checkAuthentication,app.controllers["domains"].getRolesByDomainId);
  router.get('/:id/users/',app.tools.checkAuthentication,app.controllers["domains"].getUsersByDomainId);
  router.get('/create/',app.tools.checkAuthentication,app.tools.showPage("domaincreate"));
  router.post('/',app.tools.checkAuthentication,app.controllers["domains"].createDomain);
  return router;
};