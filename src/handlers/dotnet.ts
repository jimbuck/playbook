
import {spawn, ChildProcess} from 'child_process';
import {ProjectHandler, IProject} from '../models/project';
import {Question, Answers} from 'inquirer';
import {ParsedArgs} from 'minimist';

export const dotnetHandler: ProjectHandler = {
  name: 'dotnet',
  desc: 'Apps powered by .NET Core CLI.',
  command: 'dotnet',
  check: (path: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {

      return false;
    });
  },
  configure: () => {
    return ['run'];
  }
};