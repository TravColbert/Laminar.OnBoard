const express = require('express');
var router = express.Router();

module.exports = function(app) {
  router.get('/',app.tools.homePage);
  router.get('/:id/',app.controllers["notes"].getAsBlog);
  router.get('/:id/actions/edit',app.tools.checkAuthentication,app.controllers["notes"].editNoteForm);
  return router;
};
