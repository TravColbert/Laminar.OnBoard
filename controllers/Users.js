// const fs = require('fs');
const bcrypt = require('bcrypt');

module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  let defaultRoleAtRegistration = "applicant";
  obj = {
    authenticate : function(req,res,next) {
      app.log("Authenticating user: " + req.body.email);
      app.models[model].findOne({where:{email:req.body.email}}).then((user) => {
        app.log("info: Checking password: %s with %s",req.body.password,user.password);
        bcrypt.compare(req.body.password,user.password,(err,match) => {
          if(err) {
            app.log("Some kind of error in bcrypt...");
            return false;
          }
          app.log(match);
          if(match) {
            req.session.user = {
              id:user.id,
              email:user.email
            };
            app.log(req.originalUrl + " : " + req.session.originalReq);
            // req.appData.view = "home";
            return next();
          }
          app.log("Authenticate failed!");
          req.appData.view = "login";
          return next();
          // return res.redirect('/login/');
          // return cb(new Error("Incorrect username or password"));
        });
      });
    },
    cryptPassword : function(password) {
      app.log("cryptPassword: " + password);
      return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
          if (err) return reject(err);
          app.log("Encrypting " + password + " with " + salt + "...");
          bcrypt.hash(password, salt, (err, hash) => {
            if (err) return reject(err);
            app.log("Got this: " + hash);
            return resolve(hash);
          });
        });
      });
    },
    registerUser : function(req,res,next) {
      let myName = "registerUser()";
      app.log("Registering user",myName,5);
      // Check that all required fields are present...
      let userRegistrationObj = app.tools.pullParams(req.body,["email","firstname","lastname","password","passwordverify"]);
      if(!userRegistrationObj) return res.send("Required field missing... try again");
      // Check that the passwords are verified...
      if(userRegistrationObj.password!=userRegistrationObj.passwordverify) return res.send("Passwords do not match... try again");
      // That the email address has not been used already...
      app.models[model].count({where:{email:userRegistrationObj.email}}).then((count) => {
        if(count>0) return res.send("An account with this email already exists... try again");
        app.log("Email address is free to use. Continuing with registration...",myName,5);
        delete userRegistrationObj.passwordverify;
        // app.log(JSON.stringify(userRegistrationObj),myName,5);
        // Since this is a registration, we want to set the user's role to 'applicant'
        app.models["roles"].findOne({where:{name:defaultRoleAtRegistration}}).then(function(record) {
          if(record==null) return res.send("Error - can't assign applicant role to new user");
          userRegistrationObj.roleId = record.id;
          app.models[model].create(userRegistrationObj).then((record) => {
            req.appData.view = "registrationComplete";
            return next();
            // ...or you could re-direct with res.redirect("/.../.../");
          });
        });
      });
    },
    getProfile : function(req,res,next) {
      let myName = "getProfile()";
      // Get the user ID from the session
      app.log(JSON.stringify(req.session.user),myName,5);
      // Query for the user's data
      let userObj = app.tools.pullParams(req.session.user,["id","email"]);
      app.models[model].findOne({where:userObj}).then(record => {
        // This may not be the exact way to catch an error...
        if(!record) res.send("There was some kind of error");
        delete record.password; // Hide password? Maybe a better way???
        app.log("Found a user: " + JSON.stringify(record));
        req.appData.user = record;
        // Render it
        req.appData.view = "profile";
        return next();
      });
    },
    getUsers : function(req,res,next) {
      let myName = "getUsers()";
      // Get all users
      app.log("Getting all users",myName,6);
      app.models[model].findAll()
      .then(function(records) {
        app.log("Found " + records.length + " users",myName,6);
        req.appData.users = records;
        // req.appData.users = records.toJSON();
        req.appData.view = "users";
        return next();
      });
    },
    getUser : function(req,res,next) {
      let myName = "getUser()";
      // Get one user by ID
      let userObj = app.tools.pullParams(req.params,["id"]);
      app.log("Getting user with ID: " + userObj.id,myName,6);
      app.models[model].findOne({
        where:userObj,
        include: [
          {model:app.models["roles"]}
        ]
      })
      .then(function(record){
        app.log(JSON.stringify(record));
        // 'findOne()' returns an object - not an array
        if(record!=null) {
          req.appData.user = record.toJSON();
          req.appData.view = "profile";
          return next();  
        }
        app.log("Couldn't find a user...",myName,4);
        return res.redirect("/users/");
      });
    },
    editUserForm : function(req,res,next) {
      let myName = "editUserForm()";
      // We have to mainly collect the role information for the user
      let userObj = app.tools.pullParams(req.params,["id"]);
      app.log("Getting user with ID: " + userObj.id,myName,6);
      app.models[model].findOne({
        where:userObj,
        include:[
          {model:app.models["roles"]}
        ]
      })
      .then(function(record) {
        if(record!=null) {
          // Get a list of roles
          app.models["roles"].findAll()
          .then(function(roleList) {
            req.appData.user = record;
            req.appData.roles = roleList;
            req.appData.view = "usersedit";
            return next();
          });
        } else {
          app.log("Couldn't find a user...",myName,4);
          return res.redirect("/users/");  
        }
      })
    },
    editUser : function(req,res,next) {
      let myName = "userUser()";
      let userObj = app.tools.pullParams(req.body,["id","firstname","lastname","roleId"]);
      let requestedUser = req.params.id;
      app.log(userObj.id + " " + requestedUser);
      if(userObj.id!=requestedUser) return res.send("Didn't request the requested user");
      delete userObj.id;
      app.models["users"]
      .update(userObj,{where:{id:req.params.id},include:[{model:app.models["roles"]}]})
      .then(function(records) {
        return res.redirect("/users/" + requestedUser + "/");
      });
    },
    logout : function(req,res,next) {
      // app.log(JSON.stringify(req.session));
      // Bruteish method of detroying session...
      // delete req.session.user;
      // This might be the better way...
      req.session.destroy((err) => {
        if(err) {
          app.log("Couldn't destroy session! Punting!");
          // return false;
          req.appData.view = "home";
          return next();
        }
        app.log("Session destroyed");
        // return true;
        req.appData.view = "home";
        return next();
      });
    },
    fetch : function(req,res,next) {
      app.models[model].findAll(req.searchOptions).then((results) => {
        app.log(results.length + " records found",myName,6);
        if(results.length) {
          req.appData.result.rows = results;
          app.log("SQL GET RESULTS:",myName,6);
          app.log(req.appData.result.rows);
          return next();
        }
        delete req.params.id;
        return obj.get(req,res,next);
      });
    },
    post : function(req,res,next) {
      app.log("STUFF TO BE EDITED?:");
      app.log(JSON.stringify(req.body));
      app.log(req.appData.viewFunction);
      app.log("Model ought to be: " + req.appData.view);
      if(req.appData.viewFunction=="edit") {
        app.models[req.appData.view].update(req.body,req.searchOptions).then((results) => {
          req.params = {id:req.searchOptions.where.id}
          let myModel = req.appData.view;
          return next();
        });
      } else if(req.appData.viewFunction=="add") {
        app.models[req.appData.view].upsert(req.body).then((results) => {
          let myModel = req.appData.view;
          return next();
        });
      } else if(req.appData.viewFunction=="delete") {
        app.models[req.appData.view].destroy(req.searchOptions).then((results) => {
          delete req.params.id;
          return next();
        })
      }
    },
    add : function(req,res,next) {
      app.log("add!!!! " + myName);
      app.log("My Model: " + myModel,myName,6);
      if(!req.appData.result) req.appData.result = {};
      req.appData.viewFunction = "add";
      req.appData.view = myModel;
      req.appData.method = req.method;
      req.appData.result.schema = app.modelDefinitions[myModel].schema;
      req.appData.result.path = req.path;
      req.searchOptions = {};
      if(req.method.toLowerCase()=="get") {
        // Build the elements that will build a add form
        // Go to the 'add item' view...
        req.appData.result.rows = [""];
        return next();
      } else if(req.method.toLowerCase()=="post") {
        // There should be some data in the req body to create a new item...
        // Do something to actually create the new item...
        return obj.post(req,res,next);
      }
      return next();
    },
    get : function(req,res,next) {
      app.log("get!!!! " + myName);
      app.log("My Model: " + myModel,myName,6);
      if(!req.appData.result) req.appData.result = {};
      req.appData.viewFunction = "get";
      req.appData.view = myModel;
      req.appData.method = req.method;
      req.appData.result.schema = app.modelDefinitions[myModel].schema;
      req.appData.result.path = req.path;
      req.searchOptions = {};
      // Check if there's a single item requested...
      if(req.params.id) req.searchOptions = {where:{id:req.params.id}};
      return obj.fetch(req,res,next);
    },
    edit : function(req,res,next) {
      app.log("edit!!!! " + myName);
      app.log("My Model: " + myModel,myName,6);
      if(!req.appData.result) req.appData.result = {};
      req.appData.viewFunction = "edit";
      req.appData.view = myModel;
      req.appData.method = req.method;
      req.appData.result.schema = app.modelDefinitions[myModel].schema;
      req.appData.result.path = req.path;
      req.searchOptions = {};
      if(req.params.id) {
        app.log("ID: " + req.params.id);
        req.searchOptions = {where:{id:req.params.id}};
        // If our method is POST then we expect data in the body to puch to the model
        app.log("METHOD: " + req.appData.method.toLowerCase());
        if(req.appData.method.toLowerCase()=="post") {
          return obj.post(req,res,next);
        } else {
          return obj.fetch(req,res,next);
        }
      }
      app.log("GOT NO ID TO SEARCH FOR. PUNTING");
      return next();
    },
    delete : function(req,res,next) {
      app.log("delete!!!! " + myName);
      app.log("My Model: " + myModel,myName,6);
      if(!req.appData.result) req.appData.result = {};
      req.appData.viewFunction = "delete";
      req.appData.view = myModel;
      req.appData.method = req.method;
      req.appData.result.schema = app.modelDefinitions[myModel].schema;
      req.appData.result.path = req.path;
      req.searchOptions = {};
      if(!req.params.id) {
        app.log("GOT NO ID TO SEARCH FOR. PUNTING");
        return next();
      }
      if(req.appData.method.toLowerCase()=="get") {
        app.log("ID: " + req.params.id);
        req.searchOptions = {where:{id:req.params.id}};
        // If our method is POST then we expect data in the body to puch to the model
        app.log("METHOD: " + req.appData.method.toLowerCase());
        return obj.fetch(req,res,next);
      } else if (req.appData.method.toLowerCase()=="post") {
        app.log("ID: " + req.params.id);
        if(req.body.id!=req.params.id) {
          delete req.params.id;
          return next();
        }
        req.searchOptions = {where:{id:req.params.id}};
        // If our method is POST then we expect data in the body to puch to the model
        app.log("METHOD: " + req.appData.method.toLowerCase());
        app.log("VIEW: " + req.appData.view);
        return obj.post(req,res,next);
      }
    }
  };
  app.log("Model is: " + model,obj.myName,6);
  return obj;
}
