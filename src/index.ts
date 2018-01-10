#!/usr/bin/env node

import 'colors';
import {version}      from 'commander';
import * as debugInit from 'debug';
import {readFile}     from 'fs';
import {join}         from 'path';
import {promisify}    from 'util';
import {
  IOutdatedCmdOptions,
  UpdateOutdated
}                     from './activities/outdated';
import {PackageJson}  from './activities/packageJson';
import {
  IInitCmdOptions,
  Preferences
}                     from './activities/preferences';
import {Templates}    from './activities/templates';
import {IArgs}        from './i-args';
import {
  file,
  initFile
}                     from './utilities/file';
import {
  git,
  initGit
}                     from './utilities/git';
import {
  initNpm,
  npm
}                     from './utilities/npm';
import {
  initUI,
  ui
}                     from './utilities/ui';

const debug = debugInit('sapi:Main');
const rf = promisify(readFile);

class Main {
  args: IArgs;
  exiting = false;
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
    debug('.run called');

    this.version = await rf(join(__dirname, 'version'), 'utf8');

    const args = version(this.version)
      .description('Command Line Interface for setting up and maintaining SakuraAPI projects')
      .option('-d, --dryRun', 'Does everything, but skips the actual merge to master')
      .option('-s, --silent', 'Do not prompt, accept confirmations and default values (or overrides if given as arguments)')
      .option('--skipDirectoryCheck', 'Skips the check to make sure the directory is empty');

    args
      .command('init [path]')
      .description('Initialize a new SakuraAPI project in the current directory')
      .action(this.init.bind(this))
      .option('--save', 'Saves your preferences as ~/.sapi')
      .option('--skipNpmInit', 'Skips `npm init`')
      .option('--skipPackageJson', 'Skips initializing package.json')
      .option('--acceptDefaults', 'Accepts all default preferences');

    args
      .command('update-package')
      .description('Update or initialize just the package.json file')
      .action(this.packageUpdate.bind(this))
      .option('--save', 'Saves your preferences as ~/.sapi')
      .option('--skipNpmInit', 'Skips `npm init`')
      .option('--acceptDefaults', 'Accepts all default preferences');

    args
      .command('outdated')
      .description('Iterates through `npm outdated` dependencies and lets you update / test them one by one')
      .action(this.outdatedUpdate.bind(this))
      .option('--skipLatest', 'Do not prompt for packages that match wanted version')
      .option('--skipTests', 'Do not run tests for each update');

    args
      .on('--help', this.help);

    initUI(args as any);
    initFile(args as any);
    initGit(args as any);
    initNpm(args as any);
    this.args = args as any;

    ui.message(`SakuraAPI Cli v${this.version}`);
    await args.parse(process.argv);

    if (!process.argv.slice(2).length || (args as any).args.length === 0) args.help();
  }

  async init(path: string, cmd: IInitCmdOptions) {
    debug('.init called');

    const packageJson = new PackageJson(this.args);
    const preferences = new Preferences(this.args);
    const templates = new Templates(this.args);

    file.newCwd(path);

    const cwdFiles = await file.verifyEmpty();
    await git.init(cwdFiles);

    const config = await preferences.gather(cmd);

    await packageJson.update(config, cmd);
    await templates.createFiles(config, cmd);

    await this.saveToDisk();
    await npm.init(cmd);

    if (!npm.dockerCheck()) {
      ui.boxedMessage('Unable to find docker in your path. This project depends on docker.');
    }

    ui.success(`SakuraAPI project setup. You should be able to 'npm start' then browse to http://localhost:8001/api`);
  }

  async outdatedUpdate(cmd: IOutdatedCmdOptions) {
    debug('.outdatedUpdate called');

    const outdated = new UpdateOutdated(this.args);
    await outdated.update(cmd);
  }

  async packageUpdate(cmd: IInitCmdOptions) {
    debug('.packageUpdate called');

    const preferences = new Preferences(this.args);

    const config = await preferences.gather(cmd);
    await new PackageJson(this.args).update(config, cmd);

    await this.saveToDisk();
    await npm.init(cmd);
  }

  private cleanup() {
    debug('.cleanup called');

    if (this.exiting) return;
    this.exiting = true;
  }

  private help() {
    debug('.help called');
  }

  private async saveToDisk() {
    debug('.saveToDisk called');

    if (this.args.dryRun) {
      ui.warn('Dry run... changes will not be saved');
      return;
    }

    const spinner = ui.spinner('Committing changes to disk');
    try {
      await file.commit();
      ui.success('Changes saved to disk...');
    } catch (err) {
      ui.error(err, 1);
    } finally {
      spinner.stop();
    }
  }

}

new Main().run();
