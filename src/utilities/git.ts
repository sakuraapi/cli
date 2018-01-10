import * as debugInit from 'debug';
import {exec}         from 'shelljs';
import {IArgs}        from '../i-args';
import {UI}           from './ui';

const debug = debugInit('sapi:Git');

export class Git {

  ui: UI;

  constructor(private args: IArgs) {
    this.ui = new UI(this.args);
    debug('Git constructed');
  }

  async init(files: string[]): Promise<void> {
    debug('.init called');

    if (files.indexOf('.git') === -1) {
      if (this.args.dryRun) {
        this.ui.warn('Dry run, skipping git init');
        return;
      }

      const spinner = this.ui.spinner('Initializing git');
      const code = exec(`git init`).code;
      spinner.stop();

      if (code > 0) {
        this.ui.exitQuestion('Problem encountered initializing git repository, continue?');
      }
    }
  }
}

export let git: Git;

export function initGit(args: IArgs) {
  debug('.initGit called');

  git = new Git(args);
}
