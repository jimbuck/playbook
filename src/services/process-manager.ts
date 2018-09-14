import { ChildProcess, exec } from 'child_process';
import { WriteStream } from 'tty';
import { EOL } from 'os';
const chalk = require('chalk');

import { delay, Queue } from './utils';
import { Play, Project } from '../models';

const INVALID_CHAR_REGEX = /\r?\n/gi;
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
  return FG_COLORS[(i+colorOffset) % FG_COLORS.length];
}

function getBgColor(i: number): ((message: any) => string) {
  return BG_COLORS[(i+colorOffset) % FG_COLORS.length];
}

const SPINNER_CHARS = '▁▃▄▅▆▇█▇▆▅▄▃';

function getSpinnerChar(p: ProcessTracker): string {
  return p.color(SPINNER_CHARS[p.buffer.step % SPINNER_CHARS.length]);
}

const GRAY_LINE = chalk.gray('_');
const GRAY_BLOCK = chalk.gray('█');
const GREEN_BLOCK = chalk.green('█');
const YELLOW_BLOCK = chalk.yellow('█');
const RED_BLOCK = chalk.red('█');

interface ProcessTracker {
  name: string;
  process: ChildProcess;
  buffer: StatusQueue;
  color?: (message: any) => string;
  bgColor?: (message: any) => string;
  lastError?: string;
  done?: boolean;
}

class StatusQueue extends Queue<string>
{
  public step: number = 0;

  constructor() {
    super(200);

    for (let i = 0; i < this.limit; i++) {
      this.enqueue(GRAY_LINE);
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
  private _lineLimit: number;

  private _isCancelled: boolean = false;
  private _execFn: any;

  constructor(play: Play, lineLimit: number = 1, execFn: any = exec) {
    this._play = play;
    this._processNames = [];
    this._processes = [];
    this._lineLimit = lineLimit;
    this._execFn = execFn;
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
        procs.forEach(proc => {
          if (!proc.done) proc.buffer.enqueue(GRAY_LINE);
        });
        this._redraw();
      }, TICK_INTERVAL);
    });

    process.openStdin();
    const PREV_RAW_VALUE = process.stdin.isRaw || false;
    process.stdin.setRawMode(true);

    const keypressHandler = (chunk, key) => {
      if (key.name === 'q') {
        process.stdin.removeListener('keypress', keypressHandler);
        process.stdin.setRawMode(PREV_RAW_VALUE);
        this.cancel();
      }
    };
    process.stdin.on('keypress', keypressHandler);

    return this.currentRun = new Promise<void>((resolve) => {
      this._drawFunc = () => {
        if (this._isCancelled) {
          this._drawFunc = null;
          tickInterval && clearInterval(tickInterval);
          this._processes.forEach(proc => {
            // Force each process to stop.
            proc.process.kill();
          });
          resolve();
          return;
        }

        let drawString = `Projects:
------------------------------------
`;

        const consoleWidth = ((<WriteStream>process.stdout).columns || 80) - 2;
        let projectList = this._processes.map(proc => {
          let paddingSpaces = (new Array(Math.max(0, this._maxNameLength - proc.name.length))).fill(' ').join('');
          let titleLength = paddingSpaces.length + proc.name.length + 1; // Plus one for the colon...
          let line = `${paddingSpaces + proc.color(proc.name)}:`;
          if (consoleWidth > titleLength + 3) {
            let bufferWidth = consoleWidth - (titleLength + 3); // start space, end space and one spinner char...
            line += ` ${proc.buffer.toString(bufferWidth)}`;
          }

          line += ` ${getSpinnerChar(proc)}`;

          return line;
        }).join(EOL);

        drawString += projectList;

        drawString += `
Output:
------------------------------------
`;
        this._processes.forEach(proc => {
          let output = this._lastOutput[proc.name];
          if (output) {
            drawString += proc.color(output.toString(consoleWidth)) + EOL;
          }
        });

        drawString += 
`------------------------------------
Press 'Q' to exit...`;

        drawFn(drawString);
      };
    });
  }

  public cancel(): void {
    this._isCancelled = true;
  }

  private async _runProject(project: Project, index: number): Promise<ProcessTracker> {
    if (project.delay) await delay(project.delay);

    project.currentProcess = this._execFn(`${project.command} ${project.args.join(' ')}`, { cwd: project.cwd });
    
    let displayName = `${project.name} [${project.currentProcess.pid || '?'}]`;
    let tracker: ProcessTracker = {
      name: displayName,
      process: project.currentProcess,
      buffer: new StatusQueue(),
      color: getFgColor(index),
      bgColor: getBgColor(index)
    };
    this._lastOutput[tracker.name] = new TextBuffer(this._lineLimit);

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
  public constructor(lineLimit: number) {
    this._text = new Queue(lineLimit);
  }

  public push(text: string): void {
    text = this._scrubOutput(text);
    this._text.enqueue(text);
  }

  public toString(consoleWidth: number = 80): string {
    return this._text.toArray().map(line => this._shortenOutput(line, consoleWidth)).join(EOL);
  }

  private _scrubOutput(text: string): string {
    return (text || '').replace(INVALID_CHAR_REGEX, '¶');
  }

  private _shortenOutput(text: string, consoleWidth: number = 80): string {
    return text.substring(0, consoleWidth);
  }
}