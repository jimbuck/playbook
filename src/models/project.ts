
import {ChildProcess} from 'child_process';
import {Answers} from 'inquirer';
import {ParsedArgs} from 'minimist';

export interface ProjectHandler
{
  name: string;

  desc: string;

  files: string[];

  /**
   * Checks whether a found project matches this handler.
   * 
   * @param {string} path
   * @returns {(IProject | IProject[])}
   */
  extract(path: string, content: string): IProject | IProject[]; 
}

export interface IProject
{
  name?: string

  cwd?: string;

  command?: string;

  args?: string[];
}

export class Project implements IProject
{
  public name: string

  public cwd: string;

  public command: string

  args: string[];

  constructor(opts?: IProject) {
    this.name = opts && opts.name;
    this.cwd = opts && opts.cwd;
    this.command = opts && opts.command;
    this.args = (opts && opts.args) || [];
  }
}