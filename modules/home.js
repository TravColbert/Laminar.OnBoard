module.exports = function(app) {
  let obj = {
    /**
     * Define a 'home' method that gets called before the home view is started.
     * Use this to prepare the environment for your app's custome home page.
     * 
     * req, res, and next should be passed to the methods here.
     * 
     * At this point in the app all of the user's environment is available for 
     * example:
     *  - req.session.user : the user's complete environment
     *  - req.session.user.currentDomain : the ID of the domain that the user
     *    in right now.
     *  - req.appData : appData properties get passed to the termplating engine
     *    So, if you define req.appData.notes[], a notes[] array can be 
     *    referenced in the template. In this case, the template is going to be
     *    'home.pug'.
     *  - all of your controllers and models are available below.
     */
    home : function(req,res,next) {
      let myName = "home";
      app.log("In home module",myName,6,"--->");
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