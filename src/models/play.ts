
import {ChildProcess, exec} from 'child_process';

import {IProject, Project} from './project';

export interface IPlay
{
  name: string;
  cwd?: string;
  projects?: IProject[];
}

export class Play
{
  public name: string;

  public cwd: string;

  public projects: Project[];

  constructor(data: IPlay) {
    if (!data || !data.name || data.name.length === 0) {
      throw new Error(`'name' is required!`);
    }

    this.name = data.name;
    this.cwd = data.cwd;
    this.projects = (data.projects || []).map(proj => new Project(proj));
  }

  public run(): Project[]
  {
    return this.projects.map(proj => {
      proj.currentProcess = exec(`${proj.command} ${proj.args.join(' ')}`, { cwd: proj.cwd });
      return proj;
    });
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