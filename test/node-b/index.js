const { EOL } = require('os');

const SPEED_RANGE = 2000;
const speed = Math.floor(Math.random() * 1800) + 200;

function getDelay() {
  return (speed + (Math.random() * SPEED_RANGE) - (SPEED_RANGE / 2));
}

run();

function run() {
  const timer = getDelay();
  setTimeout(() => {
    let randomNum = Math.random();
    if (randomNum < 0.85) {
      writeOut(`Good!`);
      run();
    } else if (randomNum < 0.97) {
      writeErr('BAD', new Error(`Failed to do achieve something...`).toString());
      run();
    } else {
      writeErr(`UGLY!`);
      process.exit(0);
    }
  }, timer);
}

function writeOut(...msg) {
  _write(process.stdout, 5, msg);
}

function writeErr(...msg) {
  _write(process.stdout, 1, msg);
}

function _write(pipe, max, msg) {
  let times = Math.floor(Math.random() * max);
  if (max === 1) times = 1;

  for (let i = 0; i < times; i++) {
    pipe.write(`[${new Date().toISOString()}] ${msg.join(EOL)}${EOL}`);
  }
}