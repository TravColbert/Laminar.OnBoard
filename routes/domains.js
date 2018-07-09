const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.controllers["domains"].getDomains);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["domains"].getDomain);
  router.get('/:id/actions/edit',app.tools.checkAuthentication,app.controllers["domains"].editDomainForm);
  router.get('/:id/roles/',app.tools.checkAuthentication,app.controllers["domains"].getRolesByDomainId);
  router.get('/:id/users/',app.tools.checkAuthentication,app.controllers["domains"].getUsersByDomainId);
  // router.get('/:id/invite/',app.tools.checkAuthentication,app.controllers["domains"].invite);
  router.post('/',app.tools.checkAuthentication,app.controllers["domains"].create);
  router.post('/:id/',app.tools.checkAuthentication,app.controllers["domains"].editDomain);
  return router;
};
