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

let modelData = [];
let controllerData = [];
let routeData = [];

let readModelDir = function(dir) {
  let myName = "readModelDir";
  return new Promise((resolve,reject) => {
    fs.readdir(dir,(err,files) => {
      if(err) reject(new Error("(" + myName + ") : " + err.message));
      app.log("Found files: " + files,myName,6,"::>");
      resolve(files)
    })
  });
};

let readModel = function(modelFile) {
  let myName = "readModel";
  return new Promise((resolve,reject) => {
    app.log("Requiring " + modelFile,myName,6,"::>");
    let modelDefintion = require("./" + modelFile)(Sequelize,app);
    app.models[modelDefintion.tablename] = sequelize.define(modelDefintion.tablename,modelDefintion.schema,modelDefintion.options);
    resolve(true);
  });
}

let readModelFiles = function(modelFiles) {
  let myName = "readModelFiles";
  let readPromises = Promise.resolve();
  modelFiles.forEach(file => {
    readPromises = readPromises.then(data => {
      if(data!==null) modelData.push(data);
      return readModel(app.locals.modelsDir + "/" + file);
    });
  });
  return readPromises;
}

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

let raiseModels = function(models) {
  let myName = "raiseModels";
  let syncPromises = Promise.resolve();
  Object.keys(models).forEach(modelName => {
    syncPromises = syncPromises.then(() => {
      app.log("sync'ing model: " + modelName,myName,6,"::>");
      return(models[modelName].sync());
    });
  });
  return syncPromises;
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
      description:"The default domain"
    };
    let trashDomain = {
      name:"Trash Domain",
      description:"The trashcan of domains"
    };
    return app.controllers.domains.createDomain(defaultDomain)
    .then(() => {
      return app.controllers.domains.createDomain(trashDomain)
    });
  }).catch(err => {
    app.log(err.message,myName,3,"!");
  });
  return setupPromises;
}

let readControllerDir = function(dir) {
  let myName = "readControllerDir";
  return new Promise((resolve,reject) => {
    fs.readdir(dir,(err,files) => {
      if(err) reject(new Error("(" + myName + ") : " + err.message));
      app.log("Found files: " + files,myName,6,"::>");
      resolve(files);
    })
  });
};
let readController = function(file) {
  let myName = "readController";
  return new Promise((resolve,reject) => {
    // app.log("Requiring " + app.locals.controllersDir + "/" + file,myName,6,"::>");
    let fileNameParts = file.split(".");
    if(fileNameParts[fileNameParts.length-1]!="js") reject(new Error("(" + myName + ") Not a .js file"));
    let controllerName = fileNameParts[0].toLowerCase();
    // app.log("Hydrating " + app.locals.controllersDir + "/" + controllerName + " controller",myName,6,"--->");
    // let modelDefintion = require("./" + file)(Sequelize,app);
    app.log("Assigning controller: " + controllerName,myName,6,"+");
    app.controllers[controllerName] = require("./" + app.locals.controllersDir + "/" + file)(app,controllerName);
    resolve(true);
  });
}
let readControllerFiles = function(files) {
  let myName = "readControllerFiles";
  let controllerReadPromises = Promise.resolve();
  files.forEach(file => {
    controllerReadPromises = controllerReadPromises.then(data => {
      if(data!==null) controllerData.push(data);
      return readController(file);
    });
  });
  return controllerReadPromises;
}

let readRouteDir = function(dir) {
  let myName = "readRouteDir";
  return new Promise((resolve,reject) => {
    fs.readdir(dir,(err,files) => {
      if(err) reject(new Error("(" + myName + ") : " + err.message));
      app.log("Found files: " + files,myName,6,"::>");
      resolve(files);
    })
  });
};

let readRoute = function(file,app) {
  let myName = "readRoute";
  return new Promise((resolve,reject) => {
    let fileNameParts = file.split(".");
    if(fileNameParts[fileNameParts.length-1]!="js") reject(new Error("(" + myName + ") Not a .js file"));
    let routeName = fileNameParts[0].toLowerCase();
    app.log("Hydrating /" + routeName + "/ route",myName,6,"--->");
    app.log("1. Route count: " + Object.keys(app.routes).length,myName,6,"#");
    app.routes[routeName] = require('./' + app.locals.routesDir + '/' + file)(app);
    // app.log(app.routes[routeName],myName,6,"#");
    app.log("2. Route count: " + Object.keys(app.routes).length,myName,6,"#");
    // app.use('/' + routeName + '/',app.routes[routeName]);
    resolve(true);
  });
}

let readRouteFiles = function(files) {
  let myName = "readRouteFiles";
  let routeReadPromises = Promise.resolve();
  files.forEach(file => {
    routeReadPromises = routeReadPromises.then(data => {
      if(data!==null) routeData.push(data);
      return readRoute(file,app);
    });
  });
  return routeReadPromises;
}

/**
 * MODEL DEFINITION
 */

/**
 * MODEL ASSOCIATIONS
 * These statements determine the relationships between models.
 */

/**
 * FINAL MODEL PREP
 * Any last-minute stuff that should be done to the model(s)
 */

/**
 * CONTROLLER DEFINITIONS
 */
// let controllerFiles = fs.readdirSync(app.locals.controllersDir);
// for(let c=0;c<controllerFiles.length;c++) {
//   // Pick only certain file-types
//   let fileNameParts = controllerFiles[c].split(".");
//   if(fileNameParts[fileNameParts.length-1]!="js") continue;
//   let controllerName = fileNameParts[0].toLowerCase();
//   app.log("Hydrating " + controllerName + " controller",myName,6,"--->");
//   app.controllers[controllerName] = require("./" + app.locals.controllersDir + "/" + controllerFiles[c])(app,controllerName);
// };


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

// let routeFiles = fs.readdirSync(app.locals.routesDir);
// for(let c=0;c<routeFiles.length;c++) {
//   // Pick only certain file-types
//   let fileNameParts = routeFiles[c].split(".");
//   if(fileNameParts[fileNameParts.length-1]!="js") continue;
//   let routeName = fileNameParts[0].toLowerCase();
//   app.routes[routeName] = require('./' + app.locals.routesDir + '/' + routeFiles[c])(app);
//   app.use('/' + routeName + "/",app.routes[routeName]);
// };


readModelDir(app.locals.modelsDir)
.then(modelFiles => {
  return readModelFiles(modelFiles);
}).then(() => {
  return readControllerDir(app.locals.controllersDir);
}).then((controllerFiles) => {
  return readControllerFiles(controllerFiles);
}).then(() => {
  return associateModels();
}).then((models) => {
  return raiseModels(models);
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
    navigation.getMenu,
    function(req,res,next) {
      app.log("URL: " + req.originalUrl,myName,6);
      return next();
    }
  );
}).then(() => {
  return readRouteDir(app.locals.routesDir);
}).then((routeFiles) => {
  return readRouteFiles(routeFiles);
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
  console.log(Object.keys(app.routes));
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(r.route.path)
    }
  })
  console.log("Done!");
}).then(() => {
  app.use(
    app.tools.timeEnd,
    app.tools.render
  );  
}).catch(err => {
  app.log(err.message);
})


/**
 * YOUR APPLICATION ROUTES HERE
 *
 * This is where you would put your application's custom routes.
 */

// app.get('/profile/',app.tools.checkAuthentication,app.controllers["users"].getProfile);

/**
 * CLOSING ROUTES
 */
 // A route to fetch authorized UI elements
 // app.get('/authorizedelements/:element',appCheckAuthentication,appGetElement);

/**
 * HOME PAGE ROUTE
 */
// app.get('/',app.tools.homePage);
/**
 * CLOSE THE APP AND SHIP IT!
 */
/*
app.use(
  app.tools.timeEnd,
  app.tools.render
);
*/
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
