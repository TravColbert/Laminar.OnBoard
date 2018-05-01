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
      app.models[model].findOne({where:{email:req.body.email,verified:true,disabled:false}})
      .then((user) => {
        if(user===null) {
          app.log("User is not found or not verified or not allowed");
          app.log("Authenticate failed!");
          // req.appData.view = "login";
          // return next();
          return res.redirect('/login/');
        } else {
          app.log("info: Checking password: %s with %s",req.body.password,user.password);
          bcrypt.compare(req.body.password,user.password,(err,match) => {
            if(err) {
              app.log("Some kind of error in bcrypt...");
              return false;
            }
            if(match) {
              req.session.user = {
                id:user.id,
                email:user.email
              };
              app.log(req.originalUrl + " : " + req.session.originalReq);
              return next();
            }
            app.log("Authenticate failed!");
            req.appData.view = "login";
            return next();
            // return res.redirect('/login/');
            // return cb(new Error("Incorrect username or password"));
          });
        };
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
    ifUserHasRole : function(roleName,user,cb) {
      let myName = "userHasRole()";
      let result = false;
      // User must be the current session-user
      app.log("Checking if user has role: " + roleName,myName,6);
      let userObj = app.tools.pullParams(user,["id","email"]);
      app.log("Query object: " + JSON.stringify(userObj),myName,6);
      app.models[model].findOne({
        where:userObj,
        include: [
          {
            model:app.models["roles"],
            where:{name:roleName}
          }
        ]
      })
      .then(function(record) {
        if(record) {
          app.log("Found a record!");
          return cb(true);
        }
        return cb(false);
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
      app.models[model].count({where:{email:userRegistrationObj.email}})
      .then((count) => {
        if(count>0) return res.send("An account with this email already exists... try again");
        app.log("Email address is free to use. Continuing with registration...",myName,5);
        delete userRegistrationObj.passwordverify;
        app.models[model]
        .create(userRegistrationObj)
        .then((record) => {
          req.appData.view = "registrationComplete";
          return next();
          // ...or you could re-direct with res.redirect("/.../.../");
        });
        // app.log(JSON.stringify(userRegistrationObj),myName,5);
        // Since this is a registration, we want to set the user's role to 'applicant'
        //
        // We don't need to assign any specific roles to users now...
        //
        // app.models["roles"].findOne({where:{name:defaultRoleAtRegistration}}).then(function(record) {
        //   if(record==null) return res.send("Error - can't assign applicant role to new user");
        //   userRegistrationObj.roleId = record.id;
        //   app.models[model].create(userRegistrationObj).then((record) => {
        //     req.appData.view = "registrationComplete";
        //     return next();
        //     // ...or you could re-direct with res.redirect("/.../.../");
        //   });
        // });
      });
    },
    verifyUser : function(req,res,next) {
      let myName = "verufyUser()";
      app.models[model]
      .find({where:{'appid':req.params.id,verified:false}})
      .then(user => {
        let cb = function(err,domain) {
          if(err) return res.send(err.message);
          if(domain===null) res.send("No domain found");
          user.addRoles(domain.roles[0].id)
          .then(function() {
            // return res.send("Congrats! User '" + user.fullname + "' has been enrolled in: '" + domain.roles[0].name + "' (" + domain.roles[0].id + ")");
            req.appData.user = user;
            req.appData.view = "registrationcomplete";
            return next();
          })
          .catch(err => {
            return res.send("Something went wrong when we tried to add the default role to the user!");
          });
        };
        user.update({verified:true,disabled:false})
        .then(user => {
          app.controllers["domains"].fetchRoleByName("Default Domain","Default Role",cb);
        })
        .catch(err => {
          return res.send("Could not set verified to true or disabled to false: " + err.message);
        });
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    enrollUserInRoleById : function(userId,roleId) {
      let myName = "enrollUserInRoleById()";
      app.models[model]
      .findById(userId)
      .then(user => {
        if(user===null) return res.redirect('/');
        user.addRole(roleId)
        .then(function() {
          return true;
          // return res.redirect('/users/' + userId);
        });
      })
      .catch(err => {
        return res.send(err.messages);
      });
    },
    getProfile : function(req,res,next) {
      let myName = "getProfile()";
      let userObj = app.tools.pullParams(req.session.user,["id","email"]);
      if(!userObj) return res.redirect('/');
      app.models[model]
      .findById(userObj.id,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
      .then(user => {
        if(user===null) return res.redirect('/');
        // return res.send(user);
        req.appData.user = user;
        req.appData.view = "profile";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getUsers : function(req,res,next) {
      let myName = "getUsers()";
      // Get all users
      app.log("Getting all users",myName,6);
      app.models[model].findAll({
        include:[
          {
            model: app.models.roles
          }
        ]
      })
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
      let userObj = app.tools.pullParams(req.params,["id"]);
      app.models[model]
      .findById(req.params.id,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
      .then(user => {
        if(user===null) return res.redirect('/');
        req.appData.user = user;
        req.appData.view = "user";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    editUserForm : function(req,res,next) {
      let myName = "editUserForm()";
      // Does user have rights to edit this user record?
      // Does user have:
      //  - 'User Admin' role?
      //  - 'Super Admin' role?
      // let requesterObj = app.tools.pullParams(req.session.user,["id","email"]);
      let prepareEditUserForm = function(authorized) {
        if(!authorized) {
          app.log("User is NOT authorized to edit user!",myName,6);
          return res.send("User not authorized for this view");
        }
        app.log("User is authorized to edit user",myName,6);
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
        });
      };
      app.controllers["users"].ifUserHasRole("Super Admin",req.session.user,prepareEditUserForm);
    },
    editUser : function(req,res,next) {
      let myName = "userUser()";
      let userObj = app.tools.pullParams(req.body,["id","firstname","lastname","roleId"]);
      let requestedUser = req.params.id;
      app.log(userObj.id + " " + requestedUser);
      if(userObj.id!=requestedUser) return res.send("Didn't request the requested user");
      delete userObj.id;
      app.models[model]
      .update(userObj,{where:{id:req.params.id},include:[{model:app.models["roles"]}]})
      .then((records) => {
        return res.redirect("/users/" + requestedUser + "/");
      });
    },
    getDomainsByUserId : function(req,res,next) {
      let myName = "getDomainsByUserId()";
      // let userId = req.params.id;
      // users -> roles ->domains
      app.models[model]
      .findById(req.params.id,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
      .then(user => {
        req.appData.user = user;
        req.appData.view = "userdomains"
        return next();
      });
    },
    getRolesByUserId : function(req,res,next) {
      let myName = "getRolesByUserId()";
      // let userId = req.params.id;
      // users -> roles
      app.models[model]
      .findById(req.params.id,{include:[{model:app.models["roles"]}]})
      .then(user => {
        req.appData.user = user;
        req.appData.view = "userroles"
        return next();
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
