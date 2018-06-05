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
    obj.logThis("CALCULATED PATH:" + req.path,myName,6);
    return next();
  };
  obj.logThis = function(string,caller,debugLevel) {
    return this.log(string,caller,debugLevel,">");
  };
  obj.readDir = function(dir) {
    let myName = "readDir";
    return new Promise((resolve,reject) => {
      fs.readdir(dir,(err,files) => {
        if(err) reject(new Error("(" + myName + ") : " + err.message));
        obj.logThis("Found files: " + files,myName,6);
        resolve(files)
      })
    });
  };
  obj.readModel = function(file) {
    let myName = "readModel";
    return new Promise((resolve,reject) => {
      app.log("Requiring " + file,myName,6,"::>");
      let modelDefintion = require("./" + app.locals.modelsDir + "/" + file)(Sequelize,app);
      app.models[modelDefintion.tablename] = sequelize.define(modelDefintion.tablename,modelDefintion.schema,modelDefintion.options);
      resolve(true);
    });
  };
  obj.startModels = function(models) {
    let myName = "startModels";
    obj.logThis("Starting models...",myName,6);
    let syncPromises = Promise.resolve();
    Object.keys(models).forEach(modelName => {
      syncPromises = syncPromises.then(() => {
        app.log("sync'ing model: " + modelName,myName,6,"::>");
        return(models[modelName].sync());
      });
    });
    return syncPromises;
  };
  obj.readController = function(file) {
    let myName = "readController";
    return new Promise((resolve,reject) => {
      let fileNameParts = file.split(".");
      if(fileNameParts[fileNameParts.length-1]!="js") reject(new Error("(" + myName + ") Not a .js file"));
      let controllerName = fileNameParts[0].toLowerCase();
      app.log("Assigning controller: " + controllerName,myName,6,"+");
      app.controllers[controllerName] = require("./" + app.locals.controllersDir + "/" + file)(app,controllerName);
      resolve(true);
    });
  };
  obj.readRoute = function(file) {
    let myName = "readRoute";
    return new Promise((resolve,reject) => {
      let fileNameParts = file.split(".");
      if(fileNameParts[fileNameParts.length-1]!="js") reject(new Error("(" + myName + ") Not a .js file"));
      let routeName = fileNameParts[0].toLowerCase();
      obj.logThis("Hydrating /" + routeName + "/ route",myName,6,"--->");
      app.routes[routeName] = require('./' + app.locals.routesDir + '/' + file)(app);
      resolve(true);
    });
  }
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
  obj.timeStart = function(req,res,next) {
    let myName = "timeStart()";
    req.appData.startTime = Date.now();
    obj.logThis("app start time: " + req.appData.startTime,myName,5);
    return next();
  };
  obj.timeEnd = function(req,res,next) {
    let myName = "timeEnd()";
    req.appData.stopTime = Date.now();
    obj.logThis("app end time: " + req.appData.stopTime,myName,5);
    return next();
  };
  obj.ignoreFavicon = function(req,res,next) {
    let myName = "ignoreFavicon()";
    obj.logThis("ignoring favicon",myName,5);
    if(req.url=='/favicon.ico') {
      res.writeHead(200, {'Content-Type': 'image/x-icon'});
      obj.logThis("sent favicon",myName,5);
      return res.end();
    }
    return next();
  };
  obj.getModelName = function(req) {
    let myName = "getModelName()";
    let basePath = "/" + req.path.split('/')[1] + "/";
    obj.logThis("Base path: " + basePath,myName,6);
    return app.paths[basePath] || "/";
  };
  obj.setAppData = function(req,res,next) {
    let myName = "setAppData()";
    obj.logThis("original request: " + req.session.originalReq,myName,4);
    obj.logThis("clearing appData",myName,5);
    req.appData = {};
    obj.logThis("setting app name",myName,5);
    req.appData.title = app.locals.appName;
    obj.logThis("PATHS: " + JSON.stringify(app.paths),myName,5);
    req.appData.modelName = obj.getModelName(req);
    obj.logThis("setting MODEL name: " + req.appData.modelName,myName,5);
    obj.clearMessageQueue(req);
    return next();
  };
  obj.checkFile = function(fileList,successCb,failureCb) {
    let myName = "checkFile()";
    if(!Array.isArray(fileList)) fileList = [fileList];
    if(fileList.length<1) {
      // obj.logThis("exhausted template file picklist. Quitting",myName,6);
      // obj.logThis("trying th ")
      return failureCb(data);
    }
    let file = fileList.shift();
    obj.logThis("looking for template: " + file,myName,6);
    fs.access(app.locals.viewsDir + "/" + file + ".pug",(err) => {
      if(err) {
        obj.logThis("couldn't find template: " + file,myName,6);
        return obj.checkFile(fileList,successCb);
      }
      obj.logThis("found template: " + file,myName,6);
      return successCb(file);
    });
  };
  obj.render = function(req,res) {
    let myName = "render()";
    // let templateFile = req.appData.view || "index";
    let templateFile = req.appData.view || app.locals.homeView;
    obj.logThis(req.appData);
    obj.logThis("Rendering template: " + templateFile,myName,5);
    return res.render(templateFile,req.appData);
  },
  obj.makeMessage = function(obj) {
    let myName = "makeMessage";
    logThis(myName + ": Making a message for: " + JSON.stringify(obj));
    obj.msgId = Date.now();
    return obj;
  };
  obj.clearMessageQueue = function(req) {
    let myName = "clearMessageQueue()";
    obj.logThis("clearing messages queue",myName,5);
    req.appData.messages = [];
    return true;
  };
  obj.setMessage = function(req,res,next) {
    let myName = "setMessage()";
    obj.logThis("setting up messages",myName,5);
    if(req.session.hasOwnProperty("messages")) {
      if(req.session.messages.length>0) {
        obj.logThis(JSON.stringify(req.session.messages),myName,6);
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
    obj.logThis("ack'ing message: " + msgId,myName,5);
    let index = req.session.messages.findIndex(function(message) {
      return message.msgId==msgId;
    });
    if(index==-1) return res.json({'msgId':false});
    if(req.session.messages.splice(index,1).length!=1) return res.json({'msgId':false});
    return res.json({'msgId':msgId});
  };
  obj.checkAuthentication = function(req,res,next) {
    let myName = "checkAuthentication()";
    obj.logThis("checking authentication...",myName,5);
    if(!req.session.cookie) return res.redirect("/login");
    obj.logThis("session cookie exists...",myName,5);
    if(!req.session.user) return res.redirect("/login");
    obj.logThis("session user object exists...",myName,5);
    if(!req.session.user.email) return res.redirect("/login");
    obj.logThis("session user email exists...",myName,5);
    if(!req.session.user.id) return res.redirect("/login");
    obj.logThis("session user id is set...",myName,5);
    obj.logThis("found all session info: " + req.session.user.email,myName,5);
    obj.logThis("final confirmation that " + req.session.user.email + " user id (" + req.session.user.id + ") exists",myName,5);
    app.models["users"]
    .count({where:{email:req.session.user.email,id:req.session.user.id}})
    .then((count) => {
      obj.logThis("Number of matching user records: " + count,myName,5);
      if(count==1) return next();
      obj.logThis("Incorrect number of user records returned - this is a problem!",myName,3);
      return res.redirect("/login");
    });
    // return res.redirect("/login");
  };
  obj.checkAuthorization = function(capability,userId,domainId) {
    let myName = "checkAuthorization()";
    obj.logThis("Checking if user " + userId + " is authorized to " + capability + " on domain " + domainId,myName,6);
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
        obj.logThis(roles.length + " roles found permitting '" + capability + "'",myName,6);
        return resolve(true);
      })
      .catch(err => {
        obj.logThis("error looking up authorizations: " + err.message,myName,2);
        return reject(err);
      });
    })
  };
  obj.ifUserIsAuthorized = function(capability,user,cb) {
    let myName = "ifUserIsAuthorized()";
    // obj.logThis(JSON.stringify(user));
    obj.logThis("Checking if user " + user.id + " is authorized to: '" + capability + "' on domain: " + user.defaultDomainId,myName);

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
      obj.logThis(roles.length + " roles found permitting '" + capability + "'",myName,6);
      // obj.logThis(JSON.stringify(roles));
      return cb(null,true);
    })
    .catch(err => {
      obj.logThis("error looking up authorizations: " + err.message,myName,2);
      return cb(err);
    })
  };
  obj.setUserAccount = function(req,res,next) {
    var myName = "setUserAccount()";
    obj.logThis("setting user account data...",myName,5);
    if(req.session.user) {
      obj.logThis("user: " + req.session.user.email + " id: " + req.session.user.id,myName,5);
      req.appData.account = req.session.user.email;
      req.appData.accountNum = req.session.user.id;
    }
    return next();
  };
  obj.setCurrentDomain = function(req,res,next) {
    let myName = "setCurrentDomain()";
    obj.logThis("Setting current domain",myName,6);
    // Is there a user?
    if(req.session.user) {
      // Get user's enrollments
      app.controllers["users"].getUserRoles(req.session.user.id)
      .then((user) => {
        if(user===null) return res.send("Couldn't find this user (even though session data is set)");
        let domainList = app.controllers["users"].compileDomainList(user);
        //app.controllers["users"].setCurrentDomain(domainId);
        if(req.session.user.hasOwnProperty("switchDomain")) {
          obj.logThis("Found a switch-domain request for: " + req.session.user.switchDomain,myName,6," - - - ");
          targetDomainId = req.session.user.switchDomain;
        } else if(req.session.user.defaultDomainId!==null) {
          obj.logThis("No switch-domain request found. Looking for a defaultDomain: " + req.session.user.defaultDomainId,myName,6," - - - ")
          targetDomainId = req.session.user.defaultDomainId;
        } else {
          obj.logThis("No default domain set. Chosing the first on the list: " + domainList[0].id,myName,6);
          targetDomainId = domainList[0].id;
        }
        //obj.logThis("Domain List: " + domainList,myName,6);
        obj.logThis("Target domain is: " + targetDomainId,myName,6);
        let switchTo = domainList.filter(v => {
          //obj.logThis("Domain ID: " + v.id,myName,6);
          return (v.id==targetDomainId);
        });
        obj.logThis("Switching to this: " + switchTo,myName,6,":::>");
        // obj.logThis("Switchto: " + switchTo[0].id);
        if(switchTo && switchTo[0].id) {
          obj.logThis("Setting");
          req.session.user.currentDomain=switchTo[0];
        }
        req.session.user.domains = domainList;
        obj.logThis("Session's current domain is ==> " + req.session.user.currentDomain.name,myName,6);
        req.appData.user = req.session.user;
        return next();
      })
      .catch((err) => {
        // some error
        obj.logThis("There was an error!: " + err.message);
        return res.send("This is the reason why we can't continue: " + err.message);
      })
    } else {
      // probably user is not logged-in
      obj.logThis("I guess there's no user right now... moving on...",myName,6);
      return next();
    }
  },
  obj.switchToDomain = function(req,res,next) {
    let myName = "switchToDomain()";
    obj.logThis("Request to set current domain to: " + req.params.domainId,myName,6);
    domainId = app.controllers["users"].requestNewDomain(req.session.user,req.params.domainId);
    obj.logThis(domainId + ":" + req.params.domainId,myName,6);
    if(domainId==req.params.domainId) {
      req.session.user.switchDomain = domainId;
      obj.logThis("Domain-switch request granted for domain " + req.session.user.switchDomain,myName,6);
    }
    return res.redirect("/");
  },
  obj.setSessionData = function(req,res,next) {
    let myName = "setSessionData()";
    obj.logThis("Setting base session data... ",myName,6);
    if(!req.session.views) req.session.views = 0;
    req.session.views++;
    obj.logThis("Views: " + req.session.views,myName,6);

    if(req.session.user) {
      obj.logThis("==== SETTING USER-SPECIFIC ENROLLMENTS IN SESSION DATA: ====",myName,6);
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
        obj.logThis("Session's current domain is ==> " + req.session.user.currentDomain.name,myName,6);
        return next();
      }
      return app.controllers["users"].getUserEnrollments(req.session.user.id,cb);
    }

    // obj.logThis("User: " + req.appData.user,myName,6);
    return next();
  };
  obj.printSessionData = function(req,res,next) {
    var myName = "printSessionData()";
    obj.logThis("session: " + JSON.stringify(req.session),myName,5);
    return next();
  };
  obj.homePage = function(req,res,next) {
    let myName = "homePage()";
    obj.logThis("queueing home page",myName,5);
    req.appData.view = app.locals.homeView;
    if(app.homeModule) {
      app.log("Invoking included home module",myName,6,"+ + + >");
      return app.homeModule.home(req,res,next);
    }
    return next();
    // if(req.session.user) {
    //   app.controllers["notes"].getNotes(req.session.user.id,req.session.user.currentDomain.id)
    //   .then((notes) => {
    //     if(!notes) {
    //       obj.logThis("No notes collected");
    //       req.appData.notes = null;
    //     } else {
    //       obj.logThis("Found some notes");
    //       req.appData.notes = notes;
    //     }
    //     return next();
    //   })
    //   .catch((err) => {
    //     obj.logThis(err.message);
    //     return res.send("Error: " + err.message);
    //   });
    // } else {
    //   return next();
    // }
  };
  obj.loginPage = function(req,res,next) {
    let myName = "loginPage()";
    obj.logThis("queueing login page",myName,5);
    // let salt = bcrypt.genSaltSync(10);
    req.appData.view = "login";
    req.appData.secretSauce = obj.generateString(12);
    return next();
  };
  obj.logoutPage = function(req,res,next) {
    let myName = "logoutPage()";
    obj.logThis("queueing log-out",myName,5);
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
    let myName = "showForm()";
    let model = req.params.model || null;
    let action = req.params.action || 'create';
    obj.logThis("Requesting form: " + model + action);
    app.tools.checkAuthorization([action,"all"],req.session.user.id,req.session.user.currentDomain.id)
    .then((response) => {
      if(!response) {
        obj.logThis("User failed authorization check",myName,6);
        return resolve([]);
      }
      obj.logThis("User is authorized to show form: " + model + action,myName,6);
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
  obj.setOriginalUrl = function(req,res,next) {
    let myName = "setOriginalUrl()";
    obj.logThis("got a request of type: " + req.protocol + " :" + req.method + " TO: " + req.originalUrl + " URL: " + req.url,myName,4);
    // obj.logThis();
    if(req.session) {
      // obj.logThis("session: " + JSON.stringify(req.session),myName,5);
      req.session.originalReq = (req.originalUrl!="/login") ? req.originalUrl : req.session.originalReq;
      // obj.logThis("session: " + req.session.originalReq);
    }
    return next();
  };
  obj.redirectToOriginalReq = function(req,res) {
    let myName = "redirectToOriginalReq()";
    obj.logThis("Original request: " + req.session.originalReq,myName,5);
    let redirectTo = req.session.originalReq || '/';
    if(redirectTo=="/login" || redirectTo=="/login/") {
      obj.logThis("original request was " + redirectTo + " but redirecting to /",myName,6);
      redirectTo = "/";
    }
    obj.logThis("queueing to original request: " + redirectTo,myName,5);
    return res.redirect(redirectTo);
  };
  obj.secureTest = function(req,res,next) {
    var myName = "secureTest";
    obj.logThis("Request to render secure test page",myName);
    req.appData.view = "secure";
    return next();
  };
  obj.pullParams = function(obj,arr) {
    let myName = "pullParams()";
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
  obj.errorHandler = function(err,req,res,next) {
    let myName = "errorHandler()";
    if(!err) return next();
    obj.logThis(err,myName,2,"!");
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
