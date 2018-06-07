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

app.tools = require('./apputils')(app,sequelize);
app.homeModule = false; 
if(app.locals.hasOwnProperty("homeModule")) {
  if(app.locals.homeModule!==false && app.locals.homeModule!==null) {
    app.log("Including home module: " + app.locals.homeModule,myName,6);
    app.homeModule = require("./" + app.locals.modulesDir + "/" + app.locals.homeModule + ".js")(app);  
  }
}
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

let modelData = [];
let controllerData = [];
let routeData = [];

let associateModels = function() {
  let myName = "associateModels";
  return new Promise((resolve,reject) => {
    app.log("Building model associations",myName,6,"::>");
    app.models["domains"].belongsToMany(app.models["roles"],{through:app.models["domainsroles"]});
    app.models["roles"].belongsToMany(app.models["domains"],{through:app.models["domainsroles"]});
    app.models["users"].belongsToMany(app.models["roles"],{through:app.models["usersroles"]});
    app.models["roles"].belongsToMany(app.models["users"],{through:app.models["usersroles"]});
    app.models["users"].belongsTo(app.models["domains"],{as:'defaultDomain'});  // makes users.defaultDomainId field
    app.models["users"].hasOne(app.models["domains"],{as:'owner'});             // makes domains.ownerId field
    app.models["notes"].belongsTo(app.models["domains"],{as:'domain'});         // makes notes.domainId
    app.models["notes"].belongsTo(app.models["users"],{as:"user"});             // makes notes.userId
    resolve(app.models);
  });
}

let setupModels = function() {
  let myName = "setupModels";
  app.log("Setting up admin user...",myName,6);

  let adminUser, adminRole;
  let setupPromises = Promise.resolve();
  setupPromises = setupPromises.then(() => {
    return app.controllers.users.getUserByObj({email:"admin@test.com"});
  }).then(user => {
    if(user===null) {
      app.log("No admin user found - creating",myName,6,"+");
      let adminUserDef = {
        firstname:'Administrative',
        lastname:'User',
        email:'admin@test.com',
        verified:true,
        disabled:false,
        password:'test123!'
      };
      return app.controllers.users.createUser(adminUserDef);
    } else {
      app.log("Admin user found",myName,6,"#");
      return user;
    };
  }).then(user => {
    adminUser = user;
    return app.controllers.roles.getRoleByName("Super Admin");
  }).then(role => {
    if(role===null) {
      app.log("No super-admin role found... creating",myName,6,"+");
      let adminRoleDef = {
        name:"Super Admin",
        description:"Role can manage all models in all domains (super-admin users)",
        capabilities:{'edit':'all','create':'all','list':'all','delete':'all'}
      };
      return app.controllers.roles.createRole(adminRoleDef);
    } else {
      app.log("Super-admin role found. Good.",myName,6);
      return role;
    }
  }).then(role => {
    adminRole = role;
    return adminUser.addRoles(role,{through:{comment:"Initial creation phase"}});
  }).then(() => {
    app.log("Admin user connected to admin role",myName,6,"-");
  }).then(() => {
    app.log("Making default domains",myName,6,"+");
    let defaultDomain = {
      name:"Default Domain",
      description:"The default domain",
      ownerId:adminUser.id
    };
    let trashDomain = {
      name:"Trash Domain",
      description:"The trashcan of domains",
      ownerId:adminUser.id
    };
    return app.controllers.domains.createDomain(defaultDomain,adminUser.id)
    .then(() => {
      return app.controllers.domains.createDomain(trashDomain,adminUser.id);
    });
  }).catch(err => {
    app.log(err.message,myName,3,"!");
  });
  return setupPromises;
}

app.tools.readDir(app.locals.modelsDir)
.then(modelFiles => {
  return app.tools.processFiles(modelFiles,app.tools.readModel);
}).then(() => {
  return app.tools.readDir(app.locals.controllersDir);
}).then((controllerFiles) => {
  return app.tools.processFiles(controllerFiles,app.tools.readController);
}).then(() => {
  return associateModels();
}).then((models) => {
  return app.tools.startModels(models);
}).then(() => {
  return setupModels();
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
  return app.tools.readDir(app.locals.routesDir);
}).then((routeFiles) => {
  return app.tools.processFiles(routeFiles,app.tools.readRoute);
}).then(() => {
  app.log("Total routes: " + Object.keys(app.routes).length,myName,6);
  let routeNames = Object.keys(app.routes);
  routeNames.forEach(name => {
    app.use("/" + name + "/",app.routes[name]);
  });
}).then(() => {
  app.get('/profile/',app.tools.checkAuthentication,app.controllers["users"].getProfile);
  app.get('/',app.tools.homePage);
  return true;
}).then(() => {
  app.use(
    app.tools.timeEnd,
    app.tools.render
  );
  console.log("Done!");
}).catch(err => {
  app.log(err.message);
})

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
