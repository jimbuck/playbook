import {join, resolve} from 'path';
import {test} from 'ava';
import {flatten, forp, FileSystemIterator, Queue} from './utils';

const NO_OP = () => { };
const TEST_DIR = resolve(__dirname, '../../test');

console.log(`The TEST_DIR is "${TEST_DIR}".`);

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

  t.true(typeof result.then === 'function');
  
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
    return new Promise<string>((resolve, reject) => {
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

test(`'Queue' is a class`, t => {
  t.is(typeof Queue, 'function');
});

test(`'Queue' requires no options`, t => {
  t.notThrows(() => new Queue<Date>());
});

test(`'Queue' accepts an optional limit`, t => {
  let q = new Queue<Date>(3);
  t.is(q.limit, 3);
});

test(`'Queue' limit is enforced during enqueue.`, t => {
  let q = new Queue<Date>(3);
  q.enqueue(new Date());
  t.is(q.count, 1);
  q.enqueue(new Date());
  t.is(q.count, 2);
  q.enqueue(new Date());
  t.is(q.count, 3);
  q.enqueue(new Date());
  t.is(q.count, 3);
});

test(`'Queue' limit is enforced after limit changed.`, t => {
  let q = new Queue<Date>(5);
  q.enqueue(new Date());
  t.is(q.count, 1);
  q.enqueue(new Date());
  t.is(q.count, 2);
  q.enqueue(new Date());
  t.is(q.count, 3);
  q.enqueue(new Date());
  t.is(q.count, 4);
  q.limit = 3;
  t.is(q.count, 3);
});

test(`'Queue' is FIFO`, async (t) => {
  let d1 = new Date();
  await delay(100);
  let d2 = new Date();
  await delay(100);
  let d3 = new Date();
  await delay(100);
  let d4 = new Date();
  
  let q = new Queue<Date>(3);
  t.is(q.count, 0);
  q.enqueue(d1);
  t.is(q.count, 1);
  q.enqueue(d2);
  t.is(q.count, 2);
  q.enqueue(d3);
  t.is(q.count, 3);
  q.enqueue(d4);
  t.is(q.count, 3);
  t.deepEqual(q.toArray(), [d2, d3, d4]);
});

test(`'Queue.toString' is the same as Array.toString`, t => {
  let q = new Queue<Date>();
  q.enqueue(new Date());
  q.enqueue(new Date());
  q.enqueue(new Date());
  t.is(q.toString(), q.toArray().toString());
});

function delay(duration: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
}