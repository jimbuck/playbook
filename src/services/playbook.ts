import * as fs from 'fs';
import * as path from 'path';
import {ChildProcess} from 'child_process';

import * as pify from 'pify';
const $fs = pify(fs);

const Conf = require('conf');

import {flatten} from './utils';
import {Play} from '../models/play';
import {ProjectHandler, Project} from '../models/project';

import {nodeHandler} from '../handlers/node';
import {dotnetHandler} from '../handlers/dotnet';

const PROJECT_HANDLERS = [nodeHandler, dotnetHandler];

import {any, forp, FileSystemIterator} from './utils';

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
    return Promise.resolve(new Play(this._storage.get(`data.plays.${playName}`)));
  }

  public create(playName: string): Promise<Play> {
    let play = new Play({ name: playName });
    
    return this.save(play);
  }

  public save(play: Play): Promise<Play> {
    this._storage.set(`data.plays.${play.name}`, play);

    return Promise.resolve(play);
  }

  public delete(play: Play): Promise<Play> {
    this._storage.delete(`data.plays.${play.name}`);

    return Promise.resolve(play);
  }

  public run(playName: string): Promise<ChildProcess[]> {
    return this
      .get(playName)
      .then((play) => play.run());
  }

  public findProjects(cwd: string): Promise<Project[]> {
    return this._fsIterator.map(cwd, (p: string) => {
      return $fs.readFile(p, 'utf8').then((content: string) => {
        return PROJECT_HANDLERS.map(projectHandler => {
          if (projectHandler.files.some(file => p.endsWith(file))) {
            return projectHandler.extract(p, content);
          }
          return [];
        });
      });
    });
  }
}