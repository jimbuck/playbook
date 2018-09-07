import { ChildProcess } from 'child_process';
import * as fs from 'fs-jetpack';
import { basename, dirname } from 'path';

import { ProjectHandler, Project } from '../models';

const IGNORED_SCRIPTS = [
  'prepublish', 'publish', 'postpublish',
  'preinstalls', 'install', 'postinstall',
  'preuninstalls', 'uninstall', 'postuninstall',
  'preversion', 'version', 'postversion',
  'pretest', 'posttest', // Allow `test`
  'prestop', 'stop', 'poststop',
  'prestart', 'poststart', // Allow `start`
  'prerestart', 'restart', 'postrestart'
];

export const nodeHandler: ProjectHandler = {
  name: 'node',
  desc: 'Apps powered by NodeJS and NPM.',
  files: ['package.json'],
  extract: (path: string, content: string) => {
    try {
      let cwd = dirname(path);
      let packageJson = JSON.parse(content);
      packageJson.title = packageJson.title || basename(cwd);
      packageJson.main = packageJson.main || 'index.js';

      let projects: Project[] = [];

      if(fs.cwd(cwd).exists(packageJson.main))
      {
        projects.push(new NodeProject(cwd, packageJson));
      }

      if (packageJson.scripts) {
        Object.keys(packageJson.scripts)
          .forEach((script: string) => {
            if (IGNORED_SCRIPTS.indexOf(script.toLowerCase()) > -1) {
              return;
            }

            projects.push(new NpmProject(cwd, packageJson, script));
          });
      }

      return projects;
    } catch (ex) {
      return [];
    }
  }
};

class NodeProject implements Project {
  public name: string;
  public cwd: string;
  public command: string = 'node';
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;

  constructor(cwd: string, packageJson: any, args: string[] = []) {
    this.name = `${packageJson.name} (node ${packageJson.main})`;
    this.cwd = cwd;
    this.args = [packageJson.main, ...args];
  }
}

class NpmProject implements Project {
  public name: string;
  public cwd: string;
  public command: string = 'npm';
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;

  constructor(cwd: string, packageJson: any, command: string, args: string[] = []) {
    this.name = `${packageJson.name} (npm run ${command})`;
    this.cwd = cwd;
    this.args = ['run', command, ...args];
  }
}