
import * as fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
const $fs = pify(fs);

const NO_OP = () => { };

export type AsyncResult<T> = T | T[] | PromiseLike<T | T[]>;

/**
 * Recursively flattens an array, ignoring any undefined elements.
 * 
 * @export
 * @param {any[]} array
 * @returns {any[]}
 */
export function flatten<T>(array: any[]): T[] {
  let flattenedArray: any[] = [];

  array.forEach(val => {
    if (Array.isArray(val)) {
      Array.prototype.push.apply(flattenedArray, flatten(val));
    } else if(typeof val !== 'undefined') {
      flattenedArray.push(val);
    }
  });

  return flattenedArray;
}

export function forp<TItem, TResult>(items: TItem[], handler: (item: TItem, index: number) => AsyncResult<TResult>): Promise<TResult[]> {
  let tasks: Array<AsyncResult<TResult>> = [];

  for (let i = 0; i < items.length; i++) {
    let result = handler(items[i], i);

    tasks.push(result);
  }

  return Promise
    .all(tasks)
    .then(flatten);
}

export class FileSystemIterator {

  constructor(public targetFiles: string[], public ignoreFolders?: string[]) {
    this.ignoreFolders = this.ignoreFolders || [];
  }

  scan(dir: string): Promise<string[]> {
    return this.map(dir, p => p);
  }

  iterate(dir: string, handler: (path: string) => void): Promise<void> {
    return this
      .map<void>(dir, handler)
      .then(NO_OP); // Empty promise so we can force it to be void instead of void[].
  }

  map<T>(dir: string, handler: (path: string) => AsyncResult<T>): Promise<T[]> {
    return $fs
      .readdir(dir)
      .then((paths: string[]) => {

        return forp(paths, (filename) => {
          let fullPath = path.join(dir, filename);

          if (this.ignoreFolders.some((f: string) => filename === f)) {
            // It matches a folder/file in the ignore path, stop here...
            return [];
          }

          if (this.targetFiles.some((f: string) => filename === f)) {
            // It matches a target file! (handle it and stop here)...
            return handler(fullPath);
          }

          return $fs
            .lstat(fullPath)
            .then((stats: fs.Stats): AsyncResult<T> => {
              if (stats.isDirectory()) {
                return this.map<T>(fullPath, handler);
              } else {
                return [];
              }
            }, (err: any) => {
              // Do nothing, we just can't access that file (no biggie).
            });
        });
      }).then(flatten);
  }
}


/**
 * A simple queue with optional size limitation.
 * 
 * @export
 * @class Queue
 * @extends {Array<T>}
 * @template T
 */
export class Queue<T>
{
  private _array: Array<T>;  
  private _limit: number;

  constructor(limit: number = 0) {
    this._array = [];
    this.limit = limit;
  }

  public get count(): number {
    return this._array.length;
  }

  public get limit(): number {
    return this._limit;
  }

  public set limit(value: number) {
    if (value <= 0) {
      value = null;
    }
    this._limit = value;

    if (typeof this._limit === 'number') {
      while (this._array.length > this._limit) {
        this.dequeue();
      }
    }    
  }

  /**
   * Adds a new item to the queue.
   * 
   * @param {T} item
   */  
  public enqueue(item: T) {
    this._array.push(item);

    if (this.limit > 0 && this._array.length > this.limit) {
      this.dequeue();
    }
  }

  /**
   * Removes an item from the queue.
   * 
   * @returns {T}
   */  
  public dequeue(): T {
    return this._array.shift();
  }

  public toArray(): Array<T> {
    return this._array.slice();
  }

  public toString(): string {
    return this._array.toString();
  }
}