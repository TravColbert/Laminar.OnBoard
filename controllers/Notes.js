module.exports = function(app,model) {
  if(!model) return false;
  let myName = model + "Controller";
  let myModel = model;
  obj = {
    getNotes : function(req,res,next) {
      let myName = "getNotes()";
      app.models[model]
      .findAll()
      .then((notes) => {
        if(notes===null) return res.redirect('/');
        req.appData.notes = notes;
        req.appData.view = "notes";
        return next();
      })
      .catch(err => {
        return res.send(err.message);
      })
    },
    getNotesByCurrentUserAndDomain : function(req,res,next) {
      let myName = "getNotesByUserId()";
      app.models[model]
      .find({where:{userId:req.session.user.id,domainId:req.session.user.currentDomain.id}})
      .then((notes) => {
        req.appData.notes = notes;
        req.appData.view = "mynotes";
        return next();
      })
      .catch((err) => {
        return res.send(err.message);
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
      let newNote = app.tools.pullParams(req.body,["name","description","body","public"]);
      if(!newNote) return res.send("Required field missing... try again");
      newNote.userId = req.session.user.id;
      app.models[model]
      .create(newNote)
      .then(note => {
        return res.redirect('/notes/' + note.id);
      })
      .catch(err => {
        return res.send(err.message);
      })
    }
  };
  return obj;
};