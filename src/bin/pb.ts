#!/usr/bin/env node

import { Question } from 'inquirer';
import * as updateNotifier from 'update-notifier';
import * as minimist from 'minimist';
import chalk from 'chalk';
import * as ansiEscapes from 'ansi-escapes';

import { Playbook, Project, Play, playToString } from '../';

// Check for updates...
const pkg = require('../../package.json');
updateNotifier({ pkg }).notify();

let args = minimist(process.argv);
if (args['version'] || args['v']) {
  console.log(args);
  console.log(pkg.version);
  process.exit(0);
}

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
  .command('list [playName]', 'Shows available plays currently regsitered.')
  .alias('ls', 'dir', 'show')
  .autocomplete(autocompletePlays)
  .action(function (args: minimist.ParsedArgs) {
    return showPlays.call(this, args)
      .catch((err: Error) => {
        this.log(chalk.bgRed.white('An error occured while listing...'), err);
      });
  });

let lastCreatedPlay: Play;
app
  .command('new [playName]', 'Create a new play with a collection of projects.')
  .alias('create')
  .action(function (args: minimist.ParsedArgs) {
    lastCreatedPlay = null;
    return inputPlayName.call(this, args)
      .then(async (playName: string) => {
        let existsingPlay = await pb.get(playName);
        if (existsingPlay) {
          this.log(`The play '${playName}' already exists! Please try a different name.`);
          return;
        }

        return pb.create(playName)
          .then(play => lastCreatedPlay = play)
          .then(editPlay.bind(this))
          .then(() => {
            lastCreatedPlay = null;
          })
          .catch((err: Error) => {
            this.log(chalk.bgRed.white('An error occured while creating! Please try again.'), err);
            return pb.delete(lastCreatedPlay).then(() => lastCreatedPlay = null);
          });
      });
  })
  .cancel(function () {
    if (lastCreatedPlay) return pb.delete(lastCreatedPlay).then(() => lastCreatedPlay = null);
  });

app
  .command('edit [playName]', 'Edit the projects assigned to an existing play.')
  .alias('update', 'change')
  .autocomplete(autocompletePlays)
  .action(function (args: minimist.ParsedArgs) {
    
    return selectPlay.call(this, args)
      .then(editPlay.bind(this))
      .catch((err: Error) => {
        this.log(chalk.bgRed.white('An error occured while editing...'), err);
      });
  });

app
  .command('delete [playName]', 'Delete an existing play.')
  .alias('del', 'remove', 'rm')
  .autocomplete(autocompletePlays)
  .action(function (args: minimist.ParsedArgs) {
    
    return selectPlay.call(this, args)
      .then(deletePlay.bind(this))
      .catch((err: Error) => {
        this.log(chalk.bgRed.white('An error occured while deleting...'), err);
      });
  });

app
  .command('run [playName]', 'Run a play!')
  .alias('exec', 'start')
  .autocomplete(autocompletePlays)
  .action(function (args: minimist.ParsedArgs) {
    
    return selectPlay.call(this, args)
      .then(play => {
        return pb.run(play, text => app.ui.redraw(text));
      })
      .catch((err: Error) => {
        this.log(chalk.bgRed.white(err.message), err);
      });
  })
  .cancel(function () {
    return pb.cancel().then(() => {
      this.log(`Cancelled!`);
    });
  });

app
  .command('clear', 'Resets the console to a blank slate.')
  .alias('cls')
  .action(function(args: minimist.ParsedArgs, cb: () => void){
    this.log(ansiEscapes.clearScreen);
    cb();
  });

app
  .command('version', 'Prints the current version of playbook.')
  .alias('v')
  .action(function (args: minimist.ParsedArgs, cb: () => void) {
    this.log(pkg.version);
    cb();
  });

app
  .delimiter('playbook~$')
  .show()
  .parse(process.argv);

//#endregion


//#region Actions

function showPlays(args: minimist.ParsedArgs): Promise<void>{

  let playName = args['playName'];

  if (playName) {
    return pb.get(playName)
      .then(play => {
        play.projects.forEach(project => {
          this.log(`  ${project.name}`);
        });
      }).catch(err => {
        this.log(chalk.red(`Play "${playName}" not found!`), err);
        return showPlays.call(this, {});
      });
  }

  return pb
    .getAll()
    .then((plays: Play[]) => {
      if (plays.length === 0) {
        this.log(`No plays found! (Try 'new' to create one)`);
      } else {
        plays.forEach(play => {
          this.log(`  ${playToString(play)}`);
        });
      }
    });
}

function inputPlayName(args: minimist.ParsedArgs): Promise<string> {
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
        message: 'What is the name of this play? ',
        default: args['name'],
      }
    ]).then((answers: { [key: string]: string }) => {
      return answers[answerName];
    });
}

function selectPlay(args: minimist.ParsedArgs): Promise<Play> {
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
          message: 'Which play would you like? ',
          choices: plays.map(play => {
            return {name: playToString(play), value: play.name}
          })
        }
      ]).then((answers: { [key: string]: string }): Promise<Play> => {
        playName = answers[answerName];
        let play = plays.find(p => p.name === playName);
        if (play) {
          return Promise.resolve(play);
        } else {
          return Promise.reject(`Play "${playName}" not found!`);
        }
      });
    });
}

function editPlay(play: Play): Promise<void> {
  const answerName = 'projects';
  
  return pb
    .findProjects()
    .then((projects: Project[]) => {
      const defaults = [... new Set(play.projects.map(p => p.name))];
      const choices = projects.map(proj => proj.name);

      return this
        .prompt(<Question[]>[
          {
            type: 'checkbox',
            name: answerName,
            message: 'Which projects should be included? ',
            choices,
            default: defaults
          }
        ])
        .then((answers: { [key: string]: string[] }) => {
          return answers[answerName];
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
        message: `Are you sure you want to delete "${playToString(play)}"? `,
      }
    ]).then((answers: { [key: string]: boolean }) => {
      let yes = answers[answerName];

      if (yes) {
        return pb.delete(play);
      }
    });
}

//#endregion