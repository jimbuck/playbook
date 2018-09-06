import * as fs from 'fs';
import * as pify from 'pify';
const $fs = pify(fs);

import Conf from 'conf';

import {flatten, FileSystemIterator} from './utils';
import {Play} from '../models/play';
import {IProject} from '../models/project';

import {nodeHandler} from '../handlers/node';
import {dotnetHandler} from '../handlers/dotnet';

const PROJECT_HANDLERS = [nodeHandler, dotnetHandler];

export class Playbook {

  private _storage: Conf;
  private _fsIterator: FileSystemIterator;

  constructor(opts?: {}) {
    this._storage = new Conf();
    let acceptedFiles = [...new Set<string>(flatten<string>(PROJECT_HANDLERS.map(ph => ph.files)))];
    this._fsIterator = new FileSystemIterator(acceptedFiles, ['node_modules', 'bower_components', 'typings', 'artifacts', 'bin', 'obj', 'packages']);
  }

  public getAll(): Promise<Play[]> {
    let projectHash = this._storage.get('data.plays') || {};
    return Promise.resolve(Object.keys(projectHash).map(projName => new Play(projectHash[projName])));
  }

  public get(playName: string): Promise<Play> {
    if (!this._storage.has(playPath(playName))) {
      return Promise.reject<Play>(new Error(`Play "${playName}" was not found!`));
    }

    return Promise.resolve(new Play(this._storage.get(playPath(playName))));
  }

  public create(playName: string, cwd: string): Promise<Play> {

    return this.exists(playName)
      .then((exists) => {
        if (exists) {
          return Promise.reject<Play>(new Error(`Play "${playName}" already exists!`));
        } else {
          let play = new Play({ name: playName, cwd });
    
          return this.save(play);
        }
      });
  }

  public save(play: Play): Promise<Play> {
    this._storage.set(playPath(play.name), play);

    return Promise.resolve(play);
  }

  public delete(play: Play): Promise<void> {
    this._storage.delete(playPath(play.name));

    return Promise.resolve();
  }

  public async findProjects(cwd: string): Promise<IProject[]> {
    const results = await this._fsIterator.map<IProject>(cwd, async (path: string) => {
      const content: string = await $fs.readFile(path, 'utf8');

      return flatten(PROJECT_HANDLERS.map(projectHandler => {
        if (projectHandler.files.some(file => path.endsWith(file))) {
          return projectHandler.extract(path, content);
        }
        return [];
      }));
    });

    return results;
  }

  private exists(playName: string): Promise<boolean> {
    return Promise.resolve(this._storage.has(playPath(playName)));
  }
}

function playPath(playName: string): string {
  return `data.plays.${playName}`;
}