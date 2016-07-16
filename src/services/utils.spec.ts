import {join, resolve} from 'path';
import {test} from 'ava';
import {any, FileSystemIterator} from './utils';

test(`'any' returns false if no context is defined`, t => {
  let input: number[];

  let result = any(input);
  t.false(result);
});

test(`'any' returns false if no items`, t => {
  let input: number[] = [];

  let result = any(input);
  t.false(result);
});

test(`'any' returns true if many items`, t => {
  let input: number[] = [4];

  let result = any(input);
  t.true(result);
});

test(`'any' returns false if no items match`, t => {
  let input: number[] = [2, 4, 8];

  let result = any(input, (num) => {
    return num % 2 === 1;
  });
  t.false(result);
});

test(`'any' returns true if one item matches`, t => {
  let input: number[] = [2, 1, 8];

  let result = any(input, (num) => {
    return num % 2 === 1;
  });
  t.true(result);
});

const TEST_DIR = resolve(__dirname, '../../test');

test(`FileSystemIterator - 'scan' returns target files`, t => {
  let fsIterator = new FileSystemIterator(['package.json']);
  const expectedPaths = [join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json'), join(TEST_DIR, 'ignored-folder', 'package.json')];

  return fsIterator
    .scan(TEST_DIR)
    .then((paths: string[]) => {
      t.is(paths.length, expectedPaths.length);
      paths.forEach(p => {
        t.true(expectedPaths.indexOf(p) > -1);
      });
    });
});

test(`FileSystemIterator - 'ignoredFolders' skips specified folders`, t => {
  let fsIterator = new FileSystemIterator(['package.json'], ['ignored-folder']);
  const expectedPaths = [join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json')];

  return fsIterator
    .scan(TEST_DIR)
    .then((paths: string[]) => {
      t.is(paths.length, expectedPaths.length);
      paths.forEach(p => {
        t.true(expectedPaths.indexOf(p) > -1);
      });
    });
});