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
    let defaultDomainDef = {
      name: 'Test',
      urn: 'test',
      description: 'A test domain',
      public: true,
      settings: {
        visible: ['notes']
      },
      ownerId: 1
    }
    return app.models['domains'].findOrCreate({
      where: defaultDomainDef
    })
  }).then(([domain, newlyCreated]) => {
    if (domain.get('name') === 'Test') {
      // Maybe check for duplicates...
      return app.models['domains'].findAll({
        where: {
          name: 'Test'
        }
      })
    }
    return new Error('Failed to create test domain')
  }).then(roles => {
    if (roles.length === 1) {
      app.log(`SUCCESS`)
      return true
    } else {
      return new Error('Too many domains returned')
    }
  }).catch(err => {
    console.log(`FAILED: ${err.message}`)
  })
