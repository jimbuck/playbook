
import { readAsync } from 'fs-jetpack';

import { dotnetHandler } from './handlers/dotnet';

(async () => {
  const path = 'C:\\Projects\\Synapsys\\InfoStratus\\dev\\Services\\DeviceInterface\\Services.DeviceInterfaceServer\\Services.DeviceInterfaceServer.csproj';
  const content = await readAsync(path);
  const result = await dotnetHandler.extract(path, content);
  console.log(result);
})();