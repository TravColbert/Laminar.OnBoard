const express = require('express')
var router = express.Router({ strict: true })

module.exports = function (app) {
  // The authentication controls are in the gets and get methods for notes
  router.get('', app.controllers['notes'].gets)
  router.get('/:id/', app.controllers['notes'].get, app.tools.triggerDomainSwitchBy('note'))
  router.get('/:id/actions/edit/', app.tools.checkAuthentication, app.controllers['notes'].editNoteForm)
  router.post('/', app.tools.checkAuthentication, app.controllers['notes'].createNote)
  router.post('/:id/', app.tools.checkAuthentication, app.controllers['notes'].editNote)
  return router
}
