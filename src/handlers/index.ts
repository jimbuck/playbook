
import { nodeHandler } from './node';
import { legacyDotnetHandler } from './legacy-dotnet';
import { dotnetHandler } from './dotnet';
import { exeHandler } from './exe';

export const availableHandlers = [nodeHandler, legacyDotnetHandler, dotnetHandler, exeHandler];