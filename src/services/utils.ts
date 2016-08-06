
import * as fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
const $fs = pify(fs);

const NO_OP = () => { };

export type AsyncResult<T> = T | T[] | PromiseLike<T | T[]>;


/**
 * Returns the first item of the array matching the specified predicate.
 * 
 * @export
 * @template T
 * @param {T[]} array
 * @param {(item: T, index: number) => boolean} predicate
 * @returns {T}
 */
export function first<T>(array: T[], predicate: (item: T, index: number) => boolean): T {
  for (let i = 0; i < array.length; i++){
    if (predicate(array[i], i)) {
      return array[i];
    }
  }

  return null;
}

/**
 * Recursively flattens an array, ignoring any undefined elements.
 * 
 * @export
 * @param {any[]} array
 * @returns {any[]}
 */
export function flatten<T>(array: any[]): T[]
{
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
export class Queue<T> extends Array<T>
{
  constructor(private _limit: number = 0) {
    super();
  }

  /**
   * Adds a new item to the queue.
   * 
   * @param {T} item
   */  
  public enqueue(item: T) {
    this.push(item);

    if (this._limit > 0 && this.length > this._limit) {
      this.dequeue();
    }
  }

  /**
   * Removes an item from the queue.
   * 
   * @returns {T}
   */  
  public dequeue(): T {
    return this.shift();
  }
}