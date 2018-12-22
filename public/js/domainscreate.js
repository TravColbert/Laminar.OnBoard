let urnField;
let nameField;

function suggestUrnField(e) {
  let nameValue = e.currentTarget.value;
  let newValue = nameValue.toLowerCase().replace(/ /g,"_");
  urnField.value = newValue;
}

function formatUrnField(e) {
  let origVal = e.currentTarget.value;
  // All lowercase, no illegal characters
  console.log(origVal);
  console.log(encodeURI(origVal));
}

function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

ready(() => {
  nameField = document.getElementById("name");
  urnField = document.getElementById("urn");
  nameField.onkeyup = suggestUrnField;
  urnField.onkeyup = formatUrnField;
});
