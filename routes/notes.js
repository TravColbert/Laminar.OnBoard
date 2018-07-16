const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.checkAuthentication,app.controllers["notes"].gets);
  router.get('/:id/',app.tools.checkAuthentication,app.controllers["notes"].get);
  router.get('/:id/actions/edit',app.tools.checkAuthentication,app.controllers["notes"].editNoteForm);
  router.post('/',app.tools.checkAuthentication,app.controllers["notes"].createNote);
  router.post('/:id/',app.tools.checkAuthentication,app.controllers["notes"].editNote);
  return router;
};
