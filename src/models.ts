import { ChildProcess } from 'child_process';
import { WriteStream } from 'fs';

const EMPTY_STRING = '';

export interface Project
{
  name: string

  cwd: string;

  command: string;

  file?: boolean;

  args?: string[];

  enabled?: boolean;

  delay?: number;

  currentProcess?: ChildProcess;

  logFile?: string;

  logStream?: WriteStream;
}

export interface Play
{
  name: string;
  projects?: Project[];
}

export interface ProjectHandler
{
  name: string;

  desc: string;

  files: string[];

  /**
   * Checks whether a found project matches this handler.
   */
  extract(path: string, content: string): Array<Project> | Promise<Array<Project>>;
}

export function playToString(play: Play): string {
  if (!play) return EMPTY_STRING;
  return `${play.name} (${(play.projects || []).length})`;
}