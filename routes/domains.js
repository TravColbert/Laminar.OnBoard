const express = require('express')
var router = express.Router()
const model = 'domains'

module.exports = function (app) {
  router.get('/', app.tools.checkAuthentication, app.controllers['domains'].getMyDomains)
  router.get('/:id/', app.tools.checkAuthentication, app.controllers['domains'].getDomain)
  router.get('/:id/actions/edit/', app.tools.checkAuthentication, app.controllers['domains'].editDomainForm)
  router.get('/:id/roles/', app.tools.checkAuthentication, app.controllers['domains'].getRolesByDomainId)
  router.get('/:id/users/', app.tools.checkAuthentication, app.controllers['domains'].getUsersByDomainId)
  router.post('/', app.tools.checkAuthentication, app.controllers['domains'].createDomain)
  router.post('/:id/', app.tools.checkAuthentication, app.controllers['domains'].editDomain)
  return router
}
