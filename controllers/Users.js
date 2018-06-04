// const fs = require('fs');
const bcrypt = require('bcrypt');

module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  let defaultRoleAtRegistration = "applicant";
  obj = {
    authenticate : function(req,res,next) {
      let myName = "authenticate()";
      app.log("Authenticating user: " + req.body.email,myName,5);
      app.models[model].findOne({where:{email:req.body.email,verified:true,disabled:false}})
      .then((user) => {
        if(user===null) {
          app.log("User is not found or not verified or not allowed",myName,4);
          app.log("Authenticate failed!",myName,4);
          // req.appData.view = "login";
          // return next();
          return res.redirect('/login/');
        } else {
          app.log("Checking passphrase...",myName,5);
          bcrypt.compare(req.body.password,user.password,(err,match) => {
            if(err) {
              app.log("Some kind of error decrypting pw",myName,2);
              return false;
            }
            if(match) {
              app.log("Passwords match for user: " + user.email,myName,5);



              let userObj = {
                id : user.id,
                email : user.email,
                firstname : user.firstname,
                lastname : user.lastname,
                defaultDomainId : user.defaultDomainId
              }
              req.session.user = userObj;
              app.log(req.session.user,myName);
              return next();



            }
            app.log("Authenticate failed!",myName,4);
            req.appData.view = "login";
            return next();
            // return res.redirect('/login/');
            // return cb(new Error("Incorrect username or password"));
          });
        }
      });
    },
    cryptPassword : function(password) {
      let myName = "cryptPassword()";
      return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
          if (err) return reject(err);
          // app.log("Encrypting " + password + " with " + salt + "...",myName,6);
          bcrypt.hash(password, salt, (err, hash) => {
            if (err) return reject(err);
            // app.log("Got this: " + hash,myName,6);
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
      // app.log("Query object: " + JSON.stringify(userObj),myName,6);
      app.models[model]
      .findOne({
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
          req.appData.view = "registrationcomplete";
          return next();
        });
      });
    },
    verifyUser : function(req,res,next) {
      let myName = "verifyUser()";
      app.models[model]
      .findOne({where:{'appid':req.params.id,verified:false}})
      .then(user => {
        user.update({verified:true,disabled:false})
        .then(user => {
          let cb = function(err,domain) {
            if(err) return res.send(err.message);
            if(!domain) res.send("No domain found with default role");
            // app.log("Default Role: " + JSON.stringify(domain.roles[0]),myName,6,">>>>>");
            user.addRoles(domain.roles[0].id)
            .then(() => {
              // app.log("User: " + JSON.stringify(user),myName,6,"!!!!!!");
              user.update({defaultDomainId:domain.id})
              .then(function() {
                req.appData.user = user;
                req.appData.view = "verificationcomplete";
                return next();
              })
            })
            .catch(err => {
              return res.send("Something went wrong when we tried to add the default role to the user: " + err.message);
            });
          };
          app.controllers["domains"].fetchRoleByName("Default Domain","Default Role",cb);
        })
        .catch(err => {
          return res.send("Could not set verified to true or disabled to false: " + err.message);
        });
      })
      .catch(err => {
        // return res.send("Could not find a user that needs to be verified. " + err.message);
        return res.redirect("/");
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
    getUserById : function(userId) {
      let myName = "getUserById()";
      app.log("Hello!!!: " + userId,myName,6);
      return new Promise((resolve,reject) => {
        app.log("Getting user by ID: " + userId,myName,6);
        app.models[model].findById(userId)
        .then(user => {
          app.log("Found user: " + user.fullname,myName,6);
          resolve(user);
        })
        .catch(err => {
          app.log(err.message,myName,4,"!!>");
          reject(new Error("(" + myName + ") " + err.message));
        });
      });
    },
    getUserByObj : function(obj) {
      let myName = "getUserByObj";
      return app.models[model]
      .find({where:obj});
    },
    editUserForm : function(req,res,next) {
      let myName = "editUserForm()";
      app.log("Requesting edit user form",myName,6);
      // Does user have rights to edit this user record?
      // Does user have:
      //  - 'User Admin' role?
      //  - 'Super Admin' role?
      // let requesterObj = app.tools.pullParams(req.session.user,["id","email"]);
      let model = "users";
      let action = "edit";
      app.tools.checkAuthorization(["edit","all"],req.session.user.id,req.session.user.currentDomain.id)
      .then((response) => {
        if(!response) {
          app.log("User failed authorization check",myName,6);
          return res.send("You are not authorized to edit users");
        }
        app.log("User is authorized to show form: " + model + action,myName,6);
        let userObj = app.tools.pullParams(req.params,["id"]);
        app.log("Getting user with ID: " + userObj.id,myName,6);
        app.models[model]
        .findById(req.params.id,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
        .then((user) => {
          if(user===null) {
            app.log("Couldn't find a user...",myName,4);
            return res.redirect("/users/");
          }
          req.appData.user = user;
          req.appData.view = "usersedit";
          return next();
        })
        .catch(err => {
          return res.send(myName + ": " + err.message);
        });
      })
    },
    editUser : function(req,res,next) {
      let myName = "userUser()";
      let userObj = app.tools.pullParams(req.body,["id","firstname","lastname","roleId","defaultDomainId"]);
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
    createUser : function(userObj) {
      let myName = "createUser";
      app.log("Creating user",myName,6,"+");
      return app.models[model]
      .create(userObj)
      .then((user) => {
        if(user===null) return new Error("(" + myName + ") Could not create user");
        return user;
      })
      .catch(err => {
        return new Error("(" + myName + ") Could not create user: " + err.message);
      });
    },
    // createUser : function(req,res,next) {
    //   let myName = "createUser()";
    //   app.log("Creating user",myName,5);
    //   // Check that all required fields are present...
    //   let userRegistrationObj = app.tools.pullParams(req.body,["email","firstname","lastname","password","passwordverify"]);
    //   if(!userRegistrationObj) return res.send("Required field missing... try again");
    //   // Check that the passwords are verified...
    //   if(userRegistrationObj.password!=userRegistrationObj.passwordverify) return res.send("Passwords do not match... try again");
    //   // That the email address has not been used already...
    //   app.models[model].count({where:{email:userRegistrationObj.email}})
    //   .then((count) => {
    //     if(count>0) return res.send("An account with this email already exists... try again");
    //     app.log("Email address is free to use. Continuing with registration...",myName,5);
    //     delete userRegistrationObj.passwordverify;
    //     app.models[model]
    //     .create(userRegistrationObj)
    //     .then((user) => {
    //       // req.appData.view = "usercreated";
    //       return res.redirect('/users/' + user.id + "/");
    //     });
    //   });
    // },
    getUserEnrollments : function(userId,cb) {
      let myName = "getUserEnrollments()";
      // users -> roles -> domains
      app.models[model]
      .findById(userId,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
      .then(user => {
        if(user===null) return cb();
        cb(null,user);
      })
      .catch(err => {
        cb(err);
      });
    },
    getUserRoles : function(userId) {
      let myName = "getUserRoles()";
      return new Promise((resolve,reject) => {
        app.models[model]
        .findById(userId,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
        .then((user) => {
          if(user===null) return reject(new Error("no users found"));
          return resolve(user);
        })
        .catch((err) => {
          return reject(err);
        })
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
    fetchDomainsByUserId : function(userId,cb) {
      let myName = "fetchDomainsByUserId()";
      // users -> roles -> domains
      app.models[model]
      .findById(userId,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
      .then(user => {
        if(user===null) return cb();
        cb(null,user);
      })
      .catch(err => {
        cb(err);
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
    fetchRolesByUserId : function(userId,cb) {
      let myName = "fetchRolesByUserId()";
      // users -> roles -> domains
      app.models[model]
      .findById(req.params.id,{include:[{model:app.models["roles"]}]})
      .then(user => {
        if(user===null) return cb();
        cb(null,user);
      })
      .catch(err => {
        cb(err);
      });
    },
    requestNewDomain : function(user,newDomainId) {
      let myName = "requestNewDomain()";
      app.log("Request to switch user " + user.id + " to domain: " + newDomainId,myName,6);
      // let domainList = app.controllers["users"].compileDomainList(user);
      app.log(user.domains.length + " domains found",myName,6,"+ + + ");
      let targetDomain = user.domains.filter((v) => {
        return v.id == newDomainId;
      })
      if(!targetDomain) return false;
      app.log("Target domain: " + targetDomain[0].id,myName,6);
      return targetDomain[0].id;
    },
    compileDomainList : function(user) {
      let myName = "compileDomainList()";
      app.log("Compiling domain list",myName,6,"---");
      let domainList = [];
      for(let c=0;c<user.roles.length;c++) {
        for(let i=0;i<user.roles[c].domains.length;i++) {
          let domainFound = domainList.filter(v => {
            app.log(v.id + " : " + user.roles[c].domains[i].id,myName,6);
            return v.id == user.roles[c].domains[i].id;
          });
          if(domainFound.length<1) {
            app.log("Adding domain: " + user.roles[c].domains[i].id + " to user's domain list",myName,6," - - - ");
            domainList.push(user.roles[c].domains[i]);
          } else {
            app.log("Skipping domain: " + user.roles[c].domains[i].id + " already in user's domain list",myName,6," # # # ");
          }
        }
      }
      return domainList;
    },
    logout : function(req,res,next) {
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
    }
  };
  app.log("Model is: " + model,obj.myName,6);
  return obj;
}
