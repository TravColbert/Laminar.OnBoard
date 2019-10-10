let getAuthElements = function () {
  return document.getElementsByClassName('authUI')
}

let authUI = function (list) {
  for (let c = 0; c < list.length; c++) {
    console.log(list[c].dataset.fetch)
    requestElement(list[c])
  }
}

let requestElement = function (parentElement) {
  // .dataset.fetch
  let requestObj = {
    method: 'POST',
    credentials: 'include'
  }

  if (parentElement.dataset.hasOwnProperty('params')) requestObj.body = JSON.stringify({ params: parentElement.dataset.params })
  return fetch(`/authorizedelements/${parentElement.dataset.fetch}/`, requestObj)
    .then(function (response) {
      return response.json()
    })
    .then(function (elementJson) {
      if (elementJson.hasOwnProperty('error')) {
        console.log(elementJson.error)
      } else {
        elementJson.element.parent = parentElement
        console.log('Retrieved element:\n' + JSON.stringify(elementJson.element))
        let user_button = new Laminar.Widget(elementJson.element)
        var attributes = Object.keys(parentElement.dataset)
        for (c in attributes) {
          if (attributes[c] != 'fetch') {
            console.log('Setting attribute on child: ' + attributes[c])
            user_button.set(attributes[c], parentElement.dataset[attributes[c]])
          }
        }
      }
    })
    .catch(function (err) {
      console.log('Caught requested element error: ' + err.message)
    })
}

function ready (fn) {
  if (document.readyState !== 'loading') {
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}

ready(function () {
  // Make a list of components that need to be authorized before enabling
  // Components will probably be a placeholder DIV
  let listOfElements = getAuthElements()
  authUI(listOfElements)
})
