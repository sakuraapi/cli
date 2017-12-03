import {exec} from 'shelljs';
import {IInitCmdOptions} from './activities/preferences';
import {IState} from './i-state';

export class Npm {
  constructor(private state: IState) {
  }

  init(cmd: IInitCmdOptions): Promise<void> {
    if (cmd.skipNpmInit) {
      return Promise.resolve();
    }

    // return new Promise<void>((resolve) => {
    this.state.ui.message('Starting `npm install`');
    const code = exec(`npm i`).code;

    if (code > 0) {
      this.state.ui.error(`npm exit code: ${code}`);
    } else {
      this.state.ui.success('Npm init done');
    }
  }

  dockerCheck(): boolean {
    return !(exec('which docker', {silent: true})as any).code;
  }
}
