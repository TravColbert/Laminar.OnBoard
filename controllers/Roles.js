module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getRoles : function(req,res,next) {
      let myName = "getRoles()";
      app.models[model]
      .findAll()
      .then(roles => {
        if(roles===null) return res.redirect('/');
        req.appData.roles = roles;
        req.appData.view = "roles";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getRole : function(req,res,next) {
      let myName = "getRole()";
      app.models[model]
      .findById(req.params.id)
      .then(role => {
        if(role===null) return res.redirect('/');
        req.appData.role = role;
        req.appData.view = "role";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getUsersByRoleId : function(req,res,next) {
      let myName = "getUsersByRoleId";
      app.models[model]
      .findById(req.params.id,{include:[app.models["users"]]})
      .then(role => {
        if(role===null) res.redirect('/');
        req.appData.role = role;
        req.appData.view = "roleusers";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomainsByRoleId : function(req,res,next) {
      let myName = "getDomainsByRole()";
      app.models[model]
      .findById(req.params.id,{include:[app.models["domains"]]})
      .then(role => {
        if(role===null) res.redirect('/');
        req.appData.role = role;
        req.appData.view = "roledomains";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    editRoleForm : function(req,res,next) {
      let myName = "editRoleForm()";
      // Does user have rights to edit this user record?
      // Does user have:
      //  - 'User Admin' role?
      //  - 'Super Admin' role?
      // let requesterObj = app.tools.pullParams(req.session.user,["id","email"]);
      let prepareEditRoleForm = function(authorized) {
        if(!authorized) {
          app.log("User is NOT authorized to edit role!",myName,6);
          return res.send("User not authorized for this view");
        }
        app.log("User is authorized to edit role",myName,6);
        let roleObj = app.tools.pullParams(req.params,["id"]);
        app.log("Getting role with ID: " + roleObj.id,myName,6);
        app.models[model]
        .findById(req.params.id)
        .then(role => {
          if(role===null) {
            app.log("Couldn't find role",myName,4);
            return res.redirect("/roles/");
          }
          req.appData.role = role;
          req.appData.view = "rolesedit";
          // return res.json(role);
          return next();
        })
        .catch(err => {
          return res.send(myName + ": " + err.message);
        });
      };
      app.controllers["users"].ifUserHasRole("Super Admin",req.session.user,prepareEditRoleForm);
    },
    editRole : function(req,res,next) {
      let myName = "editRole()";
      let roleObj = app.tools.pullParams(req.body,["id","name","description","capabilities"]);
      let requestedRole = req.params.id;
      roleObj.capabilities = JSON.parse(roleObj.capabilities);  // turn that string into to a JSON
      app.log(roleObj.id + " " + requestedRole);
      if(roleObj.id!=requestedRole) return res.send("Didn't request the requested role");
      delete roleObj.id;
      app.models[model]
      .update(roleObj,{where:{id:req.params.id}})
      .then((roles) => {
        return res.redirect("/roles/" + requestedRole + "/");
      });
    },
    createRole : function(req,res,next) {
      let myName = "createRole()";
      let newRole = app.tools.pullParams(req.body,["name"]);
      if(!newRole) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newRole["description"] = req.body.description;
      if(req.body.hasOwnProperty("capabilities")) newRole["capabilities"] = JSON.parse(req.body.capabilities);
      app.models[model]
      .create(newRole)
      .then((record) => {
        req.appData.view = "role";
        req.appData.role = record;
        return next();
      });
    },
    createDefaultRoles : function(domain) {
      let myName = "createDefaultRoles()";
      let domainAdminRole = {
        name:"Admin Role",
        description:"Administrative role for the " + domain.name + " domain",
        capabilities:{"edit":"all","create":"all","delete":"all","list":"all"}
      };
      let domainDefaultRole = {
        name:"Default Role",
        description:"Default role for the " + domain.name + " domain",
        capabilities:{"create":"all","list":"all"}
      };

      let defaultRoles = []
      return new Promise((resolve,reject) => {
        app.models[model]
        .addDomain()
      })
    }
  };
  return obj;
};