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
// const navigation = require('./navigation')(app)

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
    let noteDef = {
      name: 'Test Note',
      description: 'A test note',
      body: 'This is an example of a simple test note'
    }
    return app.models['notes'].findOrCreate({
      where: noteDef
    })
  }).then(([aNote, newlyCreated]) => {
    // create a comment
    app.log(`Note: ${JSON.stringify(aNote.get({ plain: true }))}`)
    let commentDef = {
      email: 'johnny@gogo.net',
      subject: 'This is a test comment',
      text: 'Hey, I like what you\'re doing here. Let\'s collaborate!',
      objectId: aNote.id
    }
    app.log(JSON.stringify(commentDef))
    return aNote.createComment(commentDef)
  }).then(comment => {
    app.log(`I think I created the comment...`)
    app.log(JSON.stringify(comment.get({ plain: true, raw: true })))
    app.log(`(re)Fetching the note the comment is attached to...`)
    return comment.getNote()
  }).then(note => {
    app.log(`This is the note:`)
    app.log(JSON.stringify(note.get({ plain: true })))
    return note
  }).then((note) => {
    // Let's create a comment on a comment now...
    return note.getComments()
  }).then(comments => {
    app.log(JSON.stringify(comments))
    let nextCommentDef = {
      email: 'sally@testr.com',
      subject: 'A comment on your comment...',
      text: 'Hey! I would like to collaborate too',
      objectId: comments[0].id
    }
    return comments[0].createComment(nextCommentDef)
  }).catch(err => {
    console.log(`Something catastrophic happened in DB`)
    console.log(err.message)
  })
