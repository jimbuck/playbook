import {join, resolve} from 'path';
import {test} from 'ava';
import {flatten, forp, FileSystemIterator} from './utils';

const NO_OP = () => { };
const TEST_DIR = resolve(__dirname, '../../test');

console.log(`The TEST_DIR is "${TEST_DIR}"."`);

test(`'flatten' returns the same array if already flattened`, t => {
  let input = [2, 4, 6, 8];
  let output = flatten(input);
  t.deepEqual(output, input);
});

test(`'flatten' recursively flattens nested arrays`, t => {
  let input = [2, [4, [6]], 8];
  let expectedOutput = [2, 4, 6, 8];
  let output = flatten(input);
  t.deepEqual(output, expectedOutput);
});

test(`'flatten' ignores "undefined" elements`, t => {
  let input = [2, [4, [undefined, 6]], 8];
  let expectedOutput = [2, 4, 6, 8];
  let output = flatten(input);
  t.deepEqual(output, expectedOutput);
});

test(`'forp' accepts a list of items and returns a promise`, t => {
  let result = forp([1], (num, index) => {
    return num;
  });

  t.true(result instanceof Promise);
  
  return result.then(NO_OP);
});

test(`'forp' handles syncronous handlers`, t => {
  let input = [1, 2, 3, 4];
  let expectedItems = ['#2', '#4', '#6', '#8'];
  return forp(input, (num, index) => {
    return '#' + (num * 2);
  }).then((actualItems) => {
    actualItems.forEach((str, index) => {
      t.is(str, expectedItems[index]);
    });
  });
});

test(`'forp' handlers allow multiple return values`, t => {
  let input = [1, 2, 3, 4];
  let expectedItems = ['#1', '#2', '#2', '#4', '#3', '#6', '#4', '#8'];
  return forp(input, (num, index) => {
    return ['#' + num, '#' + (num * 2)];
  }).then((actualItems) => {
    actualItems.forEach((str, index) => {
      t.is(str, expectedItems[index]);
    });
  });
});

test(`'forp' handles single return promise `, t => {
  let input = [1, 2, 3, 4];
  let expectedItems = ['#1', '#2', '#3', '#4'];
  return forp<number, string>(input, (num, index) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('#' + num);
      }, 100);
    });
  }).then((actualItems) => {
    actualItems.forEach((str, index) => {
      t.is(str, expectedItems[index]);
    });
  });
});

test(`'forp' skips empty returns`, t => {
  let input = [1, 2, 3, 4];
  let expectedItems = ['#2', '#4'];
  return forp<number, string>(input, (num, index) => {
    if (num % 2 === 0) {
      return '#' + num;
    } else {
      return [];
    }
  }).then((actualItems) => {
    actualItems.forEach((str, index) => {
      t.is(str, expectedItems[index]);
    });
  });
});

test(`'FileSystemIterator.scan' returns target files`, t => {
  let fsIterator = new FileSystemIterator(['package.json']);
  const expectedPaths = [join(TEST_DIR, 'dotnet-b', 'package.json'), join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json'), join(TEST_DIR, 'ignored-folder', 'package.json')];

  return fsIterator
    .scan(TEST_DIR)
    .then((paths: string[]) => {
      t.is(paths.length, expectedPaths.length);
      paths.forEach(p => {
        t.true(expectedPaths.indexOf(p) > -1);
      });
    });
});

test(`'FileSystemIterator.iterate' skips specified folders`, t => {
  let fsIterator = new FileSystemIterator(['package.json'], ['ignored-folder']);
  const expectedPaths = [join(TEST_DIR, 'dotnet-b', 'package.json'), join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json')];

  return fsIterator
    .iterate(TEST_DIR, p => {
      t.false(expectedPaths.indexOf(p) < 0, `Not found (${p})!`);
    });
});

test(`'FileSystemIterator.map' converts provided paths`, t => {
  let fsIterator = new FileSystemIterator(['package.json'], ['ignored-folder']);
  const expectedPaths = [join(TEST_DIR, 'dotnet-b', 'package.json'), join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json')];

  return fsIterator
    .map(TEST_DIR, p => {

      if (p.endsWith('json')) {
        return [p, p];
      }
      
      return p;
    })
    .then((actualPaths: string[]) => {
      t.is(actualPaths.length, expectedPaths.length*2);
      expectedPaths.forEach(p => {
        let firstIndex = actualPaths.indexOf(p);
        t.true(firstIndex > -1, `Not found (${p})!`);
        if(p.endsWith('json')){
          t.true(actualPaths.lastIndexOf(p) > firstIndex, `Only one found (${p})!`);
        } else {
          t.is(actualPaths.lastIndexOf(p), -1);
        }
      });
    });
});