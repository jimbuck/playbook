
import * as fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
const $fs = pify(fs);

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

export function forp<TItem, TResult>(items: TItem[], handler: (item: TItem, index: number) => TResult | TResult[] | Promise<TResult[]>): Promise<TResult[]> {
  let tasks: Array<TResult[] | Promise<TResult[]>> = [];

  for (let i = 0; i < items.length; i++) {
    let result = handler(items[i], i);

    if (Array.isArray(result)) {
      tasks.push(result);
    } else if (result instanceof Promise) {
      tasks.push(result.then(x => {
        return Array.isArray(x) ? x : [x];
      }));
    } else {
      tasks.push([result]);
    }
  }

  return Promise
    .all<TResult[]>(tasks)
    .then((results) => {
      return flatten(results);
    });
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
      .then(() => {
        // Empty promise so we can force it to be void instead of void[].
      });
  }

  map<T>(dir: string, handler: (path: string) => T | T[] | Promise<T | T[]>): Promise<T[]> {
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
            .then((stats: fs.Stats) => {
              if (stats.isDirectory()) {
                return this.map(fullPath, handler);
              }
            }, (err: any) => {
              // Do nothing, we just can't access that file (no biggie).
            });
        });
      }).then((results: T[]) => {
        return flatten(results).filter(r => !!r);
      });
  }
}