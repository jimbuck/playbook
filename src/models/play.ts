
import {ChildProcess} from 'child_process';

import {IProject, Project} from './project';

export interface IPlay
{
  name: string;
  projects?: Project[];
}

export class Play implements IPlay
{
  public name: string;

  public projects: Project[];

  constructor(data: IPlay) {
    if (!data.name || data.name.length === 0) {
      throw new Error(`'name' is required!`);
    }

    this.name = data.name;
    this.projects = (data.projects || []).map(proj => new Project(proj));
  }

  public run(): ChildProcess[]{

    return [];
  }

  public toString(): string {
    return `${this.name} (${this.projects.length})`;
  }
}