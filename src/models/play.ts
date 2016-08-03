
import {ChildProcess, exec} from 'child_process';

import {IProject, Project} from './project';

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

  public run(): Lookup<ChildProcess>
  {
    let procs: Lookup<ChildProcess> = {};
    this.projects.forEach(proj => {
      procs[proj.name] = exec(`${proj.command} ${proj.args.join(' ')}`, { cwd: proj.cwd });
    });

    return procs;
  }

  public toString(): string {
    return `${this.name} (${this.projects.length})`;
  }
}