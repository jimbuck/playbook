
import {Playbook} from './services/playbook';
import {ProcessManager} from './services/process-manager';

(async () => {
  const pb = new Playbook();
  let procManager: ProcessManager;

  const play = await pb.get('main-app');

  procManager = new ProcessManager(play, 3);

  return procManager.execute((text) => {
    process.stdout.write('\x1B[2J\x1B[0f');
    process.stdout.write(text);
  });
})();