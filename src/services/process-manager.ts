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

interface ProcessTracker {
  name: string;
  process: ChildProcess;
  step: number;
  buffer: StatusQueue;
  color?: (message: any) => string;
  bgColor?: (message: any) => string;
  lastError?: string;
}

class StatusQueue extends Queue<string>
{
  constructor() {
    super(200);

    for (let i = 0; i < this.limit; i++) {
      this.enqueue(GRAY_LINE);
    }
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
        this._lastOutput[tracker.name] = this._scrubOutput(data);
        this._redraw();
      });

      tracker.process.stderr.on('data', (data: string) => {
        tracker.step++;
        tracker.buffer.enqueue(YELLOW_BLOCK);
        this._lastOutput[tracker.name] = this._scrubOutput(data);
        this._redraw();
      });

      tracker.process.on('error', (code: number, signal: string) => {
        tracker.step++;
        tracker.buffer.enqueue(RED_BLOCK);
        this._lastOutput[tracker.name] = `Process Error: ${code} (${signal})`;
        this._redraw();
      });

      tracker.process.on('exit', (code: number, signal: string) => {
        tracker.step++;
        tracker.buffer.enqueue(GRAY_BLOCK);
        this._lastOutput[tracker.name] = this._lastOutput[tracker.name] || `Process Exit: ${code} (${signal})`;
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
        let now = Date.now();
        this._processes.forEach(proc => {
          let output = this._lastOutput[proc.name];
          if (output) {
            drawString += proc.color(this._shortenOutput(output, consoleWidth)) + EOL;
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

  private _shortenOutput(text: string, consoleWidth: number = 80): string {
    return text.substring(0, consoleWidth);
  }

  private _redraw(): void {
    let now = Date.now();

    if (!this._drawFunc || (now - this._lastDrawTime) < this._drawThrottle) return;

    this._lastDrawTime = now;
    this._drawFunc();
  }
}