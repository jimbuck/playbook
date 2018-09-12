
import { nodeHandler } from './node';
import { legacyDotnetHandler } from './legacy-dotnet';
import { dotnetHandler } from './dotnet';

export const availableHandlers = [nodeHandler, legacyDotnetHandler, dotnetHandler];