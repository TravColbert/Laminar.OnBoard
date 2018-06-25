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
})