
import * as path from 'path';
import * as fs from 'fs-jetpack';

export type OneOrMany<T> = T | Array<T>;

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Recursively flattens an array, ignoring any undefined elements.
 * 
 * @export
 * @param {any[]} array
 * @returns {any[]}
 */
export function flatten<T>(array: T|Array<OneOrMany<T>>): Array<T> {
  let flattenedArray: any[] = [];

  if (!Array.isArray(array)) return [array];

  array.forEach(val => {
    if (Array.isArray(val)) {
      Array.prototype.push.apply(flattenedArray, flatten(val));
    } else if(typeof val !== 'undefined') {
      flattenedArray.push(val);
    }
  });

  return flattenedArray;
}

export async function parallelFor<T>(items: T[], handler: (item: T, index: number) => Promise<void>): Promise<void> {
  let tasks = [];
  for (let i = 0; i < items.length; i++) {
    tasks.push(handler(items[i], i));
  }

  await Promise.all(tasks);
}

export async function parallelMap<TItem, TResult>(items: TItem[], handler: (item: TItem, index: number) => Promise<OneOrMany<TResult>>): Promise<Array<TResult>> {
  let results: Array<TResult> = [];

  await parallelFor(items, async (item, index) => {
    let result = await Promise.resolve<OneOrMany<TResult>>(handler(item, index)).then(result => Array.isArray(result) ? result : [result]);

    results.push(...result);
  });
    
  return results;
}

export class FileSystemIterator {

  constructor(public targetFiles: string[], public ignoreFolders?: string[]) {
    this.ignoreFolders = this.ignoreFolders || [];
  }

  public async scan(dir: string, handler: (path: string) => Promise<void>): Promise<void> {
    await this.map<void>(dir, handler);
  }

  public async map<T>(dir: string, handler: (path: string) => Promise<OneOrMany<T>>): Promise<Array<T>> {
    const paths: string[] = await fs.listAsync(dir);
    
    return await parallelMap(paths, async (filename) => {
      const fullPath = path.join(dir, filename);

      if (this.ignoreFolders.some(ignoredFolder => filename === ignoredFolder)) {
        // It matches a folder/file in the ignore path, stop here...
        return [];
      }

      if (this.targetFiles.some(targetFile => filename === targetFile)) {
        // It matches a target file! (handle it and stop here)...
        return handler(fullPath);
      }

      try {
        const type = await fs.existsAsync(fullPath);

        if (type === 'dir') {
          return this.map(fullPath, handler);
        }
      } catch (err) {
        // Do nothing, we just can't access that file (no biggie).
      }

      return [];
    });
  }

  // public async closest(dir: string): Promise<string> {
  //   const paths: string[] = await $fs.readdir(dir);

  // }

  // public scanUp(dir: string): Promise<Array<string>> {
    
  // }
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