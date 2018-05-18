module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getNotes : function(userId,domainId) {
      let myName = "getNotes()";
      return new Promise((resolve,reject) => {
        app.log("Getting notes...",myName,6);
        app.tools.checkAuthorization(["list","all"],userId,domainId)
        .then((response) => {
          if(!response) {
            app.log("User failed authorization check",myName,6);
            return resolve([]);
          }
          app.log("User is authorized to list notes.",myName,6);
          return app.controllers[model].getNotesByUserAndDomain(userId,domainId);
        })
        .then((notes) => {
          app.log(" - - - > We have notes: " + notes,myName,6);
          return resolve(notes || []);
        })
        .catch((err) => {
          return reject(err);
        });
      });
    },
    getNotesByUserAndDomain : function(userId,domainId) {
      let myName = "getNotesByUserAndDomain()";
      return new Promise((resolve,reject) => {
        app.log("Getting notes for user " + userId + " and domain " + domainId,myName,6);
        app.models[model]
        .findAll({where:{userId:userId,domainId:domainId}})
        .then((notes) => {
          app.log(notes,myName,6,":::::>");
          if(notes!==null) {
            app.log("I think we got some notes",myName);
            return resolve(notes);
          } else {
            app.log("Empty note-list",myName);
            return resolve(null);
          }
        })
        .catch((err) => {
          return reject(err);
        });
      });
    },
    getNote : function(req,res,next) {
      let myName = "getNote()";
      app.models[model]
      .findById(req.params.id)
      .then(note => {
        if(note===null) return res.redirect('/');
        req.appData.note = note;
        req.appData.view = "note";
        return next();
      })
      .catch(err => {
        res.send(err.message);
      });
    },
    editNoteForm : function(req,res,next) {
      let myName = "editNoteForm()";
      // let prepareEditForm = function(authorized) {
      //   if(!authorized) {
      //     app.log("User is NOT authorized to edit!",myName,6);
      //     return res.send("User not authorized for this view");
      //   }
      //   app.log("User is authorized to edit.",myName,6);
      //   let noteObj = app.tools.pullParams(req.params,["id"]);
      //   app.log("Getting note with ID: " + noteObj.id,myName,6);
      //   app.models[model]
      //   .findById(req.params.id)
      //   .then(note => {
      //     if(note===null) {
      //       app.log("Couldn't find note",myName,4);
      //       return res.redirect("/notes/");
      //     }
      //     req.appData.note = note;
      //     req.appData.view = "notesedit";
      //     return next();
      //   })
      //   .catch(err => {
      //     return res.send(myName + ": " + err.message);
      //   });
      // };
      app.models[model]
      .find({where:{id:req.params.id,userId:req.session.user}})
      .then((note) => {
        if(note===null) {
          app.log("Couldn't find note",myName,4);
          return res.redirect("/notes/");
        }
        req.appData.note = notes;
        req.appData.view = "noteedit";
        return next();
      })
      .catch(err => {
        return res.send(myName + ":" + err.message);
      })
      // app.controllers["users"].ifUserHasRole(,req.session.user,prepareEditForm);
    },
    editNote : function(req,res,next) {
      let myName = "editNote()";
      let noteObj = app.tools.pullParams(req.body,["id","name","description","body","public"]);
      let requestedNoteId = req.params.id;
      app.log(noteObj.id + " " + requestedNoteId);
      if(noteObj.id!=requestedNoteId) return res.send("Didn't request the requested note");
      delete noteObj.id;
      app.models[model]
      .update(noteObj,{where:{id:req.params.id}})
      .then((notes) => {
        return res.redirect("/notes/" + requestedNoteId + "/");
      })
    },
    createNote : function(req,res,next) {
      let myName = "createNote()";
      let newNote = app.tools.pullParams(req.body,["name","description","body","public","userId","domainId"]);
      if(!newNote) return res.send("Required field missing... try again");
      newNote.userId = req.session.user.id;
      app.log("New note: " + JSON.stringify(newNote),myName,6,"::::>");
      app.models[model]
      .create(newNote)
      .then(note => {
        return res.redirect('/notes/' + note.id + "/");
      })
      .catch(err => {
        return res.send(err.message);
      })
    }
  };
  return obj;
};