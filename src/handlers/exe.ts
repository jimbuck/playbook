import { parse as parsePath } from 'path';
import { ChildProcess } from 'child_process';

import { ProjectHandler, Project } from '../models';

const EXE_EXT = '.exe';

export const exeHandler: ProjectHandler = {
  name: 'exe',
  desc: 'Standard Windows executables.',
  files: [`*${EXE_EXT}`],
  extract: async (path: string) => {
    try {
      let { dir, base, name } = parsePath(path);

      let projects: Project[] = [new ExeProject(dir, name, base)];

      return projects;
    } catch (ex) {
      //console.error(ex);
      return [];
    }
  }
};

class ExeProject implements Project
{
  public name: string;
  public cwd: string;
  public command: string;
  public file: boolean = true;
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;
  
  constructor(cwd: string, projectName: string, command: string, args: string[] = []) {
    this.name = `${projectName} (exe)`;
    this.cwd = cwd;
    this.command = command;
    this.args = args;
  }
}