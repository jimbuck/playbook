import * as fs from 'fs';
import {basename, dirname} from 'path';
import * as pify from 'pify';
const $fs = pify(fs);

import {spawn, ChildProcess} from 'child_process';
import {Question, Answers} from 'inquirer';
import {ParsedArgs} from 'minimist';

import {ProjectHandler, IProject, Project} from '../models/project';

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

      let projects: Project[] = [new NodeProject(cwd, packageJson)];

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
      //console.error(ex);
      return [];
    }
  }
};

class NodeProject extends Project {
  constructor(path: string, packageJson: any, args: string[] = []) {
    super({
      name: `${packageJson.name} (node ${packageJson.main})`,
      cwd: path,
      command: 'node',
      args: [packageJson.main, ...args]
    });
  }
}

class NpmProject extends Project {
  constructor(cwd: string, packageJson: any, command: string, args: string[] = []) {
    super({
      name: `${packageJson.name} (npm ${command})`,
      cwd,
      command: 'npm',
      args: ['run', command, ...args]
    });
  }
}