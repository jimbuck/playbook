import * as fs from 'fs';
import * as path from 'path';
import {ChildProcess} from 'child_process';

const Conf = require('conf');

import {Play} from '../models/play';
import {ProjectHandler, Project} from '../models/project';
import {dnxHandler} from '../handlers/dnx';
import {dotnetHandler} from '../handlers/dotnet';

const PROJECT_HANDLERS = {
  [dnxHandler.name]: dnxHandler,
  [dotnetHandler.name]: dotnetHandler
};

import {any, forp, FileSystemIterator} from './utils';

export class Playbook {

  private _storage: Conf;
  private _fsIterator: FileSystemIterator;

  constructor(opts?: {}) {
    this._storage = new Conf();
    this._fsIterator = new FileSystemIterator(['package.json', 'project.json'], ['node_modules', 'bower_components', 'typings', 'artifacts', 'bin', 'packages']);
  }

  public getAll(): Promise<Play[]> {
    let projectHash = this._storage.get('data.plays');
    return Promise.resolve(Object.keys(projectHash).map(projName => new Play(projectHash[projName])));
  }

  public get(name: string): Promise<Play> {
    return Promise.resolve(new Play(this._storage.get(`data.plays.${name}`)));
  }

  public create(name: string): Promise<Play> {
    let play = new Play({ name });

    return this
      .save(play)
      .then(() => play);
  }

  public save(play: Play): Promise<this> {
    this._storage.set(`data.plays.${play.name}`, play);

    return Promise.resolve(this);
  }

  public delete(play: Play): Promise<this> {
    this._storage.delete(`data.plays.${play.name}`);

    return Promise.resolve(this);
  }

  public run(name: string): Promise<ChildProcess[]> {
    return this
      .get(name)
      .then((play) => play.run());
  }

  public findProjects(cwd: string): Promise<Project[]> {
    return this._fsIterator.map(cwd, (p: string) => {
      
      // TODO: Add check for which type of project it should be (probably from the ProjectHandlers).
      
      return new Project({ path: p });
    });
  }
}