
import { ChildProcess } from 'child_process';

export interface ProjectHandler
{
  name: string;

  desc: string;

  files: string[];

  /**
   * Checks whether a found project matches this handler.
   */
  extract(path: string, content: string): IProject[]; 
}

export interface IProject
{
  name?: string

  cwd?: string;

  command?: string;

  args?: string[];

  enabled?: boolean;

  delay?: number;

  currentProcess?: ChildProcess;
}

export class Project implements IProject
{
  public name: string;

  public cwd: string;

  public command: string;

  public args: string[];

  public enabled: boolean;

  public delay: number;

  public currentProcess: ChildProcess;

  constructor(opts?: IProject) {
    this.name = opts && opts.name;
    this.cwd = opts && opts.cwd;
    this.command = opts && opts.command;
    this.args = (opts && opts.args) || [];
    this.enabled = (opts && typeof opts.enabled === 'boolean') ? opts.enabled : true;
    this.delay = (opts && opts.delay) || 0;
    this.currentProcess = opts && opts.currentProcess;
  }
}