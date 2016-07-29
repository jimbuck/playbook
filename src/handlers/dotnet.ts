import * as fs from 'fs';
import {basename, dirname} from 'path';
import * as pify from 'pify';
const $fs = pify(fs);

import {spawn, ChildProcess} from 'child_process';
import {Question, Answers} from 'inquirer';
import {ParsedArgs} from 'minimist';

import {ProjectHandler, IProject, Project} from '../models/project';

export const dotnetHandler: ProjectHandler = {
  name: 'dotnet',
  desc: 'Apps powered by .NET Core CLI.',
  files: ['project.json'],
  extract: (path: string, content: string) => {
    try {
      let cwd = dirname(path);
      let projectJson = JSON.parse(content);
      projectJson.title = projectJson.title || basename(cwd);

      let projects: Project[] = [new DotnetProject(cwd, projectJson, 'run')];

      // if (projectJson.commands) {
      //   Object.keys(projectJson.commands).forEach((command: string) => {
      //     projects.push(new DotnetProject(path, projectJson, command, []));
      //   });
      // }

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