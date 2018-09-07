import { test } from 'ava';
import { Play, playToString } from './models';

const EMPTY_STRING = '';

test(`'playToString' is a function`, t => {
  t.is(typeof playToString, 'function');
});

test(`'playToString' returns the name and project count`, t => {
  const EXPECTED_PROJECT_COUNT = 3;
  const EXPECTED_NAME = 'TestPlay';
  const EXPECTED_OUTPUT = `${EXPECTED_NAME} (${EXPECTED_PROJECT_COUNT})`;
  const play: Play = {
    name: EXPECTED_NAME,
    projects: Array(EXPECTED_PROJECT_COUNT).fill(0)
  };
  const actualOutput = playToString(play);
  t.is(actualOutput, EXPECTED_OUTPUT);
});

test(`'playToString' returns an empty string when play is falsy`, t => {
  const actualOutput = playToString(null);
  t.is(actualOutput, EMPTY_STRING);
});

test(`'playToString' gracefully handles a missing projects array`, t => {
  const EXPECTED_NAME = 'TestPlay';
  const EXPECTED_OUTPUT = `${EXPECTED_NAME} (0)`;
  const play: Play = {
    name: EXPECTED_NAME
  };
  const actualOutput = playToString(play);
  t.is(actualOutput, EXPECTED_OUTPUT);
});