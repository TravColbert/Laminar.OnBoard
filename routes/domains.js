const express = require('express')
var router = express.Router()
const model = 'domains'

module.exports = function (app) {
  router.get('/', app.tools.checkAuthentication, app.controllers[model].getMyDomains)
  router.get('/:id/', app.tools.checkAuthentication, app.controllers[model].getDomain)
  router.get('/:id/actions/edit/', app.tools.checkAuthentication, app.controllers[model].editDomainForm)
  router.get('/:id/roles/', app.tools.checkAuthentication, app.controllers[model].getRolesByDomainId)
  router.get('/:id/users/', app.tools.checkAuthentication, app.controllers[model].getUsersByDomainId)
  router.post('/', app.tools.checkAuthentication, app.controllers[model].createDomain)
  router.post('/:id/', app.tools.checkAuthentication, app.controllers[model].editDomain)
  return router
}
