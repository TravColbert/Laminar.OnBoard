const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.controllers["notes"].getNotes);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["notes"].getNote);
  router.get('/:id/actions/edit',app.tools.checkAuthentication,app.controllers["notes"].editNoteForm);
  // router.get('/:id/roles/',app.tools.checkAuthentication,app.controllers["domains"].getRolesByDomainId);
  // router.get('/:id/users/',app.tools.checkAuthentication,app.controllers["notes"].getUsersByNoteId);
  router.post('/',app.tools.checkAuthentication,app.controllers["notes"].createNote);
  router.post('/:id/',app.tools.checkAuthentication,app.controllers["notes"].editNote);
  return router;
};
