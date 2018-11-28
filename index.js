#!/usr/bin/node
console.log(`Current directory: ${process.cwd()}`);
const cwd = __dirname + "/";
console.log('Script directory is:',cwd);
const fs = require('fs');
const https = require('https');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const myName = "setup";

app.locals = JSON.parse(fs.readFileSync(cwd + 'config.json'));
app.secrets = JSON.parse(fs.readFileSync(cwd + 'secrets.json'));
app.debug = require('debug')('laminar');

// Configure host:port
app.locals.url = "https://" + app.locals.addr;
if(app.locals.port!="443") app.locals.url += ":" + app.locals.port;

const options = {
  key: fs.readFileSync(cwd + app.locals.keyFile),
  cert: fs.readFileSync(cwd + app.locals.certFile)
};

// Setup our ORM (Sequelize)
const Sequelize = require('sequelize');
var sequelize = new Sequelize(
  app.locals.dbConnection[app.locals.activeDbConnection].database,
  app.locals.dbConnection[app.locals.activeDbConnection].user,
  app.secrets.dbConnection[app.locals.activeDbConnection].password,
  {
    host:app.locals.dbConnection[app.locals.activeDbConnection].host,
    dialect:app.locals.activeDbConnection,
    // For SQLite only :
    storage:cwd + app.locals.dbConnection[app.locals.activeDbConnection].storage,
    // Logging:
    logging: app.locals.dbConnection[app.locals.activeDbConnection].logging
  }
);

// Incorporate our tools file
app.tools = require('./apptools')(app,sequelize);

app.log("Keys: " + app.secrets["mail-api-key"] + ":" + app.secrets["mail-api-secret"]);
// debug("Keys: %s : %s",app.secrets["mail-api-key"],app.secrets["mail-api-secret"]);

app.mailjet = require('node-mailjet').connect(app.secrets["mail-api-key"], app.secrets["mail-api-secret"], {
  url: app.locals.smtpServer, // default is the API url
  version: 'v3.1', // default is '/v3'
  perform_api_call: true // used for tests. default is true
});

let sessionConfig = {
  secret:app.secrets.sessionSecret,
  resave:false,
  saveUninitialized:false
};

// Setup default Home module
app.homeModule = false; 
if(app.locals.hasOwnProperty("homeModule")) {
  if(app.locals.homeModule!==false && app.locals.homeModule!==null) {
    app.log("Including home module: " + app.locals.homeModule,myName,6);
    app.homeModule = require("./" + app.locals.modulesDir + "/" + app.locals.homeModule + ".js")(app);  
  }
}

// Basic Express setup: templater, query-parsing, ...
app.set('views',cwd + app.locals.viewsDir);
app.set('view engine','pug');
app.set('query parser',true);
app.use(express.static(cwd + app.locals.staticDir));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session(sessionConfig));
app.disable('x-powered-by');

// Main app in-memory structures...
app.cwd = cwd;
app.models = {};
app.modelDefinitions = {};
app.controllers = {};
app.elements = {};
app.routes = {};
app.menu = [];

// Prepare navigation object
const navigation = require('./navigation')(app);

// Build app starting with model-hydration
app.tools.readDir(app.cwd + app.locals.modelsDir)
.then(modelFiles => {
  return app.tools.processFiles(modelFiles,app.tools.readModel);
}).then(() => {
  // Hydrate controllers
  return app.tools.readDir(cwd + app.locals.controllersDir);
}).then(controllerFiles => {
  return app.tools.processFiles(controllerFiles,app.tools.readController);
}).then(() => {
  return app.tools.readDir(cwd + app.locals.elementsDir);
}).then(elementFiles => {
  return app.tools.processFiles(elementFiles,app.tools.readElement);
}).then(() => {
  // Bind associations and start the models
  return app.tools.associateModels();
}).then(() => {
  return app.tools.startModels(app.models);
}).then(() => {
  return app.tools.setupBasePermissions();
}).then(() => {
  // Run and post-startup model tasks (e.g. creating records)
  return app.tools.readDir(cwd + app.locals.modelsDir + "/modelstartups");
}).then(modelStartupFiles => {
  return app.tools.processFiles(modelStartupFiles,app.tools.readModelStartup);
}).then(() => {
  // Collect menu elements
  return app.tools.readDir(app.cwd + app.locals.navDir);
}).then(menuFiles => {
  return app.tools.processFiles(menuFiles,app.tools.readMenu);
}).then(() => {
  // Include the main menu
  app.menu = app.menu.concat(require("./" + app.locals.navDir + "/menu.json")["main"]);
}).then(() => {
  // Parse headoptions file, if available
  fs.readFile(cwd + "/headoptions.json",(err,data) => {
    if(err) {
      app.log("No headoptions file found");
    } else {
      app.log("Head options: " + data,myName,6);
      app.headOptions = JSON.parse(data);
    }
  });
  return;
}).then(() => {
  /**
   * SET BASE APP CONFIGURATON
   */
  app.use(
    app.tools.ignoreFavicon,
    app.tools.setOriginalUrl,
    app.tools.setAppData,
    app.tools.timeStart
  );

  /**
   * SET SESSION AND ACCOUNT DATA
   */
  app.use(
    app.tools.setCurrentDomain,
    app.tools.setUserAccount,
    app.tools.setMessage
  );

  /**
   * START BUILDING THE INTERFACE
   */
  app.use(
    navigation.getMenu
  );
}).then(() => {
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
  return app.tools.readDir(cwd + app.locals.routesDir);
}).then(routeFiles => {
  return app.tools.processFiles(routeFiles,app.tools.readRoute);
}).then(() => {
  app.log("Total routes: " + Object.keys(app.routes).length,myName,6);
  let routeNames = Object.keys(app.routes);
  routeNames.forEach(name => {
    app.use("/" + name + "/",app.routes[name]);
  });
}).then(() => {
  app.get('/profile/',app.tools.checkAuthentication,app.controllers["users"].getProfile);
  app.post('/authorizedelements/:element',app.tools.checkAuthentication,app.tools.getElement);
  app.get('/',app.tools.homePage);
}).then(() => {
  app.use(
    app.tools.timeEnd,
    app.tools.render
  );
}).catch(err => {
  app.log(err.message);
});

/**
 * START THE SERVER
 */
let server = https.createServer(options,app);
server.listen(app.locals.port,app.locals.host,function() {
  console.log(app.locals.appName + " server listening on port " + app.locals.port);
});
