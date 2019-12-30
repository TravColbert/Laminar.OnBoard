function ackMessage (messageNum) {
  fetch('/messages/ack/' + messageNum, {
    method: 'GET',
    credentials: 'include'
  })
    .then(function (response) {
      return response.json()
    })
    .then(function (json) {
      console.log(JSON.stringify(json))
      doMessage(json)
    })
}

function doMessage (json) {
  document.getElementById('msg' + json.msgId).remove()
}

function goTo (target) {
  window.location = target
}

function dateInputExists () {
  // console.log('Checking for date picker input boxes...')
  let box = document.getElementById('datetimeselect')
  if (box != null) {
    // console.log('...found one')
    return box
  }
  return false
}

function makeDatePicker(element,dateTime) {
  // console.log("Setting up flatpickr: " + dateTime);
  if(element) flatpickr(element, {
    enableTime: true,
    altInput: true,
    altFormat: "F j, Y, h:i K",
    defaultDate: dateTime
  });
  
}

function calculatedatetimestring(dateTimeString) {
  let datetime = document.getElementById("datetime");
  // window.alert(dateTimeString);
  // let datetimestring = document.getElementById("datetimeselect").value;
  datetime.value = Date.parse(dateTimeString);
  
}

function swapHidden(e1Selector, e2Selector, class1, class2) {
  let e1 = document.querySelector(e1Selector)
  let e2 = document.querySelector(e2Selector)
  class1 = class1 || "hidden"
  class2 = class2 || "show"
  if (!e1 || !e2) return false
  if (e1.classList.contains(class1)) {
    e1.classList.remove(class1)
    e1.classList.add(class2)
    e2.classList.add(class1)
    e2.classList.remove(class2)
  } else {
    e1.classList.add(class1)
    e1.classList.remove(class2)
    e2.classList.remove(class1)
    e2.classList.add(class2)
  }
  return true
}

function wordSwap (id, time) {
  let words = [
    'delight',
    'use',
    'wonder',
    'beauti',
    'help'
  ]
  let e = document.getElementById(id)
  let timeout = setInterval(() => {
    words.push(words.shift())
    e.innerHTML = words[0]
  }, time)
}

function preLoadDateTimeSelectors () {
  // console.log('Setting up date-time picker(s)')
  let dateTimePickers = document.getElementsByClassName('datetimepicker')
  let dateTime = new Date()
  // console.log('Current dateTime: ' + dateTime + ' hour: ' + dateTime.getHours() + ' Minutes: ' + dateTime.getMinutes())
  Array.prototype.filter.call(dateTimePickers, (dateTimePicker) => {
    makeDatePicker(dateTimePicker, dateTime)
  })
}

function preLoadClosers () {
  let closers = document.querySelectorAll('.closer')
  closers.forEach((v) => {
    let e = document.getElementById(v.dataset.closer)
    // console.log('Found closer for ' + v.dataset.closer)
    v.addEventListener('click', () => {
      e.checked = false
    })
  })
}

function fetchIt (url, cb) {
  // console.log('Fetching ' + url)
  fetch(url)
    .then((response) => {
      return response.json()
    })
    .then((response) => {
      return cb(response)
    })
    .catch(err => {
      return err
    })
}

function ready (fn) {
  if (document.readyState !== 'loading') {
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}

ready(() => {
  preLoadDateTimeSelectors()
  preLoadClosers()
})
