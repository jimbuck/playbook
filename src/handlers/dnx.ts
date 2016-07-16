
import {spawn, ChildProcess} from 'child_process';
import {ProjectHandler, IProject} from '../models/project';
import {Question, Answers} from 'inquirer';
import {ParsedArgs} from 'minimist';

export const dnxHandler: ProjectHandler = {
  name: 'dnx',
  desc: 'Apps powered by DNX.',
  command: 'dnx',
  check: () => {
    return Promise.resolve(false);
  },
  configure: () => {
    return this.prompt(<Question[]>[
      {
        type: 'input',
        name: 'command',
        message: `Which command should be executed ('web', 'run', etc)?`,
        default: 'run'
      }
    ]).then((answers: Answers) => {
      return [answers['command']];
    });
  }
};