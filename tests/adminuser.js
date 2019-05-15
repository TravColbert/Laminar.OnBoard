#!/usr/bin/node
const path = require('path')
console.log(`Current directory: ${process.cwd()}`)
const cwd = path.join(process.cwd(), '/')
console.log('Script directory is:', cwd)
const fs = require('fs')
var app = {}
const myName = 'setup'

app.locals = JSON.parse(fs.readFileSync(path.join(cwd, 'config/config.json')))
app.secrets = JSON.parse(fs.readFileSync(path.join(cwd, 'config/secrets.json')))
app.debug = require('debug')('laminar')

// Define the objects that are linked to domains:
app.domainlinks = JSON.parse(fs.readFileSync(path.join(cwd, 'config/domainlinks.json')))

// Setup our ORM (Sequelize)
const Sequelize = require('sequelize')
var sequelize = new Sequelize(
  app.locals.dbConnection[app.locals.activeDbConnection].database,
  app.locals.dbConnection[app.locals.activeDbConnection].user,
  app.secrets.dbConnection[app.locals.activeDbConnection].password,
  {
    host: app.locals.dbConnection[app.locals.activeDbConnection].host,
    dialect: app.locals.activeDbConnection,
    // For SQLite only :
    storage: cwd + app.locals.dbConnection[app.locals.activeDbConnection].storage,
    // Logging:
    logging: app.locals.dbConnection[app.locals.activeDbConnection].logging
  }
)

// Incorporate our tools file
app.tools = require(path.join(cwd, 'apptools'))(app, sequelize)

app.log(path.join(cwd, 'db'), myName, 8)

// Main app in-memory structures...
app.cwd = cwd
app.models = {}
app.modelDefinitions = {}
app.controllers = {}
app.elements = {}
app.routes = {}
app.menu = []
app.linkedObjects = {}

// Prepare navigation object

// Build app starting with model-hydration
app.tools.readDir(path.join(app.cwd, app.locals.modelsDir), '.js')
  .then(modelFiles => {
    return app.tools.processFiles(modelFiles, app.tools.readModel)
  }).then(() => {
    return app.tools.readDir(path.join(cwd, app.locals.controllersDir))
  }).then(controllerFiles => {
    return app.tools.processFiles(controllerFiles, app.tools.readController)
  }).then(() => {
    return app.tools.readDir(path.join(cwd, app.locals.modelsDir, 'associations'))
  }).then(associationFiles => {
    return app.tools.processFiles(associationFiles, app.tools.readAssociation)
  }).then(() => {
    return app.tools.startModels(app.models)
  }).then(() => {
    // Run and post-startup model tasks (e.g. creating records)
    return app.tools.readDir(path.join(cwd, app.locals.modelsDir, 'modelstartups'), '.js')
  }).then(modelStartupFiles => {
    return app.tools.processFiles(modelStartupFiles, app.tools.readModelStartup)
  }).then(() => {
    return app.models['users'].findOne({
      where: { email: 'admin@' + app.locals.smtpDomain }
    })
  }).then(adminUser => {
    if (!adminUser) {
      let adminUserDef = {
        'firstname': 'Administrative',
        'lastname': 'User',
        'email': 'admin@' + app.locals.smtpDomain,
        'verified': true,
        'disabled': false,
        'password': app.secrets['admin@' + app.locals.smtpDomain]
      }
      return app.models['users'].create(adminUserDef)
    }
    return adminUser
  }).then(adminUser => {
    if (adminUser.get('fullname') === 'User, Administrative') {
      app.log(`SUCCESS`)
      return true
    }
    app.log(`FAILED`)
    return false
  }).catch(err => {
    console.log(`Something went wrong:`)
    console.log(err.message)
  })
