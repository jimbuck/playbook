import { ChildProcess, exec, execFile } from 'child_process';
import { WriteStream } from 'tty';
import { EOL } from 'os';
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

import { delay, Queue } from './utils';
import { Play, Project } from '../models';

const EMPTY_STRING = '';
const NEWLINE_REGEX = /\r?\n/gi;
const ERROR_REGEX = /\b(err|error|fail|failure)\b/gi;
const WARN_REGEX = /\b(warn|warning)\b/gi;

const TICK_INTERVAL = 500;

const FG_COLORS = [
  chalk.magenta,
  chalk.cyan,
  chalk.green,
  chalk.yellow,
  chalk.red,
  chalk.blue
];

const BG_COLORS = [
  chalk.bgBlue,
  chalk.bgMagenta,
  chalk.bgCyan,
  chalk.bgGreen,
  chalk.bgYellow,
  chalk.bgRed
];

let colorOffset = 0;
function getFgColor(i: number): ((message: any) => string) {
  return FG_COLORS[(i + colorOffset) % FG_COLORS.length];
}

function getBgColor(i: number): ((message: any) => string) {
  return BG_COLORS[(i + colorOffset) % FG_COLORS.length];
}

const SPINNER_DOTS = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
const SPINNER_NOISE = '▓▒░ ';
const SPINNER_SPIN = '│/─\\';
const SPINNER_PIPE = '┤┘┴└├┌┬┐';
const SPINNER_GROW = '▁▃▄▅▆▇█▇▆▅▄▃';
const SPINNER_FAT = '▏▎▍▌▋▊▉▊▋▌▍▎';
const SPINNER_BOUNCE = '⠁⠂⠄⠂';
const SPINNER_LAYER = '-=≡=';
const SPINNER_CHARS = SPINNER_DOTS;

function getSpinnerChar(p: ProcessTracker): string {
  if (p.done) return p.color(SPINNER_CHARS[0]);
  return p.color(SPINNER_CHARS[p.buffer.step % SPINNER_CHARS.length]);
}

const BLANK_CHAR = ' ';
const EMPTY_TIMELINE_BLOCK = chalk.gray('_');
const GRAY_BLOCK = chalk.gray('█');
const GREEN_BLOCK = chalk.green('█');
const YELLOW_BLOCK = chalk.yellow('█');
const RED_BLOCK = chalk.red('█');

const BOX_LINE_HORZ = chalk.gray('━');
const BOX_LINE_VERT = chalk.gray('┃');
const BOX_END_LEFT = chalk.gray('┫');
const BOX_END_RIGHT = chalk.gray('┣');
const BOX_MIDDLE_LEFT = chalk.gray('┣');
const BOX_MIDDLE_RIGHT = chalk.gray('┫');
const BOX_TOP_LEFT = chalk.gray('┏');
const BOX_TOP_RIGHT = chalk.gray('┓');
const BOX_BOTTOM_LEFT = chalk.gray('╰');
const BOX_BOTTOM_RIGHT = chalk.gray('╯');

interface ProcessTracker {
  name: string;
  process: ChildProcess;
  buffer: StatusQueue;
  color?: (message: any) => string;
  bgColor?: (message: any) => string;
  lastError?: string;
  done: boolean;
  terminating: boolean;
}

class StatusQueue extends Queue<string>
{
  public step: number = 0;

  constructor() {
    super(200);

    while (this.count < this.limit) {
      this.enqueue(EMPTY_TIMELINE_BLOCK);
    }
  }

  public enqueue(char: string): void {
    this.step++;
    super.enqueue(char);
  }

  public toString(): string;
  public toString(allowedWidth: number): string;

  public toString(allowedWidth?: number): string {
    if (typeof allowedWidth !== 'number') {
      allowedWidth = this.limit;
    }

    if (allowedWidth === 0) {
      return '';
    }

    return this
      .toArray()
      .slice(-allowedWidth)
      .join('');
  }
}

export class ProcessManager {

  public currentRun: Promise<void>;

  private _processNames: string[];
  private _play: Play;
  private _processes: Array<ProcessTracker>;

  private _maxNameLength: number = 0;

  private _drawFunc: () => void;
  private _lastDrawTime: number = 0;
  private _drawThrottle: number;

  private _lastOutput: { [key: string]: TextBuffer; } = {};

  private _isCancelling: boolean = false;
  private _isCancelled: boolean = false;

  constructor(play: Play) {
    this._play = play;
    this._processNames = [];
    this._processes = [];
  }

  public async execute(drawFn: (str: string) => void, throttle: number = 50): Promise<void> {
    colorOffset = Math.floor(Math.random() * FG_COLORS.length);
    this._drawThrottle = throttle;

    // Start each project...
    let allRunning = Promise.all(this._play.projects
      .filter(project => project.enabled)
      .map((project, index) => this._runProject(project, index)));

    let tickInterval;
    allRunning.then(procs => {
      tickInterval = setInterval(() => {
        if (!this._isCancelled) {
          procs.forEach(proc => {
            if (!proc.done) proc.buffer.enqueue(EMPTY_TIMELINE_BLOCK);
          });
        }
        this._redraw();
      }, TICK_INTERVAL);
    });

    process.stdin.resume();
    const PREV_RAW_VALUE = process.stdin.isRaw || false;
    process.stdin.setRawMode(true);

    let resolveRun: () => void;
    const keypressHandler = (chunk, key) => {
      if (key.name === 'q') {
        if (!this._isCancelling && !this._isCancelled) {
          this.cancel();
        } else if (this._isCancelled) {
          process.stdin.removeListener('keypress', keypressHandler);
          process.stdin.setRawMode(PREV_RAW_VALUE);
          process.stdin.pause();

          this._drawFunc = null;
          tickInterval && clearInterval(tickInterval);

          resolveRun();
        }
      }
    };
    process.stdin.on('keypress', keypressHandler);

    return this.currentRun = new Promise<void>((resolve) => {
      resolveRun = resolve;
      this._drawFunc = async () => {
        if (this._isCancelling) {
          for (let proc of this._processes) {
            if (!proc.terminating) {
              // Force each process to stop.
              proc.terminating = true;
              proc.process.kill('SIGINT');
              await delay(500);
              proc.process.kill();
            }
          }
        }

        let allDone = this._processes.every(p => p.done);
        if (allDone) {
          this._isCancelled = true;
        }

        const consoleWidth = ((<WriteStream>process.stdout).columns || 80);
        const consoleHeight = ((<WriteStream>process.stdout).rows || 22) - 2;
        const processOutputHeight = Math.floor((consoleHeight - (this._processes.length + 4)) / this._processes.length);

        let drawString = `${BOX_TOP_LEFT + BOX_LINE_HORZ + BOX_END_LEFT} Projects ${BOX_END_RIGHT + repeat(BOX_LINE_HORZ, consoleWidth - 15) + BOX_TOP_RIGHT}
`;

        let projectList = this._processes.map(proc => {
          let paddingSpaces = (new Array(Math.max(0, this._maxNameLength - proc.name.length))).fill(' ').join('');
          let titleLength = paddingSpaces.length + proc.name.length;
          let line = `${BOX_LINE_VERT + paddingSpaces + proc.color(proc.name + ':')}`;
          if (consoleWidth > titleLength + 3) {
            let bufferWidth = consoleWidth - (titleLength + 5); // start space, end space and one spinner char...
            line += proc.buffer.toString(bufferWidth);
          }

          line += ` ${getSpinnerChar(proc) + BOX_LINE_VERT}`;

          return line;
        }).join(EOL);

        drawString += projectList;

        if (processOutputHeight > 0) {
          drawString += `
${BOX_MIDDLE_LEFT + BOX_LINE_HORZ + BOX_END_LEFT} Output ${BOX_END_RIGHT + repeat(BOX_LINE_HORZ, consoleWidth - 13) + BOX_MIDDLE_RIGHT}
`;
          this._processes.forEach(proc => {
            let output = this._lastOutput[proc.name];
            if (output) {
              drawString += proc.color(output.toString(consoleWidth, processOutputHeight)) + EOL;
            } else {
              drawString += BOX_LINE_VERT + proc.color('...' + repeat(BLANK_CHAR, consoleWidth - 5)) + BOX_LINE_VERT;
            }
          });
        }

        drawString += `${BOX_BOTTOM_LEFT + repeat(BOX_LINE_HORZ, consoleWidth-2) + BOX_BOTTOM_RIGHT}
Press 'Q' ${this._isCancelled ? 'again ' : EMPTY_STRING}to ${this._isCancelled ? 'exit' : 'stop'}...`;

        drawFn(chalk.bgBlack(drawString));
      };
    });
  }

  public cancel(): void {
    this._isCancelling = true;
  }

  private async _runProject(project: Project, index: number): Promise<ProcessTracker> {
    if (project.delay) await delay(project.delay);

    if (project.file) {
      project.currentProcess = execFile(project.command, project.args, { cwd: project.cwd });
    } else {
      project.currentProcess = exec(`${project.command} ${project.args.join(' ')}`, { cwd: project.cwd });
    }

    let displayName = `${project.name} [${project.currentProcess.pid || '?'}]`;
    let tracker: ProcessTracker = {
      name: displayName,
      process: project.currentProcess,
      buffer: new StatusQueue(),
      color: getFgColor(index),
      bgColor: getBgColor(index),
      done: false,
      terminating: false
    };
    this._lastOutput[tracker.name] = new TextBuffer();

    tracker.process.stdout.on('data', (text: string) => {
      if (ERROR_REGEX.test(text)) {
        tracker.buffer.enqueue(RED_BLOCK);
      } else if (WARN_REGEX.test(text)) {
        tracker.buffer.enqueue(YELLOW_BLOCK);
      } else {
        tracker.buffer.enqueue(GREEN_BLOCK);
      }
      this._lastOutput[tracker.name].push(text);
      this._redraw();
    });

    tracker.process.stderr.on('data', (text: string) => {
      tracker.buffer.enqueue(RED_BLOCK);
      this._lastOutput[tracker.name].push(text);
      this._redraw();
    });

    tracker.process.on('error', (code: number, signal: string) => {
      tracker.buffer.enqueue(GRAY_BLOCK);
      this._lastOutput[tracker.name].push(`Process Error: Signal = ${signal} Code = ${code}`);
      this._redraw();
    });

    tracker.process.on('exit', (code: number, signal: string) => {
      tracker.done = true;
      tracker.buffer.enqueue(GRAY_BLOCK);
      this._lastOutput[tracker.name].push(`Process Exit: ${code} (${signal})`);
      this._redraw();
    });

    // Add everything...
    this._processNames.push(displayName);
    this._maxNameLength = Math.max(this._maxNameLength, displayName.length)
    this._processes.push(tracker);

    return tracker;
  }

  private _redraw(): void {
    let now = Date.now();

    if (!this._drawFunc || (now - this._lastDrawTime) < this._drawThrottle) return;

    this._lastDrawTime = now;
    this._drawFunc();
  }
}

class TextBuffer {
  private _text: Queue<string>;
  public constructor(limit: number = 50) {
    this._text = new Queue(limit);
    let i = 0;
    while (i++ < limit) this._text.enqueue(EMPTY_STRING);
  }

  public push(text: string): void {
    let lines = stripAnsi(text || EMPTY_STRING).split(NEWLINE_REGEX);
    for (let line of lines) {
      line = line.trimRight();
      if (line.length > 0) this._text.enqueue(line);
    }
  }

  public toString(consoleWidth: number, consoleHeight: number): string {
    if (consoleHeight < 1) consoleHeight = 1;
    return this._text.slice(-1 * consoleHeight)
      .map(line => BOX_LINE_VERT + this._shortenOutput(line, consoleWidth - 2) +  BOX_LINE_VERT)
      .join(EOL);
  }

  private _shortenOutput(text: string, consoleWidth: number = 80): string {
    let shortChars = consoleWidth - text.length;
    let missingSpaces = shortChars > 0 ? repeat(BLANK_CHAR, shortChars) : EMPTY_STRING;
    return text.substring(0, consoleWidth) + missingSpaces;
  }
}

function repeat(char: string, times: number): string {
  return Array(times).fill(char).join(EMPTY_STRING);
}