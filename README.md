# playbook
A simple tool for running multiple projects at once.

[![Build Status](https://travis-ci.org/JimmyBoh/playbook.svg?branch=master)](https://travis-ci.org/JimmyBoh/playbook)
[![Coverage Status](https://coveralls.io/repos/github/JimmyBoh/playbook/badge.svg?branch=master)](https://coveralls.io/github/JimmyBoh/playbook?branch=master)
[![NPM Dependencies](https://david-dm.org/JimmyBoh/playbook.svg)](https://david-dm.org/JimmyBoh/playbook)


This module will recursively scan the current directory, looking for supported project types. After selecting which projects you'd like to run, it will execute them all simultaneously, perfect for those multi-tiered projects!

## Example:

```sh
# Run select .NET Core 1.0 projects...
pb

# Run select node projects...
md node

# Run any selection of any projects...
md        
```

```ts
import * as fs from 'fs';
import {Playbook} from '@jimmyboh/playbook';

// tbd...
let pb = new Playbook();
```

## Features:
 - Auto-scan for projects.
 - Intelligently runs each project type.
 - Remembers runtime configurations for rapid usage.
 
## Contribute
 
 0. Fork it
 1. `npm i`
 2. `gulp watch`
 3. Make changes and **write tests**.
 4. Send pull request! :sunglasses:
 
## License:
 
GPL-3.0