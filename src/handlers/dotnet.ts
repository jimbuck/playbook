import { basename, dirname, relative, sep as PATH_SEP } from 'path';
import { ChildProcess } from 'child_process';
import * as fs from 'fs-jetpack';
import { parseString } from 'xml2js';

import { ProjectHandler, Project } from '../models';

const EMPTY_STRING = '';

function parseXml(xml): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export const dotnetHandler: ProjectHandler = {
  name: 'dotnet',
  desc: 'Apps powered by .NET Core CLI (csproj).',
  files: ['*.csproj'],
  extract: async (path: string, content: string) => {
    try {
      let csProj = await parseXml(content);

      // Check if it is .NET Core...
      if (csProj.Project.$.Sdk !== 'Microsoft.NET.Sdk' && csProj.Project.$.Sdk !== 'Microsoft.NET.Sdk.Web') return [];

      let cwd = dirname(path);

      let title = csProj.Project.PropertyGroup[0].AssemblyName[0] as string || basename(cwd);

      // If it is a test project then we can watch those...
      if (title.toLowerCase().endsWith('tests')) return [new DotnetCoreProject(cwd, title, 'watch', ['test'])];

      // Make sure it is not a class library...
      if (csProj.Project.PropertyGroup[0].OutputType[0] !== 'Exe') return [];

      let binExes = await findBinConfigExes(cwd, title);

      return [new DotnetCoreProject(cwd, title, 'run'), ...binExes];
    } catch (ex) {
      //console.error(ex);
      return [];
    }
  }
};

async function findBinConfigExes(cwd: string, title: string) {
  try {
    let projects: any[] = [];
    let bin = fs.cwd(cwd, 'bin');
    let exes = await bin.findAsync({ matching: `*.exe` });

    exes.forEach(exe => {
      let exeName = PATH_SEP + basename(exe);
      let config = exe.replace(exeName, EMPTY_STRING);

      projects.push(new DotnetCoreExeProject(cwd, title, config, `.${PATH_SEP}bin${PATH_SEP}` + exe))
    });

    return projects;
  } catch (err) {
    //console.error(ex);
    return [];
  }
}

class DotnetCoreProject implements Project
{
  public name: string;
  public cwd: string;
  public command: string = 'dotnet';
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;
  
  constructor(cwd: string, projectName: string, command: string, args: string[] = []) {
    this.name = `${projectName} (dotnet ${command})`;
    this.cwd = cwd;
    this.args = [command, ...args];
  }
}

class DotnetCoreExeProject implements Project
{
  public name: string;
  public cwd: string;
  public command: string;
  public file: boolean = true;
  public args?: string[];
  public enabled?: boolean;
  public delay?: number;
  public currentProcess?: ChildProcess;
  
  constructor(cwd: string, projectName: string, configuration: string, command: string, args: string[] = []) {
    this.name = `${projectName}.exe (${configuration})`;
    this.command = command;
    this.cwd = cwd;
    this.args = [...args];
  }
}