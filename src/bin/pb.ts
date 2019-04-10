#!/usr/bin/env node

import { Question } from 'inquirer';
import * as updateNotifier from 'update-notifier';
import * as minimist from 'minimist';
import { ParsedArgs } from 'minimist';
import chalk from 'chalk';
import * as ansiEscapes from 'ansi-escapes';

import { Playbook, PlaybookSettings, Project, Play, playToString } from '../';
import { ProjectHandler } from '../models';

const EMPTY_STRING = '';

// Check for updates...
const pkg = require('../../package.json');
updateNotifier({ pkg }).notify();

let args = minimist(process.argv.slice(2));
if (args._.findIndex(arg => arg.toLowerCase() === 'v' || arg.toLowerCase() === 'version') > -1) {
  console.log(pkg.version);
  process.exit(0);
}

// if no command or run was specified from the CLI then autoclear on exit...
if (args._.length === 0 || args._[0] === 'run') process.on('exit', code => !code && console.clear());

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
  .action(function (args: ParsedArgs) {
    return showPlays(args)
      .catch((err: Error) => {
        app.activeCommand.log(chalk.bgRed.white('An error occured while listing...'), err);
      });
  });

app
  .command('new [playName]', 'Create a new play with a collection of projects.')
  .alias('create')
  .action(function (args: ParsedArgs) {
    return _inputPlayName(args)
      .then(async (playName: string) => {
        let existsingPlay = await pb.get(playName);
        if (existsingPlay) {
          app.activeCommand.log(`The play '${playName}' already exists! Please try a different name.`);
          return;
        }

        return pb.create(playName)
          .then(play => {
            return _editPlay(play).catch((err: Error) => {
              app.activeCommand.log(chalk.bgRed.white('An error occured while adding projects! Please try again.'), err);
            });
          })
          .catch((err: Error) => {
            app.activeCommand.log(chalk.bgRed.white('An error occured while naming the play! Please try again.'), err);
          });
      });
  });

app
  .command('edit [playName]', 'Edit the projects assigned to an existing play.')
  .alias('update', 'change')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    
    return _selectPlay(args)
      .then(_editPlay)
      .catch((err: Error) => {
        app.activeCommand.log(chalk.bgRed.white('An error occured while editing...'), err);
      });
  });

app
  .command('delete [playName]', 'Delete an existing play.')
  .alias('del', 'remove', 'rm')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    
    return _selectPlay(args)
      .then(deletePlay)
      .catch((err: Error) => {
        app.activeCommand.log(chalk.bgRed.white('An error occured while deleting...'), err);
      });
  });

app
  .command('run [playName]', 'Run a play!')
  .alias('exec', 'start')
  .autocomplete(autocompletePlays)
  .action(function (args: ParsedArgs) {
    
    return _selectPlay(args)
      .then(async (play) => {
        app.activeCommand.log(ansiEscapes.clearScreen);
        await pb.run(play, text => app.ui.redraw(text));
        app.activeCommand.log(ansiEscapes.clearScreen);
      })
      .catch((err: Error) => {
        app.activeCommand.log(chalk.bgRed.white(err.message), err);
      });
  })
  .cancel(function () {
    return pb.cancel().then(() => {
      app.activeCommand.log(`Cancelled!`);
    });
  });

app
  .command('cwd', 'Prints the current working directory.')
  .alias('pwd')
  .action(function (args: ParsedArgs, cb: () => void) {
    app.activeCommand.log(pb.cwd);
    cb();
  });

app
  .command('clear', 'Resets the console to a blank slate.')
  .alias('cls', 'reset')
  .action(function(args: ParsedArgs, cb: () => void){
    app.activeCommand.log(ansiEscapes.clearScreen);
    cb();
  });

app
  .command('version', 'Prints the current version of playbook.')
  .alias('v')
  .action(function (args: ParsedArgs, cb: () => void) {
    app.activeCommand.log(pkg.version);
    cb();
  });

app
  .delimiter('playbook~$')
  .show()
  .parse(process.argv);

//#endregion


//#region Actions

function showPlays(args: ParsedArgs): Promise<void> {

  let playName = args['playName'];

  if (playName) {
    return pb.get(playName)
      .then(play => {
        play.projects.sort((a,b) => a.name.localeCompare(b.name)).forEach(project => {
          app.activeCommand.log(`  ${project.name}`);
        });
      }).catch(err => {
        app.activeCommand.log(chalk.red(`Play "${playName}" not found!`), err);
        return showPlays({ _: [] });
      });
  }

  return pb
    .getAll()
    .then(plays => _listPlays(plays));
}

function _editPlay(play: Play): Promise<Play> {
  const answerName = 'projects';
 
  if (!play.projects || !play.projects.length) {
    return addProject(play);
  }
}

function addProject(play: Play): Promise<Play> {
  const answerName = 'project';
  return _chooseHandler()
    .then(handler => pb.findProjects(handler))
    .then(function (choices: Project[]) {
      return app.activeCommand
        .prompt(<Question[]>[
          {
            type: 'checkbox',
            name: answerName,
            message: 'Which project do you want to include? ',
            choices
          }
        ])
    })
    .then(function (answers: { [key: string]: Project }){
      const projectNameAnswer = 'projectName';
      const projectArgsAnswer = 'projectArgs';
      const projectDelayAnswer = 'projectDelay';

      const project = answers[answerName];

      return app.activeCommand
        .prompt(<Question[]>[
          {
            type: 'input',
            name: projectNameAnswer,
            message: 'What is the name of this project? ',
            default: project.name,
          },
          {
            type: 'input',
            name: projectArgsAnswer,
            message: 'What args should be passed to this project? ',
            default: EMPTY_STRING,
          },
          {
            type: 'input',
            name: projectDelayAnswer,
            message: 'Should the project have a delayed start? (enter ms) ',
            default: 0,
          }
        ])
        .then((answers: { [key: string]: string }) => {
          const name = answers[projectNameAnswer];
          const args = splitArgs(answers[projectArgsAnswer]);
          const delay = parseInt(answers[projectDelayAnswer], 10);
    
          play.projects = play.projects || [];
          play.projects.push(Object.assign({}, project, { name, args, delay, enabled: true }));
          return pb.save(play);
        })
    });
}

function editProject(play: Play, project: Project) {
    
}

function removeProject(play: Play) {
  const answerName = 'confirmed';
  return _selectMultipleProjects(play, 'Which projects would you like to remove?')
    .then(function (projects) {
      return app.activeCommand
        .prompt([
          {
            type: 'confirm',
            name: answerName,
            message: `Are you sure you want to remove ${projects.length} projects from '${play.name}'? `
          }
        ])
    })
    .then((answers: { [key: string]: boolean }) => {
      let yes = answers[answerName];

      if (yes) {
        return pb.delete(play);
      }
    });
}

function deletePlay(play: Play): Promise<void>{
  const answerName = 'confirmed';

  return app.activeCommand
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

function _listPlays(plays: Play[]): void {
  if (plays.length === 0) {
    app.activeCommand.log(`No plays found! (Try 'new' to create one)`);
  } else {
    plays.sort((a, b) => a.name.localeCompare(b.name)).forEach(play => {
      app.activeCommand.log(`  ${playToString(play)}`);
    });
  }
}

function _inputPlayName(args: ParsedArgs): Promise<string> {
  const answerName = 'name';
  let playName = args['playName'];

  if (playName) {
    return Promise.resolve(playName);
  }

  return app.activeCommand
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

function _selectPlay(args: ParsedArgs): Promise<Play> {
  const answerName = 'playName';
  let playName = args['playName'];

  if (playName) {
    return pb.get(playName);
  }

  return pb
    .getAll()
    .then((plays: Play[]): Promise<Play> => {
      
      return app.activeCommand.prompt(<Question[]>[
        {
          type: 'list',
          name: answerName,
          message: 'Which play would you like? ',
          choices: plays.map(play => {
            return { name: playToString(play), value: play.name }
          }).sort((a, b) => a.name.localeCompare(b.name))
        }
      ]).then((answers: { [key: string]: string }) => {
        playName = answers[answerName];
        let play = plays.find(p => p.name === playName);
        if (play) {
          return play;
        } else {
          return Promise.reject(`Play "${playName}" not found!`);
        }
      });
    });
}

function _selectOneProject(play: Play, message: string): Promise<Project> {
  const answerName = 'project';
  const choices = [... new Set(play.projects.map(p => p.name))];

  return app.activeCommand
    .prompt(<Question[]>[
      {
        type: 'list',
        name: answerName,
        message,
        choices
      }
    ])
    .then((answers: { [key: string]: string }) => {
      const projName: string = answers[answerName];
      return play.projects.find(p => p.name === projName);
    });
}

function _selectMultipleProjects(play: Play, message: string): Promise<Project[]> {
  const answerName = 'projects';
  const choices = [... new Set(play.projects.map(p => p.name))];

  return app.activeCommand
    .prompt(<Question[]>[
      {
        type: 'checkbox',
        name: answerName,
        message,
        choices
      }
    ])
    .then((answers: { [key: string]: string[] }) => {
      const projNames: string[] = answers[answerName];
      return [...new Set(projNames)].map(projName => {
        return play.projects.find(p => p.name === projName);
      }).filter(p => !!p);
    });
}

function _chooseHandler() {
  const answerName = 'handler';
  const choices = pb.availableHandlers.map(h => h.name);

  return app.activeCommand
    .prompt(<Question[]>[
      {
        type: 'list',
        name: answerName,
        message: `Which project type would you like to search for?`,
        choices
      }
    ])
    .then((answers: { [key: string]: string }) => {
      const handlerName: string = answers[answerName];
      return pb.availableHandlers.find(p => p.name === handlerName);
    });
}

function _findProjects(handler: ProjectHandler) {
  app.activeCommand.log(`  Scanning for ${handler.name} projects...`);
  return pb
    .findProjects(handler);
}

function sortStrings(arr) {
  return arr.sort((a, b) => (EMPTY_STRING + a).localeCompare(b));
}

function splitArgs(str: string): string[] {
  let argsRegex = /[^\s"']+|"([^"]*)"|'([^']*)'/g
  let matches;
  let results: string[] = [];
  while ((matches = argsRegex.exec(str)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (matches.index === argsRegex.lastIndex) {
        argsRegex.lastIndex++;
      }

      if(matches[2]) results.push(matches[2]);
      else if(matches[1]) results.push(matches[1]);
      else results.push(matches[0]);
  }
  return results;
}

//#endregion