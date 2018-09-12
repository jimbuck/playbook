import { basename, dirname } from 'path';
import { ChildProcess } from 'child_process';

import { ProjectHandler, Project } from '../models';

export const legacyDotnetHandler: ProjectHandler = {
  name: 'legacy-dotnet',
  desc: 'Apps powered by .NET Core CLI (xproj).',
  files: ['project.json'],
  extract: (path: string, content: string) => {
    try {
      let cwd = dirname(path);
      let projectJson = JSON.parse(content);
      let title = projectJson.title || basename(cwd);

      let projects: Project[] = [new LegacyDotnetCoreProject(cwd, title, 'run')];

      return projects;
    } catch (ex) {
      //console.error(ex);
      return [];
    }
  }
};

class LegacyDotnetCoreProject implements Project
{
  public name: string;
  public cwd: string;
  public command: string = 'dotnet';
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;
  
  constructor(cwd: string, projectName: string, command: string, args: string[] = []) {
    this.name = `${projectName}.xproj (dotnet ${command})`;
    this.cwd = cwd;
    this.args = [command, ...args];
  }
}