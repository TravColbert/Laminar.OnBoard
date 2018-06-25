const socket = io.connect("https://localhost/");

let messagebox = document.getElementById("qrcode-messages");
let sessionidbox = document.getElementById("session-id");

let fetchSessionId = function() {
  return sessionidbox.innerHTML;
}

let postMessage = function(message) {
  console.log("Printing message: " + message);
  messagebox.innerHTML = message;
  return true;
};

let sendReply = function(type,message) {
  console.log("Sending: " + JSON.stringify(message));
  socket.emit(type,message);
};

let notify = function(message) {
  console.log("Trying desktop notification");
  let notification = new Notification(message);
}

socket.on('howareyou',(data) => {
  if(data.hasOwnProperty('socketId')) {
    postMessage(data.socketId);
    let sessionId = fetchSessionId();
    console.log(sessionId);
    sendReply("iamfine.howareyou",{
      socketId:data.socketId,
      sessionId:sessionId
    });
  }
});

socket.on('iamfine.thankyou',(data) => {
  console.log("Looks like socket communication is all set! " + data);
});

socket.on('message',(data) => {
  postMessage(data);
});

socket.on('notify',(data) => {
  if(!("Notification" in window)) {
    console.log("Desktop notification not supported. Falling-back to browser notification");
    postMessage(data);
  } else if(Notification.permission==="granted") {
    console.log("Launching notification: " + data);
    notify(data);
  } else if(Notification.permission!=="denied") {
    Notification.requestPermission((permission) => {
      if(permission==="granted") {
        console.log("Launching notification: " + data);
        notify(data);
      }
    });
  }
});