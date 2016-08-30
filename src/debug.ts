
import {Playbook} from './services/playbook';
import {ProcessManager} from './services/process-manager';

let pb = new Playbook();
let procManager: ProcessManager;

pb.get('main-app').then(play => {
  procManager = new ProcessManager(play.run());

  return procManager.render((text) => {
    process.stdout.write('\x1B[2J\x1B[0f');
    process.stdout.write(text);
  });
});