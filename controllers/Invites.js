module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
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

    add : function(roleAppid,userEmail,pin,comment) {
      let myName = "add";
      return new Promise((resolve,reject) => {
        app.log("Adding new invite: " + roleAppid + " : " + userEmail + " : " + pin,myName,6);
        let createObj = {
          roleAppid : roleAppid,
          userEmail : userEmail,
          pin : pin,
          comment : comment
        };
        app.controllers[model].__create(createObj)
        .then(invite => {
          resolve(invite);
        })
        .catch(err => {
          app.log(err.message,myName,4);
          reject(new Error("(" + myName + ") " + err.message));
        })
      })
    },

    getInviteQueryObj : function(userEmail, expirationHours) {
      expirationHours = expirationHours || app.locals.invitationTimeoutHours;
      // Calculate the date some days ago
      let timeLimit = new Date(new Date() - (1000 * 60 * 60 * expirationHours)); 
      return {
        where : {
          "userEmail" : userEmail,
          "accepted" : false,
          "createdAt" : {
            $gt : timeLimit
          }  
        }
      }
    },
    attemptAccept : function(req,res,next) {
      let myName = "attemptAccept";
      app.log("Attempting to accept invite: " + req.params.id,myName,6);
      req.appData.roleAppid = req.params.id;
      req.appData.userEmail = req.session.user.email;
      req.appData.view = "invitationaccept";
      return next();
    },
    confirmAccept : function(req,res,next) {
      let myName = "confirmAccept";
      app.log("Attempting to confirm invite: " + req.params.id,myName,6);
      let targetRole;
      let invitation;
      let searchObj = app.controllers[model].getInviteQueryObj(req.body.userEmail);
      searchObj.where.pin = req.body.pin;
      app.controllers[model].__get(searchObj)
      .then(invites => {
        if(invites.length!=1) return res.redirect("/");
        app.log(JSON.stringify(invites),myName,6);
        app.log("Invite accepted - setting things up",myName,5);
        invitation = invites[0];
        return app.controllers.roles.getRoleByAppId(invites[0].roleAppid.substring(0,12));
      })
      .then(role => {
        if(!role) return res.send("No role found.");
        app.log(JSON.stringify(role),myName,6);
        app.log("Role found: " + role,myName,6);
        targetRole = role;
        app.log("Now, let's find the user: " + invitation.userEmail,myName,6);
        return app.controllers.users.getUserByEmail(invitation.userEmail);
      })
      .then(users => {
        if(users.length!=1) return res.send("Wrong number of users returned! That's a pretty big big");
        app.log("Found user: " + users[0],myName,6);
        app.log("Adding role: " + targetRole,myName,6);
        let standardComment = "Invitation to role accepted by user";
        let comment = standardComment + ": " + invitation.comment || standardComment;
        return users[0].addRole(targetRole,{through:{"comment":comment}});
      })
      .then(result => {
        app.log(result,myName,6);
        app.log("Time to update the invitation: " + invitation,myName,6);
        return invitation.update({"accepted":true});
      })
      .then(result => {
        app.log("I think we're all committed now",myName,6);
        app.log("Be good to load an explanatory vew.",myName,6);
        req.appData.view = "invitationaccepted";
        return next();
      });      
    },

    checkInvites : function(userEmail,expirationHours) {
      let myName = "checkInvites";
      return new Promise((resolve,reject) => {
        let searchObj = app.controllers[model].getInviteQueryObj(userEmail,expirationHours);
        app.controllers.invites.__get(searchObj)
        .then(invites => {
          // app.log(invites,myName,6);
          resolve(invites);
        })
        .catch(err => {
          reject(err);
        });
      })
    }
  };
  return obj;
}
