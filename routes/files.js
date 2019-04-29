const express = require('express')
var router = express.Router()

module.exports = function (app) {
  router.get('/', app.tools.checkAuthentication, app.controllers['files'].gets)
  router.get('/:id/', app.tools.checkAuthentication, app.controllers['files'].get, app.tools.triggerDomainSwitchBy('files'))
  // router.get('/:id/actions/edit', app.tools.checkAuthentication, app.controllers['files'].editFileForm)
  router.post('/', app.tools.checkAuthentication, app.controllers['files'].uploadFile)
  // router.post('/:id/', app.tools.checkAuthentication, app.controllers['files'].editFile)
  return router
}
