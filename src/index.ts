#!/usr/bin/env node
import 'colors';
import {version} from 'commander';
import {readFile} from 'fs';
import {join} from 'path';
import {promisify} from 'util';
import {PackageJson} from './activities/packageJson';
import {IInitCmdOptions, Preferences} from './activities/preferences';
import {Templates} from './activities/templates';
import {File} from './file';
import {Git} from './git';
import {IState} from './i-state';
import {UI} from './ui';

const rf = promisify(readFile);

class Main {
  exiting = false;
  state: IState;
  version: string;

  constructor() {
    process.on('exit', () => this.cleanup.call(this));
    process.on('SIGINT', () => this.cleanup.call(this));
    process.on('SIGUSR1', () => this.cleanup.call(this));
    process.on('SIGUSR2', () => this.cleanup.call(this));

    process.on('uncaughtException', (e) => {
      console.log(e);
      this.cleanup.call(this);
    });

    process.on('unhandledRejection', (r) => {
      console.log(r);
      this.cleanup.call(this);
    });
  }

  async run() {
    this.version = await rf(join(__dirname, 'version'), 'utf8');

    const args = version(this.version)
      .description('Command Line Interface for setting up and maintaining SakuraAPI projects')
      .option('-d, --dryRun', 'Does everything, but skips the actual merge to master')
      .option('-s, --silent', 'Do not prompt, accept confirmations and default values (or overrides if given as arguments)')
      .option('--skipDirectoryCheck', 'Skips the check to make sure the directory is empty')
      .option('--skipGitInit', 'Skips initializing/reinitializing git');

    args
      .command('init')
      .description('Initialize a new SakuraAPI project in the current directory')
      .action(this.init.bind(this))
      .option('--save', 'Saves your preferences as ~/.sapi')
      .option('--skipPackageJson', 'Skips initializing package.json')
      .option('--acceptDefaults', 'Accepts all default preferences');

    args
      .command('update-package')
      .description('Update or initialize just the package.json file')
      .action(this.packageUpdate.bind(this))
      .option('--save', 'Saves your preferences as ~/.sapi')
      .option('--acceptDefaults', 'Accepts all default preferences');

    args
      .on('--help', this.help);

    this.state = {
      args: args as any,
      file: new File(args as any),
      git: new Git(args as any),
      ui: new UI(args as any)
    };

    this.state.ui.message(`SakuraAPI Cli v${this.version}`);

    await args.parse(process.argv);

    if (!process.argv.slice(2).length || (this.state.args as any).args.length === 0) this.state.args.help();
  }

  async init(cmd: IInitCmdOptions) {

    const cwdFiles = await this.state.file.verifyEmpty();
    await this.state.git.init(cwdFiles);

    const preferences = await new Preferences(this.state).gather(cmd);
    await new PackageJson(this.state).update(preferences, cmd);
    await new Templates(this.state).createFiles(preferences, cmd);

    this.saveToDisk();
  }

  async packageUpdate(cmd: IInitCmdOptions) {

    const preferences = await new Preferences(this.state).gather(cmd);
    await new PackageJson(this.state).update(preferences, cmd);

    this.saveToDisk();
  }

  private cleanup() {
    if (this.exiting) return;
    this.exiting = true;
  }

  private help() {

  }

  private async saveToDisk() {
    if (this.state.args.dryRun) {
      this.state.ui.warn('Dry run... changes will not be saved');
      return;
    }

    const spinner = this.state.ui.spinner('Committing changes to disk');
    try {
      await this.state.file.commit();
      this.state.ui.success('Changes saved to disk...');
    } catch (err) {
      this.state.ui.error(err, 1);
    } finally {
      spinner.stop();
    }
  }

}

new Main().run();
