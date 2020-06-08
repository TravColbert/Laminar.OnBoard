#!/usr/bin/node
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
const app = express()
const myName = 'setup'

app.locals = JSON.parse(fs.readFileSync(path.join(cwd, 'config/config.json')))
app.secrets = JSON.parse(fs.readFileSync(path.join(cwd, 'config/secrets.json')))
app.debug = require('debug')('laminar')

// Define the objects that are linked to domains:
app.domainlinks = JSON.parse(fs.readFileSync(path.join(cwd, 'config/domainlinks.json')))

// Configure host:port
app.locals.url = 'https://' + app.locals.addr
if (app.locals.port !== '443') app.locals.url += ':' + app.locals.port

const options = {
  key: fs.readFileSync(path.join(cwd, app.locals.keyFile)),
  cert: fs.readFileSync(path.join(cwd, app.locals.certFile)),
  secureOptions: constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
}

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

app.mailjet = require('node-mailjet').connect(app.secrets['mail-api-key'], app.secrets['mail-api-secret'], {
  url: app.locals.smtpServer, // default is the API url
  version: 'v3.1', // default is '/v3'
  perform_api_call: true // used for tests. default is true
})

// Setup default Home module
app.homeModule = false
if (app.locals.hasOwnProperty('homeModule')) {
  if (app.locals.homeModule !== false && app.locals.homeModule !== null) {
    app.log('Including home module: ' + app.locals.homeModule, myName, 6)
    app.homeModule = require(path.join(__dirname, app.locals.modulesDir, app.locals.homeModule))(app)
  }
}

app.log(path.join(cwd, 'db'), myName, 8)

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

// Basic Express setup: templater, query-parsing, ...
app.set('views', path.join(cwd, app.locals.viewsDir))
app.set('view engine', 'pug')
app.set('query parser', true)
app.set('strict routing', true)
if (app.locals.compression) app.use(compression())
app.use(express.static(path.join(cwd, app.locals.staticDir)))
let favIcon = app.locals.favicon || 'public/img/laminar_favicon.ico'
app.use('/favicon.ico', express.static(path.join(cwd, favIcon)), function (req, res, next) {
  let message = `Could not serve static file: ${path.join(cwd, favIcon)}`
  app.log(message)
  res.end()
})
let robots = app.locals.robots
app.use('/robots.txt', express.static(path.join(cwd, robots)), function (req, res, next) {
  let message = `Could not serve static file: ${path.join(cwd, robots)}`
  app.log(message)
  res.end()
})
if (app.locals.sitemap) {
  app.use('/sitemap.xml', express.static(path.join(cwd, app.locals.sitemap)), function (req, res, next) {
    let message = `Could not serve static file: ${path.join(cwd, app.locals.sitemap)}`
    app.log(message)
    res.end()
  })
}
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session(sessionConfig))
app.use(fileUpload())
app.disable('x-powered-by')

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
const navigation = require('./navigation')(app)

// Build app starting with model-hydration
app.tools.readDir(path.join(app.cwd, app.locals.modelsDir), '.js')
  .then(modelFiles => {
    return app.tools.processFiles(modelFiles, app.tools.readModel)
  })
  .then(() => {
    // Hydrate controllers
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
    // Bind associations and start the models
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
    // Run and post-startup model tasks (e.g. creating records)
    return app.tools.readDir(path.join(cwd, app.locals.modelsDir, 'modelstartups'), '.js')
  })
  .then(modelStartupFiles => {
    return app.tools.processFiles(modelStartupFiles, app.tools.readModelStartup)
  })
  .then(() => {
    // Collect menu elements
    return app.tools.readDir(path.join(app.cwd, app.locals.navDir), '.json')
  })
  .then(menuFiles => {
    return app.tools.processFiles(menuFiles, app.tools.readMenu)
  })
  .then(() => {
    // Parse headoptions file, if available
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
      app.tools.handleRedirects,
      app.tools.logRequest,
      app.tools.enforceStrictRouting,
      app.tools.setOriginalUrl,
      app.tools.setAppData,
      app.tools.timeStart
    )

    /**
     * SET SESSION AND ACCOUNT DATA
     */
    app.use(
      app.tools.setUserAccount,
      app.tools.getUserDomains,
      app.tools.setMessage
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
let server = https.createServer(options, app)
server.listen(app.locals.port, app.locals.host, () => {
  console.log(app.locals.appName + ' server listening on port ' + app.locals.port)
})
