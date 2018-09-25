module.exports = function(app) {
  return {
    home: function(req,res,next) {
      return new Promise((resolve,reject) => {
        let myName = "BlogHome";
        let searchObj = {
          where: {
            name: "Default"
          },
          include: [app.models["notes"]]
        }
        req.appData.notes = [];
        app.controllers["domains"].__get(searchObj)
        .then((result) => {
          let notes = [];
          result.forEach(domain => {
            app.log("Getting notes for domain: " + domain.name + " (" + domain.notes.length + ")");
            notes = notes.concat(domain.notes);
          });
          req.appData.notes = notes;
          resolve(true);
        });
      });
    }
  }
}