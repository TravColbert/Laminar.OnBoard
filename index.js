#!/usr/bin/node
const fs = require('fs');
const https = require('https');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

let myName = "setup";

app.locals = JSON.parse(fs.readFileSync('config.json'));
app.locals.url = "https://" + app.locals.addr;
if(app.locals.port!="443") app.locals.url += ":" + app.locals.port;
const options = {
  key: fs.readFileSync(app.locals.keyFile),
  cert: fs.readFileSync(app.locals.certFile)
};

const Sequelize = require('sequelize');

var sequelize = new Sequelize(
  app.locals.dbConnection.sqlite.database,
  app.locals.dbConnection.sqlite.user,
  app.locals.dbConnection.sqlite.password,
  {
    host:app.locals.dbConnection.sqlite.host,
    dialect:"sqlite",
    // For SQLite only :
    storage:app.locals.dbConnection.sqlite.storage,
    // Logging:
    logging: app.locals.dbConnection.sqlite.logging
  }
);

let sessionConfig = {
  secret:app.locals.sessionSecret,
  resave:false,
  saveUninitialized:false
};

app.tools = require('./apputils')(app);
const navigation = require('./navigation')(app);
// const mailutils = require('./mailutils')(app);

/**
 * Configuration
 */
app.set('views',app.locals.viewsDir);
app.set('view engine','pug');
app.set('query parser',true);
app.use(express.static(app.locals.staticDir));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session(sessionConfig));
app.disable('x-powered-by');

app.paths = {};
app.models = {};
app.modelDefinitions = {};
app.controllers = {};
app.routes = {};

/**
 * MODEL DEFINITION
 */
// Find some models defined in the models folder...
let modelFiles = fs.readdirSync(app.locals.modelsDir);
for(let c=0;c<modelFiles.length;c++) {
  // Pick only certain file-types
  let fileNameParts = modelFiles[c].split(".");
  if(fileNameParts[fileNameParts.length-1]!="js") continue;
  let modelName = fileNameParts[0].toLowerCase();  // e.g. 'users'
  app.modelDefinitions[modelName] = require("./" + app.locals.modelsDir + "/" + modelFiles[c])(Sequelize,app);
  // Define the model's table:
  app.models[modelName] = sequelize.define(app.modelDefinitions[modelName].tablename,app.modelDefinitions[modelName].schema,app.modelDefinitions[modelName].options);
}

/**
 * MODEL ASSOCIATIONS
 * These statements determine the relationships between models.
 */
app.models["domains"].belongsToMany(app.models["roles"],{through:app.models["domainsroles"]});
app.models["roles"].belongsToMany(app.models["domains"],{through:app.models["domainsroles"]});
app.models["users"].belongsToMany(app.models["roles"],{through:app.models["usersroles"]});
app.models["roles"].belongsToMany(app.models["users"],{through:app.models["usersroles"]});
app.models["users"].belongsTo(app.models["domains"],{as:'defaultDomain'});  // makes users.defaultDomainId field
app.models["users"].hasOne(app.models["domains"],{as:'owner'});             // makes domains.ownerId field
app.models["notes"].belongsTo(app.models["domains"],{as:'domain'});         // makes notes.domainId
app.models["notes"].belongsTo(app.models["users"],{as:"user"});             // makes notes.userId


/**
 * Bring all models on-line!
 */
for(let model in app.models) {
  app.log("Prepping model: " + model,myName,6);
  // Sync tables
  app.models[model]
  .sync()
  .then(function(){
    app.log("Checking for post-preparations for model: " + model,myName,6);
    // Run any post-operations after sync()'ing table
    if(app.modelDefinitions[model].hasOwnProperty("afterSync")) {
      app.log("Running post-preparations on model: " + model,myName,6);
      app.modelDefinitions[model].afterSync(app.models[model]);
    }
  });
}

/**
 * FINAL MODEL PREP
 * Any last-minute stuff that should be done to the model(s)
 */
{
  /**
   * Assign administrator role to the admin user
   */
  app.log("Setting up admin user...",myName,6);

  app.models.users.findOne({where:{email:'admin@test.com'}})
  .then(user => {
    if(user===null) {
      app.log("!!! Couldn't find the admin user! I have to quit now.",myName,1);
      return false;
    }
    app.log("!!! Found '" + user.email + "' user.",myName,6);
    app.models.roles.findOne({where:{name:"Super Admin"}})
    .then(role => {
      user.addRole(role)
      .then(function() {
        app.log("Admin user has been granter Super Admin roles",myName,6);
      })
      .catch(err => {
        app.log("Couldn't add Super Admin role to Admin user " + err.message,myName,1);
      });
    })
    .catch(err => {
      app.log("!!! Couldn't find the admin user! I have to quit now.: " + err.message,myName,1);
    });
  })
  .catch(err => {
    app.log("Error attempting to retrieve admin user: " + err.message,myName,1);
  });
}

/**
 * CONTROLLER DEFINITIONS
 */
let controllerFiles = fs.readdirSync(app.locals.controllersDir);
for(let c=0;c<controllerFiles.length;c++) {
  // Pick only certain file-types
  let fileNameParts = controllerFiles[c].split(".");
  if(fileNameParts[fileNameParts.length-1]!="js") continue;
  let controllerName = fileNameParts[0].toLowerCase();
  app.controllers[controllerName] = require("./" + app.locals.controllersDir + "/" + controllerFiles[c])(app,controllerName);
};

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
  app.tools.setGlobalSessionEnvironment,
  app.tools.setUserAccount,
  // app.tools.setSessionData,
  app.tools.setMessage //,
  //app.tools.printSessionData
);

/**
 * START BUILDING THE INTERFACE
 */
app.use(
  navigation.getMenu
);

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
let routeFiles = fs.readdirSync(app.locals.routesDir);
for(let c=0;c<routeFiles.length;c++) {
  // Pick only certain file-types
  let fileNameParts = routeFiles[c].split(".");
  if(fileNameParts[fileNameParts.length-1]!="js") continue;
  let routeName = fileNameParts[0].toLowerCase();
  app.routes[routeName] = require('./' + app.locals.routesDir + '/' + routeFiles[c])(app);
  app.use('/' + routeName + "/",app.routes[routeName]);
};

/**
 * YOUR APPLICATION ROUTES HERE
 *
 * This is where you would put your application's custom routes.
 */

app.get('/profile/',app.tools.checkAuthentication,app.controllers["users"].getProfile);

/**
 * CLOSING ROUTES
 */
 // A route to fetch authorized UI elements
 // app.get('/authorizedelements/:element',appCheckAuthentication,appGetElement);

/**
 * HOME PAGE ROUTE
 */
app.get('/',app.tools.homePage);
/**
 * CLOSE THE APP AND SHIP IT!
 */
app.use(
  app.tools.timeEnd,
  app.tools.render
);
/**
 * HANDLE ERRORS
 */
// app.use(
//  app.tools.errorHandler
// );

/**
 * START THE SERVER
 */
https.createServer(options,app).listen(app.locals.port,function() {
  app.log(app.locals.appName + " server listening on port " + app.locals.port,myName,4);
  app.log("logLevel: " + app.locals.logLevel,myName,4);
});
