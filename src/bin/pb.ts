#!/usr/bin/env node

import {Question, Separator} from 'inquirer';
import {ParsedArgs} from 'minimist';

interface Answers {
  [key: string]: any;
}

import {Playbook, Project, Play} from '../';

const app = require('vorpal')();
const pb = new Playbook();

app
  .command('list', 'Shows available plays')
  .action(function (args: ParsedArgs) {
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
  });

app
  .command('new [name]', 'Creates a new play.')
  .action(function (args: ParsedArgs) {

    return inputPlayName
      .call(this, args)
      .then(pb.create.bind(pb))
      .then(modifyProjects.bind(this));
  });

function inputPlayName(args: ParsedArgs): Promise<string> {
  const answerName = 'name';

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

function choosePlay(args: ParsedArgs): Promise<string> {
  const answerName = 'playName';

  return pb
    .getAll()
    .then((plays: Play[]) => {
      return this.prompt(<Question[]>[
        {
          type: 'list',
          name: answerName,
          message: 'Which play would you like?',
          choices: plays.map(play => { return { name: play.toString(), value: play.name }; })
        }
      ]);
    })
    .then((answers: Answers) => {
      return <string>answers[answerName];
    });
}

function modifyProjects(play: Play): Promise<void> {
  const answerName = 'projects';
  this.log(play);
  return pb
    .findProjects(process.cwd())
    .then((projects: Project[]) => {
      console.log(projects);
      const prevProjectList = new Set(play.projects.map(p => p.name));
      return this
        .prompt(<Question[]>[
          {
            type: 'checkbox',
            name: answerName,
            message: 'Which projects should be included?',
            choices: projects.map(proj => {
              return { name: proj.toString(), value: proj.name, checked: prevProjectList.has(proj.name) };
            })
          }
        ])
        // .then((answers: Answers) => {
        //   return <string[]>answers[answerName];
        // })
        // .then((projNames: string[]) => {
        //   const newProjectList = new Set(projNames);
        //   play.projects = projects.filter(p => p && newProjectList.has(p.name));

        //   return pb.save(play);
        // });
    });
}

app
  .delimiter('playbook~$')
  .show()
  .parse(process.argv);