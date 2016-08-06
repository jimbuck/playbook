
import {ChildProcess, exec} from 'child_process';

import {IProject, Project} from './project';
import {ProcessManager} from '../services/process-manager';

export interface IPlay
{
  name: string;
  cwd: string;
  projects?: Project[];
}

export class Play implements IPlay
{
  public name: string;

  public cwd: string;

  public projects: Project[];

  constructor(data: IPlay) {
    if (!data.name || data.name.length === 0) {
      throw new Error(`'name' is required!`);
    }

    this.name = data.name;
    this.cwd = data.cwd;
    this.projects = (data.projects || []).map(proj => new Project(proj));
  }

  public run(): ProcessManager
  {
    let projs = this.projects.map(proj => {
      proj.currentProcess = exec(`${proj.command} ${proj.args.join(' ')}`, { cwd: proj.cwd });
      return proj;
    });

    return new ProcessManager(projs);
  }

  
  /**
   * Prints out the name and count of projects.
   * 
   * @returns {string}
   */
  public toString(): string {
    return `${this.name} (${this.projects.length})`;
  }
}