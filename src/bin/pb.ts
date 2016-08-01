#!/usr/bin/env node

import {Question, Separator} from 'inquirer';
import {ParsedArgs} from 'minimist';

import {Playbook, Project, Play} from '../';

interface Answers {
  [key: string]: any;
}

const pb = new Playbook();

pb
  .findProjects('C:\\Projects\\Personal\\playbook\\test')
  .then(projects => {
    console.log('startup', projects);

    const Vorpal = require('vorpal'); // Toggle this line to change functionality.
    
    pb
      .findProjects('C:\\Projects\\Personal\\playbook\\test')
      .then(projects => {
        console.log('later', projects);
      });
  });

  /*

var p1 = Promise.resolve([
  Promise.resolve(new Date()),
  new Promise((resolve, reject) => { 
    setTimeout(resolve, 200, 'Jim');
  })]);
var p2 = 1223;
var p3 = new Promise((resolve, reject) => {
  setTimeout(resolve, 100, "foo");
}); 

Promise.all([p1, p2, p3]).then(values => { 
  console.log(values); // [3, 1337, "foo"] 
});

/*

app.command('test', 'Does stuff')
  .action(function () {
    return pb
      .findProjects('C:\\Projects\\Personal\\playbook\\test')
      .then(projects => {
        console.log(projects);
      });
  });

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


// */