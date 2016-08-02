#!/usr/bin / env node

import {Question, Separator} from 'inquirer';
import {ParsedArgs} from 'minimist';
import * as chalk from 'chalk';
const ansiEscapes = require('ansi-escapes');

import {Playbook, Project, Play} from '../';
import {first} from '../services/utils';

interface Answers {
  [key: string]: any;
}
declare namespace NodeJS
{
  interface ReadableStream {
    setRawMode(mode: boolean): void;
  }
}

const GRAY_BLOCK = chalk.gray('█');
const GREEN_BLOCK = chalk.green('█');
const RED_BLOCK = chalk.red('█');

const app = require('vorpal')();

const pb = new Playbook();

//#region Commands

const autocompletePlays = {
  data: function () {
    return pb.getAll()
      .then((plays: Play[]) => {
        return plays.map(p => p.name);
      });
  }
};

app
  .command('list [playName]', 'Shows available plays')
  .alias('ls').alias('show')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    return showPlays.call(this, args)
      .catch((err: Error) => {
        this.log(chalk.bgRed.white('An error occured while listing...'));
      });
  });

app
  .command('new [playName]', 'Creates a new play.')
  .alias('create')
  .action(function (args: ParsedArgs) {
    let action: Promise<Play>;

    return inputPlayName.call(this, args)
      .then((playName: string) => {
        return pb.create(playName, process.cwd())
      })
      .then(editPlay.bind(this))
      .catch((err: Error) => {
        this.log('An error occured while creating...');
      });
  });

app
  .command('edit [playName]', 'Edit an existing play.')
  .alias('update').alias('change')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    
    return selectPlay.call(this, args)
      .then(editPlay.bind(this))
      .catch((err: Error) => {
        this.log('An error occured while editing...');
      });
  });

app
  .command('delete [playName]', 'Delete an existing play.')
  .alias('del').alias('rm')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    
    return selectPlay.call(this, args)
      .then(deletePlay.bind(this))
      .catch((err: Error) => {
        this.log('An error occured while deleting...');
      });
  });

app
  .command('run [playName]', 'Executes a play.')
  .alias('exec').alias('start')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    
    return selectPlay.call(this, args)
      .then(runPlay.bind(this))
      .catch((err: Error) => {
        this.log('An error occured while running...');
      });
  });

app
  .delimiter('playbook~$')
  .show()
  .parse(process.argv);

//#endregion


//#region Actions

function showPlays(args: ParsedArgs): Promise<void>{

  let playName = args['playName'];

  if (playName) {
    return pb.get(playName)
      .then(play => {
        play.projects.forEach(project => {
          this.log(`  ${project.name}`);
        });
      });
  }

  return pb
    .getAll()
    .then((plays: Play[]) => {
      if (plays.length === 0) {
        this.log(`No plays found! (Try 'playbook new' to create one)`)
      } else {
        plays.forEach(play => {
          this.log(`  ${play.toString()}`);
        });
      }
    });
}

function inputPlayName(args: ParsedArgs): Promise<string> {
  const answerName = 'name';
  let playName = args['playName'];

  if (playName) {
    return Promise.resolve(playName);
  }

  return this
    .prompt([
      {
        type: 'input',
        name: answerName,
        message: 'What is the name of this play?',
        default: args['name'],
      }
    ]).then((answers: Answers) => {
      return <string>answers[answerName];
    });
}

function selectPlay(args: ParsedArgs): Promise<Play> {
  const answerName = 'playName';
  let playName = args['playName'];

  if (playName) {
    return pb.get(playName);
  }

  return pb
    .getAll()
    .then((plays: Play[]): Promise<Play> => {
      
      return this.prompt(<Question[]>[
        {
          type: 'list',
          name: answerName,
          message: 'Which play would you like?',
          choices: plays.map(play => play.name)
        }
      ]).then((answers: Answers): Promise<Play> => {
        playName = <string>answers[answerName];
        let play = first(plays, p => p.name === playName);
        if (play) {
          return Promise.resolve(play);
        } else {
          return Promise.reject<Play>(new Error(`Play "${playName}" not found!`));
        }
      });
    });
}

function editPlay(play: Play): Promise<void> {
  const answerName = 'projects';
  
  return pb
    .findProjects(play.cwd)
    .then((projects: Project[]) => {
      const defaults = [... new Set(play.projects.map(p => p.name))];
      const choices = projects.map(proj => proj.name);

      return this
        .prompt(<Question[]>[
          {
            type: 'checkbox',
            name: answerName,
            message: 'Which projects should be included?',
            choices,
            default: defaults
          }
        ])
        .then((answers: Answers) => {
          return <string[]>answers[answerName];
        })
        .then((projNames: string[]) => {
          const newProjectList = new Set(projNames);
          play.projects = projects.filter(p => p && newProjectList.has(p.name));

          return pb.save(play);
        });
    });
}

function deletePlay(play: Play): Promise<void>{
  const answerName = 'confirmed';

  return this
    .prompt([
      {
        type: 'confirm',
        name: answerName,
        message: 'Are you sure you want to delete this play?',
      }
    ]).then((answers: Answers) => {
      let yes = <boolean>answers[answerName];

      if (yes) {
        return pb.delete(play);
      }
    });
}

function runPlay(play: Play): Promise<void>{
  
  return new Promise<void>((resolve, reject) => {
    let processes = play.run();

    let projectNames = Object.keys(processes);

    projectNames.forEach(proj => {
      this.log(` ${proj} ${(new Array(10)).join(GREEN_BLOCK)}`);
    });

    // TODO: Create process display
    // - Shows each project
    // - Displays bar representing writes to stdout/stderr.
    // - 

    // process.stdin.on('keypress', (ch: any, key: any) => {
    //   app.ui.redraw(key.name);
    //   if (key && key.ctrl && key.name === 'c') {
    //     app.ui.redraw('Tried to cancel!');
    //     resolve();
    //   }
    // });

    setTimeout(() => {
      resolve();
    }, 1000 * 5);
  });
}

//#endregion