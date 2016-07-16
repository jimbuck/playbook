import {resolve} from 'path';

import {test} from 'ava';
import {Playbook} from './playbook';

test(`'Playbook' is a thing`, t => {
  t.is(typeof Playbook, 'function');
});