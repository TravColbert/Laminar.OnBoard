function setUploadTrigger () {
  let uploadButton = document.getElementById('upload')
  uploadButton.onclick(function () {
    formData.append('userId', document.getElementById('user').value)
    formData.append('name', document.getElementById('file').files[0])
    formData.append('description', document.getElementById('description').value)
    formData.append('public', document.getElementById('public').value)
    formData.append('domainId', document.getElementById('domain').value)
    fetch('/files/', {
      method: 'POST',
      body: formData
    })
  })
}

function ready (fn) {
  if (document.readyState != 'loading') {
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}

ready(() => {
  setUploadTrigger()
})
