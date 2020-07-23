#!/usr/bin/node
const { Console } = require('console')
const path = require('path')
console.log(`Current directory: ${process.cwd()}`)
const cwd = path.join(__dirname, '/')
console.log('Script directory is:', cwd)
const fs = require('fs')
const constants = require('crypto').constants;
const https = require('https')
const compression = require('compression')
const express = require('express')
const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')
var app = express()
const myName = 'setup'
app.cwd = path.join(__dirname, '/')
app.locals = JSON.parse(fs.readFileSync(path.join(cwd, 'config/config.json')))
app.logging = require(path.join(cwd,app.locals.modulesDir,`Logging.js`))(app)
app.secrets = JSON.parse(fs.readFileSync(path.join(cwd, 'config/secrets.json')))

// Define the objects that are linked to domains:
app.domainlinks = JSON.parse(fs.readFileSync(path.join(cwd, 'config/domainlinks.json')))

// Setup our ORM
var orm = require(path.join(app.cwd, app.locals.modulesDir, 'ORM'))(app)

if(orm) {
  // Incorporate our tools file
  app.tools = require(path.join(app.cwd, app.locals.modulesDir, 'Tools'))(app, orm)
}

// Mail-handler
app.mail = require(path.join(app.cwd, app.locals.modulesDir, 'Mail'))(app)

// Setup default Home module
app.homeModule = require(path.join(app.cwd, app.locals.modulesDir, 'HomeModule'))(app)

// Basic Express setup: templater, query-parsing, ...
app.set('views', path.join(cwd, app.locals.viewsDir))
app.set('view engine', 'pug')
app.set('query parser', true)
app.set('strict routing', true)
if (app.locals.compression) app.use(compression())

app = require(path.join(app.cwd, app.locals.modulesDir, "Static"))(app,express)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
let sessionConfig = {
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(cwd, 'db')
  }),
  secret: app.secrets.sessionSecret,
  cookie: { maxAge: (app.locals.sessionTimeoutHours * 60 * 60 * 1000) },
  resave: false,
  saveUninitialized: false
}
app.use(session(sessionConfig))
app.use(fileUpload())
app.disable('x-powered-by')

// Main app in-memory structures...
app.models = {}
app.modelDefinitions = {}
app.controllers = {}
app.elements = {}
app.routes = {}
app.menu = []
app.linkedObjects = {}

// Prepare navigation object
const navigation = require(path.join(cwd, app.locals.modulesDir, 'Navigation'))(app)

// Build app starting with model-hydration
app.tools.readDir(path.join(app.cwd, app.locals.modelsDir), '.js')
  .then(modelFiles => {
    return app.tools.processFiles(modelFiles, app.tools.readModel)
  })
  .then(() => {
    return app.tools.readDir(path.join(cwd, app.locals.controllersDir))
  })
  .then(controllerFiles => {
    return app.tools.processFiles(controllerFiles, app.tools.readController)
  })
  .then(() => {
    return app.tools.readDir(path.join(cwd, app.locals.elementsDir), '.js')
  })
  .then(elementFiles => {
    return app.tools.processFiles(elementFiles, app.tools.readElement)
  })
  .then(() => {
    return app.tools.readDir(path.join(cwd, app.locals.modelsDir, 'associations'))
  })
  .then(associationFiles => {
    return app.tools.processFiles(associationFiles, app.tools.readAssociation)
  })
  .then(() => {
    return app.tools.startModels(app.models)
  })
  .then(() => {
    return app.tools.setupBasePermissions()
  })
  .then(() => {
    return app.tools.readDir(path.join(cwd, app.locals.modelsDir, 'modelstartups'), '.js')
  })
  .then(modelStartupFiles => {
    return app.tools.processFiles(modelStartupFiles, app.tools.readModelStartup)
  })
  .then(() => {
    return app.tools.readDir(path.join(app.cwd, app.locals.navDir), '.json')
  })
  .then(menuFiles => {
    return app.tools.processFiles(menuFiles, app.tools.readMenu)
  })
  .then(() => {
    return fs.readFile(path.join(cwd, 'config', 'headoptions.json'), (err, data) => {
      if (err) {
        app.log('No headoptions file found', myName, 5)
        app.headOptions = []
      } else {
        app.log('Head options: ' + data, myName, 6)
        app.headOptions = JSON.parse(data)
      }
    })
  })
  .then(() => {
    /**
     * SET BASE APP CONFIGURATON
     */
    app.use(
      app.tools.handleRedirects
      ,app.tools.enforceStrictRouting
      ,app.tools.setOriginalUrl
      ,app.tools.setAppData
      ,app.tools.timeStart
      ,app.tools.logRequest
    )

    /**
     * SET SESSION AND ACCOUNT DATA
     */
    app.use(
      app.tools.setUserAccount
      ,app.tools.getUserDomains
      ,app.tools.setMessage
    )

    /**
     * START BUILDING THE INTERFACE
     */
    app.use(
      navigation.getMenu
    )
  })
  .then(() => {
    /**
     * ROUTE DEFINITIONS
     *
     * These are derived from route files placed in the routesDir directory
     * Any route definitions found there will be defined here and mounted
     * The mount point will be the name of the route file.
     * There are some 'standard' routes:
     * /login : standard routes to allow loging-in
     * /logout : standard routes for logging-out
     * /register : a simple user-registration system that allows new users to
     *  be created and submitted for approval.
     * /roles : a role-management system.
     * /authtest : can be used to simply test authentication
     * /actions : a basic way of requesting forms used to work on : /create/user
     *
     * All of these routes can be excluded or replaced.
     */
    return app.tools.readDir(path.join(cwd, app.locals.routesDir))
  })
  .then(routeFiles => {
    return app.tools.processFiles(routeFiles, app.tools.readRoute)
  })
  .then(() => {
    app.log(`Total routes: ${Object.keys(app.routes).length}`, myName, 6)
    let routeNames = Object.keys(app.routes)
    routeNames.forEach(name => {
      app.use(`/${name}/`, app.routes[name])
    })
  })
  .then(() => {
    app.get('/profile/', app.tools.checkAuthentication, app.controllers['users'].getProfile)
    app.post('/authorizedelements/:element/', app.tools.checkAuthentication, app.tools.getElement)
    app.get('/', app.tools.homePage)
  })
  .then(() => {
    app.use(
      app.tools.timeEnd,
      app.tools.render
    )
  })
  .catch(err => {
    app.log(err.message)
  })


/**
 * START THE SERVER
 */
app.locals.url = 'https://' + app.locals.addr
if (app.locals.port !== '443') app.locals.url += ':' + app.locals.port

const options = {
  key: fs.readFileSync(path.join(cwd, app.locals.keyFile)),
  cert: fs.readFileSync(path.join(cwd, app.locals.certFile)),
  secureOptions: constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
}

let server = https.createServer(options, app)
server.listen(app.locals.port, app.locals.host, () => {
  console.log(app.locals.appName + ' server listening on port ' + app.locals.port)
})
