function ackMessage(messageNum) {
  fetch('/messages/ack/' + messageNum,{
    method:'GET',
    credentials:'include'
  }).
    then(function(response) {
      return response.json();
    }).
    then(function(json){
      console.log(JSON.stringify(json));
      doMessage(json);
    });
}

function doMessage(json) {
  document.getElementById("msg" + json.msgId).remove();
}

function goTo(target) {
  window.location = target;
}

function dateInputExists() {
  console.log("Checking for date picker input boxes...");
  let box = document.getElementById("datetimeselect");
  if(box!=null) {
    console.log("...found one");
    return box;
  }
  return false;
}

function makeDatePicker(element) {
  if(element) flatpickr(element, {
    enableTime: true
  });
  return;
}

function calculatedatetimestring(dateTimeString) {
  let datetime = document.getElementById("datetime");
  // window.alert(dateTimeString);
  // let datetimestring = document.getElementById("datetimeselect").value;
  datetime.value = Date.parse(dateTimeString);
  return;
}

function fetchIt(url,cb) {
  console.log("Fetching " + url);
  fetch(url)
  .then((response) => {
    return response.json();
  })
  .then((response) => {
    return cb(response);
  })
  .catch(err => {
    return err;
  })
}

function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

ready();
