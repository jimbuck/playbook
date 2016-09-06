import {ChildProcess} from 'child_process';
import {WriteStream} from 'tty';
import {EOL} from 'os';
const chalk = require('chalk');

import {Queue} from './utils';
import {Project} from '../models/project';

const OUTPUT_AUTO_HIDE = 1000 * 10;
const MAX_ERROR_LENGTH = 500;
const INVALID_CHAR_REGEX = /\r?\n/gi;

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

function getFgColor(i: number): ((message: any) => string) {
  return FG_COLORS[i % FG_COLORS.length];
}

function getBgColor(i: number): ((message: any) => string) {
  return BG_COLORS[i % FG_COLORS.length];
}

const SPINNER_CHARS = '▁▃▄▅▆▇█▇▆▅▄▃';

function getSpinnerChar(p: ProcessTracker): string {
  return p.color(SPINNER_CHARS[p.step % SPINNER_CHARS.length]);
}

const GRAY_LINE = chalk.gray('_');
const GRAY_BLOCK = chalk.gray('█');
const GREEN_BLOCK = chalk.green('█');
const YELLOW_BLOCK = chalk.yellow('█');
const RED_BLOCK = chalk.red('█');
const STATUS_BAR_WIDTH = 40;

interface ProcessTracker {
  name: string;
  process: ChildProcess;
  step: number;
  buffer: Queue<string>;
  color?: (message: any) => string;
  bgColor?: (message: any) => string;
  lastError?: string;
  exitCode?: number;
}

class StatusQueue extends Queue<string>
{
  constructor() {
    super(STATUS_BAR_WIDTH);

    for (let i = 0; i < STATUS_BAR_WIDTH; i++) {
      this.enqueue(GRAY_LINE);
    }
  }

  public toString() {
    return this.toArray().join('');
  }
}

export class ProcessManager {
  private _processNames: string[];

  private _processes: Array<ProcessTracker>;

  private _maxNameLength: number = 0;

  private _drawFunc: () => void;
  private _lastDrawTime: number = 0;
  private _drawThrottle: number;

  private _lastOutput: Lookup<string> = {};

  private _isCancelled: boolean = false;

  constructor(projects: Project[]) {
    this._processNames = [];
    this._processes = projects.map((project, index) => {
      let displayName = `${project.name} [${project.currentProcess.pid || '?'}]`;
      this._processNames.push(displayName);
      this._maxNameLength = Math.max(this._maxNameLength, displayName.length)
      let tracker: ProcessTracker = {
        name: displayName,
        process: project.currentProcess,
        step: 0,
        buffer: new StatusQueue(),
        color: getFgColor(index),
        bgColor: getBgColor(index)
      };

      tracker.process.stdout.on('data', (data: string) => {
        tracker.step++;
        tracker.buffer.enqueue(GREEN_BLOCK);
        this._lastOutput[tracker.name] = tracker.color(this._scrubOutput(data));
        this._redraw();
      });

      tracker.process.stderr.on('data', (data: string) => {
        tracker.step++;
        tracker.buffer.enqueue(YELLOW_BLOCK);
        this._lastOutput[tracker.name] = tracker.color(this._scrubOutput(data));
        this._redraw();
      });

      tracker.process.on('error', (code: number, signal: string) => {
        tracker.step++;
        tracker.exitCode = code;
        tracker.buffer.enqueue(RED_BLOCK);
        this._lastOutput[tracker.name] = tracker.color(`Process Error: ${code} (${signal})`);
        this._redraw();
      });

      tracker.process.on('exit', (code: number, signal: string) => {
        tracker.step++;
        tracker.exitCode = code;
        tracker.buffer.enqueue(code === 0 ? GRAY_BLOCK : RED_BLOCK);
        this._lastOutput[tracker.name] = this._lastOutput[tracker.name] || tracker.color(`Process Exit: ${code} (${signal})`);
        this._redraw();
      });

      return tracker;
    });
  }

  public render(drawFn: (str: string) => void, throttle: number = 50): Promise<void> {
    this._drawThrottle = throttle;

    return new Promise<void>((resolve, reject) => {
      this._drawFunc = () => {
        if (this._isCancelled) {
          this._drawFunc = null;
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

        let projectNum = 0;
        let projectList = this._processes.map(proc => {
          let paddingSpaces = (new Array(Math.max(0, this._maxNameLength - proc.name.length))).fill(' ').join('');
          return `${paddingSpaces}${proc.color(proc.name)}: ${proc.buffer.toString()} ${getSpinnerChar(proc)}`;
        }).join(EOL);

        drawString += projectList;

        drawString += `
Output:
------------------------------------
`;
        let now = Date.now();
        this._processNames.forEach(procName => {
          let output = this._lastOutput[procName];
          if (output) {
            drawString += this._shortenOutput(output) + EOL;
          }
        });

        drawString += `
------------------------------------
`;

        drawFn(drawString);
      };
    });
  }

  public cancel(): void {
    this._isCancelled = true;
  }

  private _scrubOutput(text: string): string {
    return (text || '')
      .replace(INVALID_CHAR_REGEX, '¶');
  }

  private _shortenOutput(text: string): string {
    return text.substring(0, (<WriteStream>process.stdout).columns - 2);
  }

  private _redraw(): void {
    let now = Date.now();

    if (!this._drawFunc || (now - this._lastDrawTime) < this._drawThrottle) return;

    this._lastDrawTime = now;
    this._drawFunc();
  }
}