import { basename, dirname } from 'path';
import { ChildProcess } from 'child_process';
import { parseString } from 'xml2js';

import { ProjectHandler, Project } from '../models';

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
      let cwd = dirname(path);
      let csProj = await parseXml(content);

      // Check if it is .NET Core...
      if (csProj.Project.$.Sdk !== 'Microsoft.NET.Sdk' && csProj.Project.$.Sdk !== 'Microsoft.NET.Sdk.Web') return [];

      let title = csProj.Project.PropertyGroup[0].AssemblyName[0] as string || basename(cwd);

      // If it is a test project then we can watch those...
      if (title.toLowerCase().endsWith('tests')) return [new DotnetCoreProject(cwd, title, 'watch', ['test'])];

      // Make sure it is not a class library...
      if (csProj.Project.PropertyGroup[0].OutputType[0] !== 'Exe') return [];

      return [new DotnetCoreProject(cwd, title, 'run')];
    } catch (ex) {
      //console.error(ex);
      return [];
    }
  }
};

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