import * as path from 'path';
import * as fs from 'fs-jetpack';
import Conf = require('conf');

import {flatten, FileSystemIterator} from './utils';
import { Play, Project } from '../models';

import { nodeHandler } from '../handlers/node';
import { dotnetHandler } from '../handlers/dotnet';
import { ProcessManager } from './process-manager';

const PROJECT_HANDLERS = [nodeHandler, dotnetHandler];

export class Playbook {

  private _cwd: string;
  private _storage: Conf;
  private _fsIterator: FileSystemIterator;
  private _processMgr: ProcessManager;

  constructor({ cwd, lineLimit }: {
    cwd?: string,
    lineLimit?: number
  } = {}) {
    this._cwd = cwd || fs.cwd();
    this._storage = new Conf({
      configName: 'playbook',
      projectName: 'playbook',
      cwd: this._cwd
    });
    let acceptedFiles = [...new Set<string>(flatten<string>(PROJECT_HANDLERS.map(ph => ph.files)))];
    this._fsIterator = new FileSystemIterator(acceptedFiles, ['node_modules', 'bower_components', 'typings', 'artifacts', 'bin', 'obj', 'packages']);
    if (lineLimit) this.lineLimit = lineLimit;
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

  public async getAll(): Promise<Play[]> {
    let projectHash = this._storage.get('plays') || {};
    return Object.keys(projectHash).map(projName => this._formatPlay(projectHash[projName]));
  }

  public async get(playName: string): Promise<Play> {
    if (!this._storage.has(playPath(playName))) {
      return null;
    }

    let play = this._storage.get(playPath(playName));
    return this._formatPlay(play);
  }

  public async create(name: string): Promise<Play> {

    const exists = await this._exists(name);

    if (exists) {
      return Promise.reject(`Play "${name}" already exists!`);
    } else {
      let play = this._formatPlay({ name });

      return this.save(play);
    }
  }

  public async save(play: Play): Promise<Play> {
    this._storage.set(playPath(play.name), play);
    
    return play;
  }

  public async delete(play: Play): Promise<void> {
    this._storage.delete(playPath(play.name));
  }

  public async findProjects(cwd?: string): Promise<Project[]> {
    cwd = cwd || this._cwd;
    const results = await this._fsIterator.map<Project>(cwd, async (projectPath: string) => {
      const content: string = await fs.readAsync(projectPath);

      return flatten(PROJECT_HANDLERS.map(projectHandler => {
        if (projectHandler.files.some(file => projectPath.endsWith(file))) {
          return projectHandler.extract(projectPath, content).map(this._formatProject.bind(this));
        }
        return [];
      }));
    });

    return results;
  }

  public async run(play: string | Play, drawFn: (str: string) => void): Promise<void> {
    if (this._processMgr) return Promise.reject(`A play is already running!`);

    if (typeof play === 'string') play = await this.get(play);

    this._processMgr = new ProcessManager(play, this.lineLimit);

    return this._processMgr.execute(drawFn);
  }

  public async cancel(): Promise<void> {
    if (!this._processMgr) return;

    this._processMgr.cancel();
    await this._processMgr.currentRun;
    this._processMgr = null;
  }

  private _exists(playName: string): Promise<boolean> {
    return Promise.resolve(this._storage.has(playPath(playName)));
  }

  private _formatPlay(play: Play): Play {
    play.projects = (play.projects || []).map(this._formatProject.bind(this));
    return play;
  }

  private _formatProject(project: Project): Project {
    if (project.cwd) project.cwd = path.relative(this._cwd, project.cwd);
    project.args = project.args || [];
    project.delay = project.delay || 0;
    project.enabled = typeof project.enabled === 'boolean' ? project.enabled : true;
    return project;
  }
}

function playPath(playName: string): string {
  return `plays.${playName}`;
}