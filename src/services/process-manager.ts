import {ChildProcess} from 'child_process';
import {EOL} from 'os';
const chalk = require('chalk');

import {Queue} from './utils';
import {Project} from '../models/project';

const MAX_ERROR_LENGTH = 500;

const COLORS = [
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.green,
  chalk.yellow,
  chalk.red
];

function getColor(i: number): ((message: any) => string){
  return COLORS[i % COLORS.length];
}
                      
const SPINNER_CHARS = '▁▃▄▅▆▇█▇▆▅▄▃';//'▉▊▋▌▍▎▏▎▍▌▋▊▉';// '|/-\\';

function getSpinnerChar(p: ProcessTracker): string {
  return p.color(SPINNER_CHARS[p.step % SPINNER_CHARS.length]);
}

const GRAY_LINE = chalk.gray('_');
const GRAY_BLOCK = chalk.gray('█');
const GREEN_BLOCK = chalk.green('█');
const RED_BLOCK = chalk.red('█');
const STATUS_BAR_WIDTH = 40;

interface ProcessTracker {
  name: string;
  process: ChildProcess;
  step: number;
  buffer: Queue<string>;
  color?: (message: any) => string;
  lastError?: string;
}

class StatusQueue extends Queue<string>
{
  constructor() {
    super(STATUS_BAR_WIDTH);

    this.length = STATUS_BAR_WIDTH;
    this.fill(GRAY_LINE);
  }

  public toString()
  {
    return this.join('');
  }
}

export class ProcessManager
{
  private _processNames: string[];

  private _processes: Array<ProcessTracker>;

  private _maxNameLength: number = 0;

  private _interval: NodeJS.Timer;

  private _lastError: Lookup<string> = {};

  constructor(projects: Project[]) {
    this._processNames = [];
    this._processes = projects.map((project, index) => {
      this._processNames.push(project.name);
      this._maxNameLength = Math.max(this._maxNameLength, project.name.length)
      let tracker: ProcessTracker = {
        name: project.name,
        process: project.currentProcess,
        step: 0,
        buffer: new StatusQueue(),
        color: getColor(index)
      };

      tracker.process.stdout.on('data', (data: string) => {
        tracker.step++;
        tracker.buffer.enqueue(GREEN_BLOCK);
      });

      tracker.process.stderr.on('data', (data: string) => {
        tracker.step++;
        tracker.buffer.enqueue(RED_BLOCK);
        this._lastError[tracker.name] = tracker.color(data.substring(0, MAX_ERROR_LENGTH));
      });

      tracker.process.on('close', (code:number, signal: string) => {
        tracker.step++;
        tracker.buffer.enqueue(GRAY_BLOCK);
      });
      tracker.process.on('error', (code:number, signal: string) => {
        tracker.step++;
        tracker.buffer.enqueue(RED_BLOCK);
        this._lastError[tracker.name] = tracker.color(`Process Error: ${code} (${signal})`);
      });
      tracker.process.on('exit', (code:number, signal: string) => {
        tracker.step++;
        tracker.buffer.enqueue(GRAY_BLOCK);
      });

      return tracker;
    });    
  }

  public render(drawFn: (str: string) => void, delay: number): Promise<void>
  {
    return new Promise<void>((resolve, reject) => {
      this._interval = setInterval(() => {

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
Errors:
------------------------------------
`;

        this._processNames.forEach(procName => {
          if(this._lastError[procName]){
            drawString += this._lastError[procName] + EOL;
          }
        });       

        drawString += `
------------------------------------
`;

        drawFn(drawString);
      }, delay);
    });
  }

  public cancel(): void
  {
    clearInterval(this._interval);
  }
}