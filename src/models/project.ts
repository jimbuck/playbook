
import {ChildProcess} from 'child_process';
import {Answers} from 'inquirer';
import {ParsedArgs} from 'minimist';

export interface ProjectHandler
{
  name: string;

  desc: string;

  command: string;

  /**
   * Checks whether a found project matches this handler.
   * 
   * @param {string} path
   * @returns {(boolean | PromiseLike<boolean>)}
   */
  check(path: string): boolean | PromiseLike<boolean>; 
  
  /**
   * Prompts the user for any additional arguments.
   * 
   * @returns {(string[] | Promise<string[]>)}
   */
  configure?(): string[] | Promise<string[]>;
}

export interface IProject
{
  name?: string

  path?: string;

  command?: string;

  args?: string[];
}

export class Project implements IProject
{
  public name: string

  public path: string;

  public command: string

  args: string[];

  constructor(opts: IProject = null) {
    this.name = opts && opts.name;
    this.path = opts && opts.path;
    this.command = opts && opts.command;
    this.args = (opts && opts.args) || [];
  }
}