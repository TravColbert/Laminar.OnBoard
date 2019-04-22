// const fs = require('fs');
const bcrypt = require('bcrypt');

module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  // let defaultRoleAtRegistration = "applicant";
  obj = {
    __create : function(obj) {
      let myName = "__create";
      app.log("Creating obj: " + obj,myName,6);
      return app.controllers["default"].create(model,obj);
    },
    __get : function(obj) {
      let myName = "__get";
      app.log("Getting obj: " + obj,myName,6);
      return app.controllers["default"].get(model,obj);
    },
    __update : function(obj) {
      let myName = "__update";
      app.log("Updating obj: " + obj,myName,6);
      return app.controllers["default"].update(model,obj);
    },
    __delete : function(obj) {
      let myName = "__delete";
      app.log("Deleting obj: " + obj,myName,6);
      return app.controllers["default"].delete(model,obj);
    },

    authenticate : function(req,res,next) {
      let myName = "authenticate()";
      let loginAccountName = req.body.email.toLowerCase();
      app.log("Authenticating user: " + loginAccountName,myName,5);
      app.models[model].findOne({where:{email:loginAccountName,verified:true,disabled:false}})
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
              app.log(req.session.user,myName,6);
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
      // lowercase the email...
      userRegistrationObj.email = userRegistrationObj.email.toLowerCase();
      searchObj = {where:{}};
      if(req.body.nickname) {
        searchObj.where = {
          $or:[{"email":userRegistrationObj.email},{"nickname":req.body.nickname}]
        };
      } else {
        searchObj.where = {
          "email":userRegistrationObj.email
        }
      }
      app.models[model].count(searchObj)
      .then((count) => {
        if(count>0) return res.send("An account with this email or nickname already exists... try again");
        app.log("Email address is free to use. Continuing with registration...",myName,5);
        delete userRegistrationObj.passwordverify;
        app.models[model]
        .create(userRegistrationObj)
        .then((record) => {
          // This is where we'd launch an e-mail confirmation
          let mailObj = {
            "Subject" : "Welcome to This Cool App!",
            "TextPart" : "Hi there! To Complete your sign-in go here: https://" + app.locals.addr + "/verify/" + record.appid + "/ to verify your account.\nWe'll see you soon!\n\nSincerely,\nFroogle Support Team"
          };
          app.log("Attempting to send notification to: " + record.email,myName,6);
          return app.tools.sendEmail(mailObj,[{"Email":record.email}]);
        })
        .then(result => {
          if(result) {
            app.log("I think we sent the email!");
          } else {
            app.log("I think something went wrong!");
          }
          req.appData.view = "registrationcomplete";
          return next();
        })
        .catch(err => {
          app.log("Register user error:" + err.message);
          req.appData.view = "registrationcomplete";
          return next();
        })
      });
    },
    nicknameIsUnique : function(nickname) {
      let myName = "nicknameIsUnique";
      return new Promise((resolve,reject) => {
        let searchObj = {
          where : {
            "nickname" : nickname
          }
        }
        app.controllers[model].__get(searchObj)
        .then(result => {
          if(result.length>0) {
            resolve(false);
          } else {
            resolve(true);
          }
        })
        .catch(err => {
          app.log(err.message,myName,4);
          resolve(false);
        })
      })
    },
    verifyUser : function(req,res,next) {
      let myName = "verifyUser";
      let verifiedUser;
      let defaultRole;
      app.models[model]
      .findOne({where:{'appid':req.params.id,verified:false}})
      .then(user => {
        return user.update({verified:true,disabled:false});
      })
      .then(user => {
        app.log(JSON.stringify(user),myName,6);
        verifiedUser = user;
        return app.controllers["domains"].fetchRoleByName("Default","Default Role");
      })
      .then(domain => {
        app.log("I found this as my default domain: " + JSON.stringify(domain),myName,6);
        if(domain[0].roles) {
          app.log("Got these for roles: " + JSON.stringify(domain[0].roles),myName,6);
          defaultRole = domain[0].roles[0];
        }
        if(!domain) res.send("No domain found with default role");
        return verifiedUser.update({defaultDomainId:domain[0].id});
      })
      .then(() => {
        app.log("Adding user to default Role...",myName,6);
        return app.controllers["roles"].addUserToRole(verifiedUser,defaultRole);
      })
      .then(() => {
        req.appData.user = verifiedUser;
        req.appData.view = "verificationcomplete";
        return next();
      })
      .catch(err => {
        app.log("Could not verify user: " + err.message,myName,4);
        // return res.send("Could not find a user that needs to be verified. " + err.message);
        return res.redirect("/");
      });
    },
    enrollUserInRoleById : function(userId,roleId) {
      let myName = "enrollUserInRoleById()";
      app.models[model]
      .findByPk(userId)
      .then(user => {
        app.log("Found user: " + user.id);
        // if(user===null) return res.redirect('/');
        if(user===null) return false;
        app.log("Adding role: " + roleId);
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
      app.log("getting profile for user ID: " + userObj.id, myName, 7);
      app.controllers[model]
      .getUserById(userObj.id)
      // .findByPk(userObj.id,
      //   {
      //     include:[
      //       {
      //         model:app.models["roles"],
      //         as:"roles",
      //         include:[
      //           {
      //             model:app.models["domains"]
      //           }
      //         ]
      //       }
      //     ]
      //   })
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
      // app.models[model]
      // .findByPk(req.params.id,
      //   {
      //     include:[
      //       {
      //         model:app.models["roles"],
      //         include:[
      //           app.models["domains"]
      //         ]
      //       }
      //     ]
      //   }
      //   )
      app.controllers[model]
      .getUserById(req.params.id)
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
      let myName = "getUserById";
      // app.log("Hello!!!: " + userId,myName,6);
      return new Promise((resolve,reject) => {
        app.log("Getting user by ID: " + userId,myName,6);
        app.models[model]
        .findByPk(userId,
          {
            include:[
              {
                model:app.models["roles"],
                as:"roles",
                include:[
                  {
                    model:app.models["domains"]
                  }
                ]
              }
            ]
          })
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
    getUserByEmail : function(email) {
      let myName = "getUserByEmail";
      let searchObj = {
        where : { "email" : email }
      };
      return app.controllers[model].__get(searchObj);
    },
    getUserByObj : function(obj) {
      let myName = "getUserByObj";
      return app.controllers[model].__get({where:obj});
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
        .findByPk(req.params.id,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
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
      let myName = "editUser";
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
      app.log("Creating user " + userObj.email,myName,6,"+");
      return app.controllers[model]
      .__create(userObj)
      .then(user => {
        if(user===null) return new Error("(" + myName + ") Could not create user");
        return user;
      })
      .catch(err => {
        return new Error("(" + myName + ") Could not create user: " + err.message);
      });
    },
    // getUserEnrollments : function(userId,cb) {
    //   let myName = "getUserEnrollments()";
    //   // users -> roles -> domains
    //   app.models[model]
    //   .findByPk(userId,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
    //   .then(user => {
    //     if(user===null) return cb();
    //     cb(null,user);
    //   })
    //   .catch(err => {
    //     cb(err);
    //   });
    // },
    getUserRoles : function(userId) {
      let myName = "getUserRoles()";
      return new Promise((resolve,reject) => {
        app.models[model]
        .findByPk(userId,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
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
      .findByPk(req.params.id,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
      .then(user => {
        req.appData.user = user;
        req.appData.view = "userdomains"
        return next();
      });
    },
    // fetchDomainsByUserId : function(userId,cb) {
    //   let myName = "fetchDomainsByUserId()";
    //   // users -> roles -> domains
    //   app.models[model]
    //   .findByPk(userId,{include:[{model:app.models["roles"],include:[app.models["domains"]]}]})
    //   .then(user => {
    //     if(user===null) return cb();
    //     cb(null,user);
    //   })
    //   .catch(err => {
    //     cb(err);
    //   });
    // },
    setDefaultDomain : function(req,res,next) {
      let myName = "setDefaultDomain";
      return new Promise((resolve,reject) => {
        let userId = (req.params.id) ? req.params.id : false;
        let domainId = (req.params.domainId) ? req.params.domainId : false;
        if(!userId || !domainId) {
          app.log("No userdId or domainId set",myName,4);
          reject(new Error("(" + myName + ") No userdId or domainId set"));
        }
        app.log("Setting default domain for user: " + userId + " to domain: " + domainId,myName,6);
        app.log("Current user is a member of target domain: " + app.tools.currentUserHasDomain(req,domainId),myName,6,"-->");
        let searchObj = {
          values:{defaultDomainId:domainId},
          options:{where:{id:userId}}
        };
        // app.log(JSON.stringify(searchObj),myName,6);
        app.controllers[model].__update(searchObj)
        .then(items => {
          if(items!==null || items!==0) {
            return true;
          }
          reject(new Error("(" + myName + ") Nothing modified"));
        })
        .then(() => {
          res.redirect("/");
        })
        .catch(err => {
          app.log("Error: " + err.message,myName,4);
          reject(new Error("(" + myName + ") " + err.message));
        });
      });
    },
    getRolesByUserId : function(req,res,next) {
      let myName = "getRolesByUserId()";
      // let userId = req.params.id;
      // users -> roles
      app.models[model]
      .findByPk(req.params.id,{include:[{model:app.models["roles"]}]})
      .then(user => {
        req.appData.user = user;
        req.appData.view = "userroles"
        return next();
      });
    },
    // fetchRolesByUserId : function(userId,cb) {
    //   let myName = "fetchRolesByUserId()";
    //   // users -> roles -> domains
    //   app.models[model]
    //   .findByPk(req.params.id,{include:[{model:app.models["roles"]}]})
    //   .then(user => {
    //     if(user===null) return cb();
    //     cb(null,user);
    //   })
    //   .catch(err => {
    //     cb(err);
    //   });
    // },
    requestNewDomain : function(user,newDomainId) {
      let myName = "requestNewDomain()";
      app.log("Request to switch user " + user.id + " to domain: " + newDomainId,myName,6);
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
      return new Promise((resolve,reject) => {
        app.log("Compiling domain list",myName,6,"---");
        let domainList = [];
        for(let role of user.roles) {
          for(let domain of role.domains) {
            // Checks to see if domain is already in domainList
            let domainFound = domainList.filter(v => {
              return v.id == domain.id;
            });
            if(domainFound.length<1) {
              domainList.push(domain);
            }
          }
        }
        // for(let c=0;c<user.roles.length;c++) {
        //   for(let i=0;i<user.roles[c].domains.length;i++) {
        //     let domainFound = domainList.filter(v => {
        //       return v.id == user.roles[c].domains[i].id;
        //     });
        //     if(domainFound.length<1) {
        //       app.log("Adding domain: " + user.roles[c].domains[i].id + " to user's domain list",myName,6," - - - ");
        //       domainList.push(user.roles[c].domains[i]);
        //     } else {
        //       app.log("Skipping domain: " + user.roles[c].domains[i].id + " already in user's domain list",myName,6," # # # ");
        //     }
        //   }
        // }
        // app.log(JSON.stringify(domainList),myName,6);
        resolve(domainList);
      });
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
  return obj;
}
