

setInterval(() => {
  let randomNum = Math.random();
  if (randomNum < 0.9) {
    process.stdout.write(`It was a great draw! ${randomNum}`);
  } else if(randomNum < 0.95) {
    process.stderr.write(`It was a bad draw! ${randomNum}`, new Error('fake!'));
  } else {
    console.log(`I'm done!`);
    process.exit(0);
  }
}, 100);