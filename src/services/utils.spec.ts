import {test} from 'ava';
import {any} from './utils';

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