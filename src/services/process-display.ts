import {ChildProcess} from 'child_process';
import {Queue} from './utils';
const chalk = require('chalk');

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

export class ProcessDisplay
{
  public processNames: string[];

  private _processes: Array<ProcessTracker>;

  private _maxNameLength: number = 0;

  private _interval: NodeJS.Timer;

  constructor(processes: Lookup<ChildProcess>) {
    
    let processNames = Object.keys(processes);

    this._processes = processNames.map(name => {
      let process = processes[name];
      this._maxNameLength = Math.max(this._maxNameLength, name.length)
      let tracker: ProcessTracker = {
        name,
        process,
        step: 0,
        buffer: new StatusQueue()
      };

      tracker.process.stdout.on('data', (data: string) => {
        tracker.buffer.enqueue(GREEN_BLOCK);
      });

      tracker.process.stderr.on('data', (data: string) => {
        tracker.buffer.enqueue(RED_BLOCK);
      });

      tracker.process.on('close', (code:number, signal: string) => {
        tracker.buffer.enqueue(GRAY_BLOCK);
      });

      return tracker;
    });    
  }

  public render(drawFn: (str: string) => void, delay: number): Promise<void>
  {
    return new Promise<void>((resolve, reject) => {
      this._interval = setInterval(() => {

        let projectList = this._processes.map(proc => {
          let paddingSpaces = (new Array(Math.max(0, this._maxNameLength - proc.name.length))).fill(' ').join('');
          return `${paddingSpaces}${proc.name}: ${proc.buffer.toString()}`;
        }).join('\n');

        drawFn(`Projects:
------------------------------------
${projectList}
`);
      }, delay);
    });
  }

  public cancel(): void
  {
    clearInterval(this._interval);
  }
}