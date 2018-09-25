module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  return {
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

    getByUserAndDomainId : function(userId,domainId) {
      let myName = "getNotesByUserAndDomainId";
      let searchObj = {
        where : {
          "userId" : userId,
          "domainId" : domainId
        }
      };
      app.log("Looking for notes in: " + searchObj,myName,6);
      return app.controllers[model].__get(searchObj);
    },
    getByDomainId : function(domainId) {
      let myName = "getByDomainId";
      let searchObj = {
        where : {
          "domainId" : domainId
        }
      }
      app.log("Looking for notes in domain: " + domainId,myName,6);
      return app.controllers[model].__get(searchObj);
    },

    gets : function(req,res,next) {
      let myName = "gets (notes)";
      // let searchObj = {
      //   where : {
      //     "userId" : req.session.user.id,
      //     "domainId" : req.session.user.currentDomain.id
      //   }
      // }
      app.tools.checkAuthorization(["list","all"],req.session.user.id,req.session.user.currentDomain.id)
      .then(response => {
        if(!response) {
          app.log("User failed authorization check",myName,6);
          return next();
        }
        app.log("User is authorized to list notes.",myName,6);
        return app.controllers[model].getByDomainId(req.session.user.currentDomain.id);
      })
      .then(notes => {
        req.appData.notes = notes;
        req.appData.view = "notes";
        return next();
      })
      .catch(err => {
        return res.send("Err: " + err.message);
      })
    },
    get : function(req,res,next) {
      let myName = "getNote()";
      let searchObj = {
        where : {
          "id" : req.params.id
        }
      }
      app.tools.checkAuthorization(["list","all"],req.session.user.id,req.session.user.currentDomain.id)
      .then(response => {
        if(!response) {
          app.log("User failed authorization check",myName,6);
          return next();
        }
        app.log("User is authorized to list notes.",myName,6);
        return app.controllers[model].__get(searchObj);
      })
      .then(notes => {
        req.appData.note = notes[0];
        req.appData.view = "note";
        return next();
      })
      .catch(err => {
        return res.send("Err: " + err.message);
      });
    },
    getAsBlog : function(req,res,next) {
      // The maindifference here is that we assume that we aren't authentcated.
      // We also check to see if 1) the domain is marked public and 2) the note
      // is marked public
      let searchObj = {
        where:{
          id:req.params.id,
          public: true
        },
        include: [
          {
            model: app.models["domains"],
            where: {
              public: true
            },
            as:"domain"
          },
          {
            model: app.models["users"],
            as:"user"
          }
        ]
      }
      app.controllers[model].__get(searchObj)
      .then(notes => {
        app.log(notes);
        req.appData.note = notes[0];
        req.appData.view = "blogentry";
        return next();
      });
    },
    editNoteForm : function(req,res,next) {
      let myName = "editNoteForm()";
      let searchObj = {
        where : {
          "id" : req.params.id,
          "userId" : req.session.user.id
        }
      };
      app.controllers[model].__get(searchObj)
      .then(notes => {
        if(!notes) return res.redirect("/notes/");
        app.log("Note found: " + notes[0],myName,6);
        req.appData.note = notes[0];
        req.appData.view = "noteedit";
        return next();
      })
      .catch(err => {
        return res.send(myName + ":" + err.message);
      });
    },
    editNote : function(req,res,next) {
      let myName = "editNote()";
      let noteObj = app.tools.pullParams(req.body,["id","name","description","body","public"]);
      let requestedNoteId = req.params.id;
      app.log(noteObj.id + " " + requestedNoteId);
      if(noteObj.id!=requestedNoteId) return res.send("Didn't request the requested note");
      delete noteObj.id;
      app.log("Updating note: " + JSON.stringify(noteObj),myName,6);
      app.controllers[model].__update({values:noteObj,options:{where:{"id":requestedNoteId}}})
      .then((notes) => {
        app.log(notes[0] + " notes updated");
        return res.redirect("/notes/" + requestedNoteId + "/");
      })
      .catch(err => {
        app.log("Error: " + err.message,myName,4);
        return res.send(err.message);
      });
    },
    createNote : function(req,res,next) {
      let myName = "createNote()";
      let newNote = app.tools.pullParams(req.body,app.modelDefinitions[model].requiredFields,app.modelDefinitions[model].optionalFields);
      if(!newNote) return res.send("Required field missing... try again");
      newNote.userId = req.session.user.id;
      newNote.domainId = req.session.user.currentDomain.id;
      app.log("New note: " + JSON.stringify(newNote),myName,6,"::::>");
      app.controllers[model].__create(newNote)
      .then(note => {
        return res.redirect('/notes/' + note.id + "/");
      })
      .catch(err => {
        app.log("Error: " + err.message,myName,4);
        return res.send(err.message);
      });
    },
    countNotesByDomain : function(domainId) {
      let myName = "countNotesByDomain";
      return new Promise((resolve,reject) => {
        let searchObj = {
          where:{"domainId" : domainId}
        };
        app.controllers[model].__get(searchObj)
        .then(notes => {
          app.log("Counted: " + notes.length + " notes",myName,6);
          resolve(notes.length);
        })
        .catch(err => {
          app.log("Error: " + err.messages);
          reject(err);
        });
      });
    }
  };
};