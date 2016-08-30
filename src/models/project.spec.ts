import {resolve} from 'path';

import {test} from 'ava';
import {Project, IProject} from './project';

test(`'Project' is a thing`, t => {
  t.is(typeof Project, 'function');
});

test(`'Project' options are optional`, t => {
  let proj = new Project();
  t.not(typeof proj, 'undefined');
});

test(`'Project' options may be null`, t => {
  let proj = new Project(null);
  t.not(typeof proj, 'undefined');
});

test(`'Project' options auto-populate arguments property`, t => {
  let expected: IProject = {
    name: 'Ava Tests Project'
  };
  let proj = new Project(expected);
  t.not(typeof proj, 'undefined');
  t.true(Array.isArray(proj.args));
  t.is(proj.args.length, 0);
});

test(`'Project' options populate values`, t => {
  let expected: IProject = {
    name: 'Ava Tests Project',
    cwd: '/some/test/directory',
    command: 'some-command',
    args: ['1', '2', 'false'],
    currentProcess: null
  };
  let proj = new Project(expected);
  t.not(typeof proj, 'undefined');
  t.is(proj.name, expected.name);
  t.is(proj.cwd, expected.cwd);
  t.is(proj.command, expected.command);
  t.is(proj.args, expected.args);
  t.is(proj.currentProcess, expected.currentProcess);
});