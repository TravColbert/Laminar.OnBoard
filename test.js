#!/usr/bin/node
let promiseChain = Promise.resolve();

promiseChain = promiseChain.then(() => {
  return new Promise((resolve,reject) => {
    // Let's do a small thing
    let time = setTimeout(() => {
      resolve("This is the first promise");
    }, Math.random()*10000);
  });
});

let stuffToDo = [
  [3000,"I promise to get back to you in 3 seconds"],
  [2000,"Promise to see you in 2secs"],
  [1000,"Hold on a second..."]
];

stuffToDo.forEach((thingToDo) => {
  promiseChain = promiseChain.then((result) => {
    return new Promise((resolve,reject) => {
      setTimeout(() => {
        console.log("Previous promise fullfilled: " + result);
        resolve(thingToDo[1]);
      },thingToDo[0]);
    })
  })
});

promiseChain.then((result) => {
  console.log("What we got from the promise: " + result);
  console.log("This is after the promise chain has resolved!");
})
.catch(err => {
  console.log("Error: " + err);
});