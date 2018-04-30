module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getDomains : function(req,res,next) {
      let myName = "getRoles()";
      app.log("Model is: " + model);
      app.models[model]
      .findAll()
      .then(function(results) {
        app.log(JSON.stringify(results));
        app.log("Length: " + results.length);
        app.log("SQL GET results:",myName,6);
        req.appData.domains = results;
        req.appData.view = "domains";
        return next();
      })
      .catch(err => {
        res.send(err.message);
      });
    },
    getDomain : function(req,res,next) {
      let myName = "getDomain()";
      let domainId = req.params.id;
      app.log("Domain ID: " + domainId,myName,6);
      app.models[model]
      .findById(domainId)
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
        res.send(err.message);
      });
    },
    createDomain : function(req,res,next) {
      let myName = "createDomain()";
      let newDomain = app.tools.pullParams(req.body,["name"]);
      if(!newDomain) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newDomain["description"] = req.body.description;
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