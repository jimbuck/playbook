import { basename, dirname } from 'path';
import { ChildProcess } from 'child_process';

import { ProjectHandler, Project } from '../models';

export const dotnetHandler: ProjectHandler = {
  name: 'dotnet',
  desc: 'Apps powered by .NET Core CLI.',
  files: ['project.json'], // TODO: Add support for csproj structure...
  extract: (path: string, content: string) => {
    try {
      let cwd = dirname(path);
      let projectJson = JSON.parse(content);
      projectJson.title = projectJson.title || basename(cwd);

      let projects: Project[] = [new DotnetProject(cwd, projectJson, 'run')];

      return projects;
    } catch (ex) {
      //console.error(ex);
      return [];
    }
  }
};

class DotnetProject implements Project
{
  public name: string;
  public cwd: string;
  public command: string = 'dotnet';
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;
  
  constructor(cwd: string, projectJson: any, command: string, args: string[] = []) {
    this.name = `${projectJson.title} (dotnet ${command})`;
    this.cwd = cwd;
    this.args = [command, ...args];
  }
}