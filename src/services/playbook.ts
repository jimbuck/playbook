import * as fs from 'fs-jetpack';
import Conf = require('conf');

import {flatten, FileSystemIterator} from './utils';
import {Play} from '../models/play';
import {IProject} from '../models/project';

import { nodeHandler } from '../handlers/node';
import { dotnetHandler } from '../handlers/dotnet';
import { ProcessManager } from './process-manager';

const PROJECT_HANDLERS = [nodeHandler, dotnetHandler];

export class Playbook {

  private _storage: Conf;
  private _fsIterator: FileSystemIterator;

  constructor(opts?: {}) {
    this._storage = new Conf();
    let acceptedFiles = [...new Set<string>(flatten<string>(PROJECT_HANDLERS.map(ph => ph.files)))];
    this._fsIterator = new FileSystemIterator(acceptedFiles, ['node_modules', 'bower_components', 'typings', 'artifacts', 'bin', 'obj', 'packages']);
  }

  public get lineLimit(): number {
    let limit: number;

    try {
      limit = parseInt(this._storage.get('lineLimit'), 10);
      if (isNaN(limit) || limit < 1) limit = 1;
    } catch (err) {
      limit = 1;
    }

    return limit;
  }

  public set lineLimit(value: number) {
    this._storage.set('lineLimit', value);
  }

  public getAll(): Promise<Play[]> {
    let projectHash = this._storage.get('plays') || {};
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

  public async save(play: Play): Promise<Play> {
    this._storage.set(playPath(play.name), play);
    return play;
  }

  public async delete(play: Play): Promise<void> {
    this._storage.delete(playPath(play.name));
  }

  public async findProjects(cwd: string): Promise<IProject[]> {
    const results = await this._fsIterator.map<IProject>(cwd, async (path: string) => {
      const content: string = await fs.readAsync(path);

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
  return `plays.${playName}`;
}