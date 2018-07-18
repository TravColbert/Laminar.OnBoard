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
      app.log("In custom home module",myName,6);

      let processDomain = function(domain) {
        let myName = "processDomains";
        return new Promise((resolve,reject) => {
          app.controllers["notes"].getByDomainId(domain.id)
          .then(notes => {
            app.log("Found " + notes.length + " notes",myName,6);
            resolve(notes);
          })
          .catch(err => {
            reject(err);
          });
        });
      }

      // If there is no user let's move on...
      if(!req.session.user) {
        app.log("No user session appears to exist. Moving on...",myName,6);
        return true;
      }

      app.log("A user session appears to be available",myName,6);

      let domainPromises = Promise.resolve();
      // Get notes for each domain
      req.session.user.domains.forEach(domain => {
        domainPromises = domainPromises.then(data => {
          app.log("Processing domain: " + domain.name,myName,6);
          app.log("Previous domain note count: " + data,myName,6);
          return processDomain(domain);
        })
        .then(notes => {
          let noteCount = (notes) ? notes.length : 0;
          app.log("Found " + noteCount + " notes",myName,6);
          domain.notes = notes;
          return domain.notes.length;
        })
      }); 
      return domainPromises; 
    }
  }
  return obj;
}