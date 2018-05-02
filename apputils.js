const fs = require('fs');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = function(app) {
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
    app.log("Rendering template: " + templateFile,myName,5);
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
    app.models["users"].count({where:{email:req.session.user.email,id:req.session.user.id}}).then((count) => {
      obj.logThis("Number of matching user records: " + count,myName,5);
      if(count==1) return next();
      obj.logThis("Incorrect number of user records returned - this is a problem!",myName,3);
      return res.redirect("/login");
    });
    // return res.redirect("/login");
  };

  obj.ifUserIsAuthorized = function(capability,user,cb) {
    let myName = "ifUserIsAuthorized()";
    app.log(JSON.stringify(user));
    app.log("Checking if user " + user.id + " is authorized to: '" + capability + "' on domain: " + user.defaultDomainId,myName);

    let cap = {};
    cap[capability[0]] = {[Op.eq]:capability[1]};

    let query = {};
    query.roles = {capabilities:cap};
    query.users = {id:user.id};
    query.domains = (user.defaultDomainId) ? {id:1} : null;   // Admin user doesn't have a default domain ATM
    app.models["roles"]
    .findAll({where:query.roles||null,include:[{model:app.models["users"],where:query.users||null},{model:app.models["domains"],where:query.domains||null}]})
    .then(roles => {
      if(roles===null) return cb(null,false);
      app.log(JSON.stringify(roles));
      return cb(null,true);
    })
    .catch(err => {
      app.log("error looking up authorizations: " + err.message,myName,2);
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
  obj.setSessionData = function(req,res,next) {
    let myName = "setSessionData()";
    if(!req.appData.views) {
      req.appData.views = 0;
    }
    req.appData.views++;
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
    if(req.session.user) {
      req.appData.user = req.session.user;
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
          }
        }
        req.appData.domains = domainList;
        return next();
      }
      return app.controllers["users"].fetchDomainsByUserId(req.session.user.id,cb);
    }
    req.appData.view = "home";
    return next();
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
  obj.showPage = function(view) {
    return function(req,res,next) {
      let myName = "showPage" + view;
      req.appData.view = view;
      return next();
    };
  };
  obj.setOriginalUrl = function(req,res,next) {
    let myName = "setOriginalUrl()";
    obj.logThis("got a request of type: " + req.protocol + " :" + req.method + " TO: " + req.originalUrl + " URL: " + req.url,myName,4);
    // obj.logThis();
    if(req.session) {
      obj.logThis("session: " + JSON.stringify(req.session),myName,5);
      req.session.originalReq = (req.originalUrl!="/login") ? req.originalUrl : req.session.originalReq;
      obj.logThis("session: " + req.session.originalReq);
    }
    return next();
  };
  obj.redirectToOriginalReq = function(req,res) {
    let myName = "redirectToOriginalReq()";
    app.log("Original request: " + req.session.originalReq,myName,5);
    let redirectTo = req.session.originalReq || '/';
    if(redirectTo=="/login" || redirectTo=="/login/") {
      app.log("original request was " + redirectTo + " but redirecting to /");
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
    let returnObj = {};
    arr.forEach(function(v,i,a) {
      if(obj.hasOwnProperty(v)) {
        returnObj[v] = obj[v];
      } else {
        return false;
      }
    });
    // console.log(returnObj);
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
