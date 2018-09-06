import {basename, dirname} from 'path';

import {ProjectHandler, Project} from '../models/project';

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

class DotnetProject extends Project
{
  constructor(cwd: string, projectJson: any, command: string, args: string[] = []) {
    super({
      name: `${projectJson.title} (dotnet ${command})`,
          cwd,
          command: 'dotnet',
          args: [command, ...args]
    });
  }
}