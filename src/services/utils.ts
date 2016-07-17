
import * as fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
const $fs = pify(fs);


/**
 * Returns true if at least one element matches the provided expression. If no expression is provided, the element's existence is used instead.
 * 
 * @export
 * @template T
 * @param {T[]} ctx
 * @param {(item: T) => boolean} [expr]
 * @returns {boolean}
 */
export function any<T>(ctx: T[], expr?: (item: T) => boolean): boolean {
  if (!ctx) return false;

  for (let i = 0; i < ctx.length; i++) {
    if (!expr || expr(ctx[i])) {
      return true;
    }
  }

  return false;
}

export function forp<TItem, TResult>(items: TItem[], handler: (item: TItem, index: number) => TResult | TResult[] | Promise<TResult[]>): Promise<TResult[]> {
  let tasks: (TResult[] | Promise<TResult[]>)[] = [];

  for (let i = 0; i < items.length; i++) {
    let result = handler(items[i], i);

    if (Array.isArray(result)) {
      tasks.push(result);
    } else if (result instanceof Promise) {
      tasks.push(result);
    } else {
      tasks.push([result]);
    }
  }

  return Promise
    .all<TResult[]>(tasks)
    .then((results) => {
      let projects: TResult[] = [];
      for (let i = 0; i < results.length; i++) {
        if (!results[i] || results[i].length === 0) {
          continue;
        }

        Array.prototype.push.apply(projects, results[i]);
      }

      return projects;
    });
}

export class FileSystemIterator
{

  constructor(public targetFiles: string[], public ignoreFolders?: string[]) {
    this.ignoreFolders = this.ignoreFolders || [];
  }

  scan(dir: string): Promise<string[]> {
    return this.map(dir, p => p);
  }

  map<T>(dir: string, mapFn: (path: string) => T | T[] | Promise<T> | Promise<T[]>): Promise<T[]> {
    let tasks: Promise<void>[] = [];
    let results: T[] = [];
    return this
      .iterate(dir, p => {
        let result = mapFn(p);
        
        if (!(result instanceof Promise)) {
          result = Promise.resolve<T | T[]>(result);
        }

        let task = (result as Promise<T | T[]>).then(vals => {
          if (Array.isArray(vals)) {
            Array.prototype.push.apply(results, vals);
          } else if (typeof vals !== 'undefined') {
            results.push(vals);
          }
        });

        tasks.push(task);
      })
      .then(() => {
        return Promise.all(tasks);
      })
      .then(() => {
        return results;
      });
  }

  iterate(dir: string, handler: (path: string) => void): Promise<void> {
    return $fs
      .readdir(dir)
      .then((paths: string[]) => {
        let tasks: Promise<void>[] = [];
        for (let i = 0; i < paths.length; i++) {
          let filename = paths[i];
          let fullPath = path.join(dir, filename);

          if (any(this.ignoreFolders, (f: string) => filename === f)) {
            // It matches a folder/file in the ignore path, stop here...
            continue;
          }

          if (any(this.targetFiles, (f: string) => filename === f)) {
            // It matches a target file! (handle it and stop here)...
            handler(fullPath);
            continue;
          }

          tasks.push($fs
            .lstat(fullPath)
            .then((stats: fs.Stats) => {
              if (stats.isDirectory()) {
                return this.iterate(fullPath, handler);
              }
            }, (err: any) => {
              // Do nothing, we just can't access that file (no biggie).
            }));
        }

        return Promise.all(tasks);
      });
  }
}