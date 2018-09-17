import { basename, dirname } from 'path';
import * as fs from 'fs-jetpack';
import { ChildProcess } from 'child_process';

import { ProjectHandler, Project } from '../models';

const PROJECT_JSON = 'project.json';

export const legacyDotnetHandler: ProjectHandler = {
  name: 'legacy-dotnet',
  desc: 'Apps powered by .NET Core CLI (xproj).',
  files: ['*.xproj'],
  extract: async (path: string, content: string) => {
    try {
      let cwd = fs.cwd(dirname(path));

      const projectJsonExists = await cwd.existsAsync(PROJECT_JSON);
      if (!projectJsonExists) return [];

      let projectJson = await cwd.readAsync(PROJECT_JSON, 'json');
      let title = projectJson.title || basename(cwd.cwd());

      let projects: Project[] = [new LegacyDotnetCoreProject(cwd.cwd(), title, 'run')];

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
    this.name = `${projectName} (dotnet ${command})`;
    this.cwd = cwd;
    this.args = [command, ...args];
  }
}