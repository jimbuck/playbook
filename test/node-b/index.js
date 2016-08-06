

setInterval(() => {
  let randomNum = Math.random();
  if(randomNum < 0.9){
    process.stdout.write(`It was a great draw! ${randomNum}`);
  } else {
    process.stderr.write(`It was a bad draw! ${randomNum}`);
  }
}, 100);