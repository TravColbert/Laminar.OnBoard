const fs = require('fs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = function(app,sequelize) {
  let obj = {
    name : "App",
    log : function(string,caller,debugLevel,prefix) {
      caller = caller || module.id;
      /**
       * Debug levels:
       *  0 = off
       *  1 = fatal - the thing can't and won't continue
       *  2 = error - someone needs to be woken up at 2am for this
       *  3 = warn - probably no immediate human intervention required
       *  4 = info - something normal but significant happened
       *  5 = debug - something normal and insignificant happened
       *  6 = trace - variables, if's...
       */
      debugLevel = debugLevel || 0;
      prefix = prefix || ":";
      if(debugLevel <= app.locals.logLevel) {
        return console.log(caller,prefix,string);
      }
      return false;
    },
    generateString : function(length) {
      let myName = "generateString()";
      length = parseInt(length) || 12;
      let sauce = '';
      while(sauce.length<length) {
        sauce += (Math.random()+1).toString(36).substring(2);
      }
      return sauce.substring(null,length);
    }
  };
  obj.showPath = function(req,res,next) {
    app.log("CALCULATED PATH:" + req.path,myName,6);
    return next();
  };
  obj.isFileType = function(fileName,type) {
    let myName = "isFileType";
    let extension = fileName.split('.').pop();
    return (extension==type);
  };
  obj.readDir = function(dir) {
    let myName = "readDir";
    return new Promise((resolve,reject) => {
      app.log("Reading dir: " + dir,myName,6,"##>");
      fs.readdir(dir,(err,files) => {
        if(err) reject(new Error("(" + myName + ") : " + err.message));
        if(files==undefined || files===null || files.length<1) {
          app.log("Didn't find any files. Sending an empty list",myName,5);
          resolve([]);
        }
        app.log("Found files: " + files,myName,6);
        resolve(files);
      })
    });
  };
  obj.readModel = function(file) {
    let myName = "readModel";
    return new Promise((resolve,reject) => {
      if(app.tools.isFileType(file,"js")) {
        app.log(file,myName,6,"+");
        let modelDefintion = require("./" + app.locals.modelsDir + "/" + file)(Sequelize,app);
        app.models[modelDefintion.tablename] = sequelize.define(modelDefintion.tablename,modelDefintion.schema,modelDefintion.options);
      }
      resolve(true);
    });
  };
  obj.readController = function(file) {
    let myName = "readController";
    return new Promise((resolve,reject) => {
      let fileNameParts = file.split(".");
      if(fileNameParts[fileNameParts.length-1]!="js") reject(new Error("(" + myName + ") Not a .js file"));
      let controllerName = fileNameParts[0].toLowerCase();
      app.log(controllerName,myName,6,"+");
      app.controllers[controllerName] = require("./" + app.locals.controllersDir + "/" + file)(app,controllerName);
      resolve(true);
    });
  };
  obj.readElement = function(file) {
    let myName = "readElement";
    return new Promise((resolve,reject) => {
      if(app.tools.isFileType(file,"js")) {
        let fileNameParts = file.split(".");
        let elementName = fileNameParts[0].toLowerCase();
        app.log(elementName,myName,6,"+");
        let elementDefinition = require("./" + app.locals.elementsDir + "/" + file);
        app.elements[elementName] = require("./" + app.locals.elementsDir + "/" + file);
        // app.elements[elementName] = require("./" + app.locals.elementsDir + "/" + file)(app,elementName);  
      }
      resolve(true);
    });
  };
  obj.readRoute = function(file) {
    let myName = "readRoute";
    return new Promise((resolve,reject) => {
      let fileNameParts = file.split(".");
      if(fileNameParts[fileNameParts.length-1]!="js") reject(new Error("(" + myName + ") Not a .js file"));
      let routeName = fileNameParts[0].toLowerCase();
      app.log(routeName,myName,6,"+");
      app.routes[routeName] = require('./' + app.locals.routesDir + '/' + file)(app);
      resolve(true);
    });
  };
  obj.readAssociation = function(file) {
    let myName = "readAssociation";
    return new Promise((resolve,reject) => {
      if(app.tools.isFileType(file,"js")) {
        app.log(file,myName,6,"+");
        let association = require("./" + app.locals.modelsDir + "/associations/" + file)(app);  
      }
      resolve(true);
    });
  };
  obj.readModelStartup = function(file) {
    let myName = "readModelStartup";
    return new Promise((resolve,reject) => {
      if(app.tools.isFileType(file,"js")) {
        app.log("Requiring " + file,myName,6);
        let modelStartup = require("./" + app.locals.modelsDir + "/modelstartups/" + file)(app);        
      }
      resolve(true);
    });
  };
  obj.processFiles = function(files,cb) {
    let myName = "processFiles";
    let routeReadPromises = Promise.resolve();
    files.forEach(file => {
      routeReadPromises = routeReadPromises.then(data => {
        return cb(file);
      });
    });
    return routeReadPromises;
  };
  obj.startModels = function(models) {
    let myName = "startModels";
    app.log("Starting models...",myName,6);
    let syncPromises = Promise.resolve();
    Object.keys(models).forEach(modelName => {
      app.log(modelName,myName,6);
      syncPromises = syncPromises.then(() => {
        return models[modelName].sync()
        .then((model) => {
          let modelName = model.getTableName();
          app.log(modelName + " started",myName,6);
          return(modelName);
        })
        .catch(err => {
          app.log(err.message,myName,4,"!");
          return(err);
        });
      });
    });
    return syncPromises;
  };
  obj.timeStart = function(req,res,next) {
    let myName = "timeStart()";
    req.appData.startTime = Date.now();
    app.log("app start time: " + req.appData.startTime,myName,5);
    return next();
  };
  obj.timeEnd = function(req,res,next) {
    let myName = "timeEnd()";
    req.appData.stopTime = Date.now();
    app.log("app end time: " + req.appData.stopTime,myName,5);
    return next();
  };
  obj.ignoreFavicon = function(req,res,next) {
    let myName = "ignoreFavicon()";
    app.log("ignoring favicon",myName,5);
    if(req.url=='/favicon.ico') {
      res.writeHead(200, {'Content-Type': 'image/x-icon'});
      app.log("sent favicon",myName,5);
      return res.end();
    }
    return next();
  };
  obj.getModelName = function(req) {
    let myName = "getModelName()";
    let basePath = "/" + req.path.split('/')[1] + "/";
    app.log("Base path: " + basePath,myName,6);
    return app.paths[basePath] || "/";
  };
  obj.setAppData = function(req,res,next) {
    let myName = "setAppData()";
    app.log("original request: " + req.session.originalReq,myName,4);
    app.log("clearing appData",myName,5);
    req.appData = {};
    app.log("setting app name",myName,5);
    req.appData.title = app.locals.appName;
    app.log("PATHS: " + JSON.stringify(app.paths),myName,5);
    req.appData.modelName = obj.getModelName(req);
    app.log("setting MODEL name: " + req.appData.modelName,myName,5);
    obj.clearMessageQueue(req);
    return next();
  };
  obj.checkFile = function(fileList,successCb,failureCb) {
    let myName = "checkFile()";
    if(!Array.isArray(fileList)) fileList = [fileList];
    if(fileList.length<1) {
      // app.log("exhausted template file picklist. Quitting",myName,6);
      // app.log("trying th ")
      return failureCb(data);
    }
    let file = fileList.shift();
    app.log("looking for template: " + file,myName,6);
    fs.access(app.locals.viewsDir + "/" + file + ".pug",(err) => {
      if(err) {
        app.log("couldn't find template: " + file,myName,6);
        return obj.checkFile(fileList,successCb);
      }
      app.log("found template: " + file,myName,6);
      return successCb(file);
    });
  };
  obj.render = function(req,res) {
    let myName = "render";
    let templateFile = req.appData.view || app.locals.homeView;
    app.log("Query Params: " + JSON.stringify(req.query),myName,6," >>> ");
    let format = req.query.format || "html";
    switch (format.toLowerCase()) {
      case "json":
        app.log("Rendering in JSON",myName,6);
        return res.json(req.appData);
      default:
        app.log("Rendering template: " + templateFile,myName,6);
        return res.render(templateFile,req.appData);  
    }
  },
  obj.makeMessage = function(obj) {
    let myName = "makeMessage";
    logThis(myName + ": Making a message for: " + JSON.stringify(obj));
    obj.msgId = Date.now();
    return obj;
  };
  obj.clearMessageQueue = function(req) {
    let myName = "clearMessageQueue()";
    app.log("clearing messages queue",myName,5);
    req.appData.messages = [];
    return true;
  };
  obj.setMessage = function(req,res,next) {
    let myName = "setMessage()";
    app.log("setting up messages",myName,5);
    if(req.session.hasOwnProperty("messages")) {
      if(req.session.messages.length>0) {
        app.log(JSON.stringify(req.session.messages),myName,6);
        req.appData.messages = req.session.messages;
      }
    } else {
      obj.clearMessageQueue(req);
    }
    return next();
  };
  obj.ackMesssage = function(req,res,next) {
    let myName = 'ackMesssage()';
    let msgId = req.params.msgId;
    app.log("ack'ing message: " + msgId,myName,5);
    let index = req.session.messages.findIndex(function(message) {
      return message.msgId==msgId;
    });
    if(index==-1) return res.json({'msgId':false});
    if(req.session.messages.splice(index,1).length!=1) return res.json({'msgId':false});
    return res.json({'msgId':msgId});
  };
  obj.socketSend = function(sessionId,type,message) {
    let myName = "socketSend";
    app.log("Looking for socket of session ID: " + sessionId,myName,6);
    app.log(app.socketSessions,myName,6,"| | | | >");
    let targetSockets = app.socketSessions.filter((v) => {
      return v.sessionId = sessionId;
    });
    targetSockets.forEach((targetSocket) => {
      app.log("Found a socket. Sending message: " + message + " of type: " + type,myName,6);
      app.log(targetSocket.socket.id,myName,6,": : : >");
      targetSocket.socket.emit(type,message);
    });
  };
  obj.isAuthenticated = function(req) {
    let myName = "isAuthenticated";
    app.log("Checking if session is authenticated",myName,6);
    if(!req.session.cookie) return false;
    app.log("session cookie exists...",myName,5);
    if(!req.session.user) return false;
    app.log("session user object exists...",myName,5);
    if(!req.session.user.email) return false;
    app.log("session user email exists...",myName,5);
    if(!req.session.user.id) return false;
    app.log("session user appears to be intact. Moving on...",myName,6);
    return true;
  };
  obj.checkAuthentication = function(req,res,next) {
    let myName = "checkAuthentication()";
    // app.log("checking authentication...",myName,5);
    // if(!req.session.cookie) return res.redirect("/login");
    // app.log("session cookie exists...",myName,5);
    // if(!req.session.user) return res.redirect("/login");
    // app.log("session user object exists...",myName,5);
    // if(!req.session.user.email) return res.redirect("/login");
    // app.log("session user email exists...",myName,5);
    // if(!req.session.user.id) return res.redirect("/login");
    if(!obj.isAuthenticated(req)) return res.redirect("/login");
    app.log("session user id is set...",myName,5);
    app.log("found all session info: " + req.session.user.email,myName,5);
    app.log("final confirmation that " + req.session.user.email + " user id (" + req.session.user.id + ") exists",myName,5);
    app.models["users"]
    .count({where:{email:req.session.user.email,id:req.session.user.id}})
    .then((count) => {
      app.log("Number of matching user records: " + count,myName,5);
      if(count==1) return next();
      app.log("Incorrect number of user records returned - this is a problem!",myName,3);
      return res.redirect("/login");
    });
    // return res.redirect("/login");
  };
  obj.checkAuthorization = function(capability,userId,domainId) {
    let myName = "checkAuthorization()";
    app.log("Checking if user " + userId + " is authorized to " + capability + " on domain " + domainId,myName,6);
    return new Promise((resolve,reject) => {
      let cap = {};
      cap[capability[0]] = {[Op.eq]:capability[1]};
      // The above is a way to query from within a JSON obj
      // The capability looks like this when you call it: ["create","all"]
      // So, this just makes it look like this: {"create":{[Op.eq]:"all"}}
      // [Op.eq] is a Sequelize operator
      let query = {};
      query.roles = {capabilities:cap};
      query.users = {id:userId};
      query.domains = (domainId) ? {id:domainId} : null;   // Admin user doesn't have a default domain ATM
      app.models["roles"]
      .findAll({
        where:query.roles||null,
        include:[
          {
            model:app.models["users"],
            where:query.users||null
          },
          {
            model:app.models["domains"],
            where:query.domains||null
          }
        ]
      })
      .then((roles) => {
        if(roles===null || roles.length===0) return resolve(false);
        app.log(roles.length + " roles found permitting '" + capability + "'",myName,6);
        return resolve(true);
      })
      .catch(err => {
        app.log("error looking up authorizations: " + err.message,myName,2);
        return reject(err);
      });
    })
  };
  obj.ifUserIsAuthorized = function(capability,user,cb) {
    let myName = "ifUserIsAuthorized()";
    // app.log(JSON.stringify(user));
    app.log("Checking if user " + user.id + " is authorized to: '" + capability + "' on domain: " + user.defaultDomainId,myName);

    let cap = {};
    cap[capability[0]] = {[Op.eq]:capability[1]};
    let query = {};
    query.roles = {capabilities:cap};
    query.users = {id:user.id};
    query.domains = (user.defaultDomainId) ? {id:user.defaultDomainId} : null;   // Admin user doesn't have a default domain ATM
    app.models["roles"]
    .findAll({where:query.roles||null,include:[{model:app.models["users"],where:query.users||null},{model:app.models["domains"],where:query.domains||null}]})
    .then(roles => {
      if(roles===null || roles.length===0) return cb(null,false);
      app.log(roles.length + " roles found permitting '" + capability + "'",myName,6);
      // app.log(JSON.stringify(roles));
      return cb(null,true);
    })
    .catch(err => {
      app.log("error looking up authorizations: " + err.message,myName,2);
      return cb(err);
    })
  };
  obj.setUserAccount = function(req,res,next) {
    var myName = "setUserAccount()";
    app.log("setting user account data...",myName,5);
    if(req.session.user) {
      app.log("user: " + req.session.user.email + " id: " + req.session.user.id,myName,5);
      req.appData.account = req.session.user.email;
      req.appData.accountNum = req.session.user.id;
    }
    return next();
  };
  obj.setCurrentDomain = function(req,res,next) {
    let myName = "setCurrentDomain()";
    app.log("Setting current domain",myName,6);
    // Is there a user?
    if(req.session.user) {
      // Get user's enrollments
      app.controllers["users"].getUserRoles(req.session.user.id)
      .then((user) => {
        if(user===null) return res.send("Couldn't find this user (even though session data is set)");
        return app.controllers["users"].compileDomainList(user);
      })
      .then(domainList => {
        if(req.session.user.hasOwnProperty("switchDomain")) {
          app.log("Found a switch-domain request for: " + req.session.user.switchDomain,myName,6," - - - ");
          targetDomainId = req.session.user.switchDomain;
        } else if(req.session.user.defaultDomainId!==null) {
          app.log("No switch-domain request found. Looking for a defaultDomain: " + req.session.user.defaultDomainId,myName,6," - - - ")
          targetDomainId = req.session.user.defaultDomainId;
        } else {
          app.log("No default domain set. Chosing the first on the list: " + domainList[0].id,myName,6);
          targetDomainId = domainList[0].id;
        }
        //app.log("Domain List: " + domainList,myName,6);
        app.log("Target domain is: " + targetDomainId,myName,6);
        let switchTo = domainList.filter(v => {
          //app.log("Domain ID: " + v.id,myName,6);
          return (v.id==targetDomainId);
        });
        app.log("Switching to this: " + switchTo,myName,6,":::>");
        // app.log("Switchto: " + switchTo[0].id);
        if(switchTo && switchTo[0].id) {
          app.log("Setting");
          req.session.user.currentDomain=switchTo[0];
        }
        req.session.user.domains = domainList;
        app.log("Session's current domain is ==> " + req.session.user.currentDomain.name,myName,6);  
        req.appData.user = req.session.user;
        return next();  
        // let domainList = app.controllers["users"].compileDomainList(user);
      })
      .catch((err) => {
        // some error
        app.log("There was an error!: " + err.message);
        return res.send("This is the reason why we can't continue: " + err.message);
      })
    } else {
      // probably user is not logged-in
      app.log("I guess there's no user right now... moving on...",myName,6);
      return next();
    }
  },
  obj.switchToDomain = function(req,res,next) {
    let myName = "switchToDomain()";
    app.log("Request to set current domain to: " + req.params.domainId,myName,6);
    domainId = app.controllers["users"].requestNewDomain(req.session.user,req.params.domainId);
    app.log(domainId + ":" + req.params.domainId,myName,6);
    if(domainId==req.params.domainId) {
      req.session.user.switchDomain = domainId;
      app.log("Domain-switch request granted for domain " + req.session.user.switchDomain,myName,6);
    }
    return res.redirect("/");
  },
  obj.setSessionData = function(req,res,next) {
    let myName = "setSessionData()";
    app.log("Setting base session data... ",myName,6);
    if(!req.session.views) req.session.views = 0;
    req.session.views++;
    app.log("Views: " + req.session.views,myName,6);

    if(req.session.user) {
      app.log("==== SETTING USER-SPECIFIC ENROLLMENTS IN SESSION DATA: ====",myName,6);
      // req.appData.user = req.session.user;
      /* Prepare a call-back function that will continue the login process by
       * collecting all the domains that the authenticated user has access to.
       */
      let cb = function(err,user) {  // domain list is in user
        if(err) return res.send(err.message);
        if(user===null) return res.send("No user found");
        let domainList = [];
        for(let c=0;c<user.roles.length;c++) {
          for(let i=0;i<user.roles[c].domains.length;i++) {
            domainList.push(user.roles[c].domains[i]);
            if(user.roles[c].domains[i].id==req.session.user.defaultDomainId) req.session.user.currentDomain = user.roles[c].domains[i];
          }
        }
        req.session.user.domains = domainList;
        if(!req.session.user.currentDomain) req.session.user.currentDomain = domainList[0];
        app.log("Session's current domain is ==> " + req.session.user.currentDomain.name,myName,6);
        return next();
      }
      return app.controllers["users"].getUserEnrollments(req.session.user.id,cb);
    }

    // app.log("User: " + req.appData.user,myName,6);
    return next();
  };
  obj.printSessionData = function(req,res,next) {
    var myName = "printSessionData()";
    app.log("session: " + JSON.stringify(req.session),myName,5);
    return next();
  };
  obj.homePage = function(req,res,next) {
    let myName = "homePage()";
    app.log("queueing home page",myName,5);
    req.appData.sessionId = req.session.id;
    req.appData.view = app.locals.homeView;

    if(app.homeModule) {
      app.log("Invoking included home module",myName,6,"+ + + >");
      return app.homeModule.home(req,res,next);
    }

    if(req.session.user) {
      app.controllers.invites.checkInvites(req.session.user.email)
      .then(invites => {
        app.log(invites,myName,6);
        req.appData.invites = invites;
        return next();
      })
      .catch(err => {
        app.log(err.message);
        return res.send(err.message);
      });  
    } else {
      return next();  
    }
  };
  obj.loginPage = function(req,res,next) {
    let myName = "loginPage()";
    app.log("queueing login page",myName,5);
    // let salt = bcrypt.genSaltSync(10);
    req.appData.view = "login";
    req.appData.secretSauce = obj.generateString(12);
    return next();
  };
  obj.logoutPage = function(req,res,next) {
    let myName = "logoutPage()";
    app.log("queueing log-out",myName,5);
    app.controllers["users"].logout(req,res,next);
    // req.logout();
    return res.redirect('/');
  };
  /**
   * This function is meant to be used in route lines
   * It returns a function that returns the named view.
   * @param {*} view
   */
  obj.showPage = function(view) {
    return function(req,res,next) {
      let myName = "showPage" + view;
      req.appData.view = view;
      return next();
    };
  };
  obj.showForm = function(req,res,next) {
    let myName = "showForm";
    let model = req.params.model || null;
    if(!model) return res.redirect("/");
    // let model = req.params.model;
    let action = req.params.action || 'create';
    app.log("Requesting form: " + model + action);
    app.tools.checkAuthorization([action,"all"],req.session.user.id,req.session.user.currentDomain.id)
    // Eventually the above will test for an model type: app.tools.checkAuthorization([action,__a_model__]....
    .then((response) => {
      if(!response) {
        app.log("User failed authorization check",myName,6);
        return resolve([]);
      }
      app.log("User is authorized to show form: " + model + action,myName,6);
      app.models["domains"]
      .findById(req.session.user.currentDomain.id)
      .then(domain => {
        if(domain===null) return res.send("Couldn't determine a valid domain");
        domain.getRoles().then(roles => {
          if(roles===null || roles.length===0) return res.send("No roles found");
          // req.appData.user = req.session.user;
          req.appData.domain = domain;
          req.appData.roles = roles;
          req.appData.view = model + action;
          return next();
        })
      });
    })
    .catch((err) => {
      return res.send("Not authorized");
    });
  };
  obj.getElement = function(req,res,next) {
    let myName = "appGetElement";
    app.log("App Elements:\n" + JSON.stringify(app.elements),myName,6);
    if(app.elements.hasOwnProperty(req.params.element)) {
      app.log("Found element: " + req.params.element,myName,6);
      app.tools.checkAuthorization(app.elements[req.params.element].role,req.session.user.id,req.session.user.currentDomain.id)
      .then(authorized => {
        if(!authorized) {
          app.log("User failed authorization check",myName,6);
          return next();
        }
        app.log(myName + ": Authorized for request: " + req.method + ":" + req.route.path);
        // let element = fetchElement(req.params.element);
        // let element = app.elements[req.params.element];
        app.log(myName + ": Sending element: " + JSON.stringify(app.elements[req.params.element]));
        return res.json(app.elements[req.params.element]);
      })
      .catch(err => {
        app.log(err.message,myName,4);
        return res.json({'error':err.message});
      });
      // if(isAuthorized(req,authElements[req.params.element].role)) {
      //   logThis(myName + ": Authorized for request: " + req.method + ":" + req.route.path);
      //   // let element = fetchElement(req.params.element);
      //   // let element = app.elements[req.params.element];
      //   logThis(myName + ": Sending element: " + JSON.stringify(app.elements[req.params.element]));
      //   return res.json(app.elements[req.params.element]);
      // }
    }
    // app.log(myName + "NOT Authorized for request: " + req.method + ":" + req.route.path,myName,4);
    // return res.json({
    //   'error':"Not authorized"
    // });
  };
  obj.setOriginalUrl = function(req,res,next) {
    let myName = "setOriginalUrl()";
    app.log("got a request of type: " + req.protocol + " :" + req.method + " TO: " + req.originalUrl + " URL: " + req.url,myName,4);
    // app.log();
    if(req.session) {
      // app.log("session: " + JSON.stringify(req.session),myName,5);
      req.session.originalReq = (req.originalUrl!="/login") ? req.originalUrl : req.session.originalReq;
      // app.log("session: " + req.session.originalReq);
    }
    return next();
  };
  obj.redirectToOriginalReq = function(req,res) {
    let myName = "redirectToOriginalReq()";
    app.log("Original request: " + req.session.originalReq,myName,5);
    let redirectTo = req.session.originalReq || '/';
    if(redirectTo=="/login" || redirectTo=="/login/") {
      app.log("original request was " + redirectTo + " but redirecting to /",myName,6);
      redirectTo = "/";
    }
    app.log("queueing to original request: " + redirectTo,myName,5);
    return res.redirect(redirectTo);
  };
  obj.secureTest = function(req,res,next) {
    var myName = "secureTest";
    app.log("Request to render secure test page",myName);
    req.appData.view = "secure";
    return next();
  };
  obj.pullParams = function(obj,arr) {
    let myName = "pullParams";
    let returnObj = {};
    arr.forEach(function(v,i,a) {
      if(obj.hasOwnProperty(v)) {
        returnObj[v] = obj[v];
      } else {
        return false;
      }
    });
    return returnObj;
  };
  obj.addProperties = function(inObj,propertyArray,outObj) {
    let myName = "addProperties";
    outObj = outObj || {};
    if(inObj===null || inObj===undefined) return {};
    if(propertyArray===null || propertyArray===undefined) return inObj;
    if(!Array.isArray(propertyArray)) propertyArray = [propertyArray];
    propertyArray.forEach((prop) => {
      if(inObj.hasOwnProperty(prop)) outObj[prop] = inObj.prop;
    });
    return outObj;
  };
  obj.errorHandler = function(err,req,res,next) {
    let myName = "errorHandler()";
    if(!err) return next();
    app.log(err,myName,2,"!");
    // responseString += "!!" + err;
    return res.redirect('/');
  };
  app.log = function(string,caller,debugLevel,prefix) {
    caller = caller || this.name;
    debugLevel = debugLevel || 6;
    return obj.log(string,caller,debugLevel,prefix);
  };
  app.checkFileList = function(fileList,callBack) {
    return obj.checkFile(fileList,callBack);
  }
  return obj;
};
