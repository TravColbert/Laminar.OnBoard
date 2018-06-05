module.exports = function(app) {
  let obj = {
    home : function(req,res,next) {
      let myName = "home";
      app.log("In home module!",myName,6);
      if(req.session.user) {
        app.controllers["notes"].getNotes(req.session.user.id,req.session.user.currentDomain.id)
        .then((notes) => {
          if(!notes) {
            app.log("No notes collected");
            req.appData.notes = null;
          } else {
            app.log("Found some notes");
            req.appData.notes = notes;
          }
          return next();
        })
        .catch((err) => {
          app.log(err.message);
          return res.send("Error: " + err.message);
        });
      } else {
        return next();
      };
    }
  }
  return obj;
}