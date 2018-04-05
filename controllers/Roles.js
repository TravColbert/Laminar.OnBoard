module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getRoles : function(req,res,next) {
      let myName = "getRoles()";
      app.log("Model is: " + model);
      app.models[model].findAll()
      .then(function(results) {
        app.log(JSON.stringify(results));
        app.log("Length: " + results.length);
        app.log("SQL GET results:",myName,6);
        req.appData.rows = results;
        req.appData.view = "roles";
        return next();
      })
      .catch(err => {
        res.send(err.message);
      });
    },
    createRole : function(req,res,next) {
      let myName = "createRole()";
      let newRole = app.tools.pullParams(req.body,["name"]);
      if(!newRole) return res.send("Required field missing... try again");
      if(req.body.hasOwnProperty("description")) newRole["description"] = req.body.description;
      app.models[model].create(newRole).then(record => {
        req.appData.view = "role";
        req.appData.role = record;
        return next();
      });
    }
  }
  app.log("Model is: " + model,obj.myName,6);
  return obj;
}