import {join, resolve} from 'path';
import {test} from 'ava';
import {flatten, parallelMap, FileSystemIterator, Queue} from './utils';

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

test(`'parallelMap' accepts a list of items and returns a promise`, async (t) => {
  const EXPECTED_VALUE = 1;
  let results = await parallelMap([EXPECTED_VALUE], async (item, index) => item);

  t.is(results.length, 1);
  t.is(results[0], EXPECTED_VALUE);
});

test(`'parallelMap' handles syncronous handlers`, async (t) => {
  const input = [1, 2, 3, 4];
  const EXPECTEDITEMS = ['#2', '#4', '#6', '#8'];
  
  const actualItems = await parallelMap(input, async (num) => '#' + (num * 2));

  actualItems.forEach((str, index) => {
    t.is(str, EXPECTEDITEMS[index]);
  });
});

test(`'parallelMap' handlers allow multiple return values`, async (t) => {
  const input = [1, 2, 3, 4];
  const expectedItems = ['#1', '#2', '#2', '#4', '#3', '#6', '#4', '#8'];

  const actualItems = await parallelMap(input, async (num) => ['#' + num, '#' + (num * 2)]);

  actualItems.forEach((str, index) => {
    t.is(str, expectedItems[index]);
  });
});

test(`'parallelMap' handles single return promise `, async (t) => {
  const input = [1, 2, 3, 4];
  const expectedItems = ['#1', '#2', '#3', '#4'];

  const actualItems = await parallelMap<number, string>(input, async (num) => {
    await delay(100);
    return `#${num}`;
  });

  actualItems.forEach((str, index) => {
    t.is(str, expectedItems[index]);
  });
});

test(`'parallelMap' skips empty returns`, async (t) => {
  let input = [1, 2, 3, 4];
  let expectedItems = ['#2', '#4'];

  const actualItems = await parallelMap<number, string>(input, async (num) => {
    if (num % 2 === 0) {
      return `#${num}`;
    } else {
      return [];
    }
  });

  actualItems.forEach((str, index) => {
    t.is(str, expectedItems[index]);
  });
});

test(`'FileSystemIterator.scan' skips specified folders`, t => {
  let fsIterator = new FileSystemIterator(['package.json'], ['ignored-folder']);
  const expectedPaths = [join(TEST_DIR, 'dotnet-b', 'package.json'), join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json')];

  return fsIterator
    .scan(TEST_DIR, async (p) => {
      t.false(expectedPaths.indexOf(p) < 0, `Not found (${p})!`);
    });
});

test(`'FileSystemIterator.map' converts provided paths`, t => {
  let fsIterator = new FileSystemIterator(['package.json'], ['ignored-folder']);
  const expectedPaths = [join(TEST_DIR, 'dotnet-b', 'package.json'), join(TEST_DIR, 'node-a', 'package.json'), join(TEST_DIR, 'node-b', 'package.json')];

  return fsIterator
    .map(TEST_DIR, async (p) => {

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
  return new Promise<void>(resolve => setTimeout(resolve, duration));
}