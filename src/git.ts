import {exec} from 'shelljs';
import {IArgs} from './i-args';
import {UI} from './ui';

export class Git {

  ui: UI;

  constructor(private args: IArgs) {
    this.ui = new UI(this.args);
  }

  async init(files: string[]): Promise<void> {
    if (this.args.skipGitInit) {
      return;
    }

    if (this.args.dryRun) {
      this.ui.warn('Dry run, skipping git init');
      return;
    }

    if (files.indexOf('.git') === -1
      || await this.ui.question(`There's already a '.git' directory. Proceed with 'git init'?`)) {

      const spinner = this.ui.spinner('Initializing git');

      const code = exec(`git init`).code;

      spinner.stop();

      if (code > 0) {
        this.ui.exitQuestion('Problem encountered initializing git repository, continue?');
      }
    }
  }
}
