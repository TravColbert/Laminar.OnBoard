module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getDomains : function(req,res,next) {
      let myName = "getRoles()";
      app.models[model]
      .findAll()
      .then((domains) => {
        if(domains===null) return res.redirect('/');
        req.appData.domains = domains;
        req.appData.view = "domains";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomain : function(req,res,next) {
      let myName = "getDomain()";
      app.models[model]
      .findById(req.params.id,{include:[app.models["roles"]]})
      .then(domain => {
        if(domain===null) return res.redirect('/');
        req.appData.domain = domain;
        req.appData.view = "domain";
        return next();
      })
      .catch(err => {
        res.send(err.message);
      });
    },
    getRolesByDomainId : function(req,res,next) {
      let myName = "getRolesByDomainId()";
      app.models[model]
      .findById(req.params.id,{include:[app.models["roles"]]})
      .then((domain) => {
        if(domain===null) return res.redirect('/');
        req.appData.domain = domain;
        req.appData.view = "domainroles";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getUsersByDomainId : function(req,res,next) {
      let myName = "getUsersByDomainId()";
      app.models[model]
      .findById(req.params.id,{include:[{model:app.models["roles"],include:[app.models["users"]]}]})
      .then((domain) => {
        if(domain===null) return res.redirect('/');
        req.appData.domain = domain;
        req.appData.view = "domainusers";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    getDomainList : function(req,res,next) {
      let myName = "getDomainList()";
      app.models[model]
      .findAll()
      .then(records => {
        app.log("GOT DOMAIN LIST");
        return res.send(records);
      })
      .catch(err => {
        return res.send(err.message);
      });
    },
    // These functions are designed to be used by other functions
    fetchDomainIdByName : function(domainName) {
      let myName = "fetchDomainIdByName()";
      app.models[model]
      .findOne({where:{name:domainName}})
      .then(domain => {
        if(domain===null) return false;
        return domain.id;
      })
      .catch(err => {
        app.log(err.message,2);
        return false;
      })
    },
    fetchRoleByName : function(domainName,roleName,cb) {
      let myName = "fetchRoleByName()";
      app.models[model]
      .find({where:{name:domainName},include:[{model:app.models["roles"],where:{name:roleName}}]})
      .then(domain => {
        if(domain===null) cb(null,false);
        // app.log("Domain info: " + JSON.stringify(domain),myName,6,">>>>");
        cb(null,domain);
      })
      .catch(err => {
        app.log("Error: " + err.message,myName,4);
        cb(err);
      });
    },
    editDomainForm : function(req,res,next) {
      let myName = "editDomainForm()";
      // Does user have rights to edit this user record?
      // Does user have:
      //  - 'User Admin' role?
      //  - 'Super Admin' role?
      // let requesterObj = app.tools.pullParams(req.session.user,["id","email"]);
      let prepareEditDomainForm = function(authorized) {
        if(!authorized) {
          app.log("User is NOT authorized to edit domain!",myName,6);
          return res.send("User not authorized for this view");
        }
        app.log("User is authorized to edit domain",myName,6);
        let domainObj = app.tools.pullParams(req.params,["id"]);
        app.log("Getting domain with ID: " + domainObj.id,myName,6);
        app.models[model]
        .findById(req.params.id)
        .then(domain => {
          if(domain===null) {
            app.log("Couldn't find domain",myName,4);
            return res.redirect("/domains/");
          }
          req.appData.domain = domain;
          req.appData.view = "domainsedit";
          // return res.json(domain);
          return next();
        })
        .catch(err => {
          return res.send(myName + ": " + err.message);
        });
      };
      app.controllers["users"].ifUserHasRole("Super Admin",req.session.user,prepareEditDomainForm);
    },
    editDomain : function(req,res,next) {
      let myName = "editDomain()";
      let domainObj = app.tools.pullParams(req.body,["id","name","description"]);
      let requestedDomainId = req.params.id;
      app.log(domainObj.id + " " + requestedDomainId);
      if(domainObj.id!=requestedDomainId) return res.send("Didn't request the requested domain");
      delete domainObj.id;
      app.models[model]
      .update(domainObj,{where:{id:req.params.id}})
      .then((domains) => {
        return res.redirect("/domains/" + requestedDomainId + "/");
      });
    },

    createDomain : function(req,res,next) {
      let myName = "createDomain()";
      let newDomain = app.tools.pullParams(req.body,["name"]);
      if(!newDomain) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newDomain["description"] = req.body.description;
      // if(req.body.hasOwnProperty("userId")) newDomain["ownerId"] = req.body.userId;
      newDomain.ownerId = req.session.user.id;
      app.models[model]
      .create(newDomain)
      .then(record => {
        record.getRoles()
        .then(roles => {
          req.appData.domain = record;
          req.appData.roles = roles;
          req.appData.view = "domain";
          return next();
        })
        .catch(err => {
          res.send(err.message);
        });
      })
      .catch(err => {
        res.send(err.message);
      });
    }
  };
  return obj;
};