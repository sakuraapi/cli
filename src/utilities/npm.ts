import * as debugInit    from 'debug';
import {exec}            from 'shelljs';
import {PackageJson}     from '../activities/packageJson';
import {IInitCmdOptions} from '../activities/preferences';
import {IArgs}           from '../i-args';
import {ui}              from './ui';

const debug = debugInit('sapi:Npm');

export class Outdated {
  current: string;
  isDevDependency: boolean;
  isLatest: boolean;
  isWanted: boolean;
  latest: string;
  location: string;
  name: string;
  wanted: string;

  constructor(name: string, json: any, packageJson: IDeps) {
    this.name = name;

    this.current = json.current;
    this.latest = json.latest;
    this.location = json.location;
    this.wanted = json.wanted;

    this.isDevDependency = !!packageJson.devDependencies[name];
    this.isWanted = this.current === this.wanted;
    this.isLatest = this.current === this.latest;

    debug('Outdated for `%s` constructed', name);
  }
}

export interface IDeps {
  devDependencies: { [key: string]: any };
  dependencies: { [key: string]: any };
}

export class Npm {
  constructor(private args: IArgs) {
    debug('Npm constructed');
  }

  init(cmd: IInitCmdOptions): Promise<void> {
    debug('.init called');

    if (cmd.skipNpmInit) {
      return Promise.resolve();
    }

    ui.message('Starting `npm install`');
    const code = exec(`npm i`).code;

    if (code > 0) {
      ui.error(`npm exit code: ${code}`);
    } else {
      ui.success('Npm init done');
    }
  }

  dockerCheck(): boolean {
    debug('dockerCheck called');

    return !(exec('which docker', {silent: true})as any).code;
  }

  async outdated(): Promise<Outdated[]> {
    debug('.outdated called');

    ui.message('Loading `npm outdated`');

    let packageJson: IDeps;
    try {
      packageJson = new PackageJson(this.args).get();
      if (Object.keys(packageJson).length === 0) {
        throw 'package.json is empty or not found';
      }
    } catch (err) {
      ui.error(`Unable to load package.json, make sure you're in an npm project and that package.json is valid: ${err}`);
    }

    const out: any = exec(`npm outdated --json`, {silent: true}).stdout;

    let json;
    try {
      json = JSON.parse(out);
    } catch (err) {
      ui.error(`Unable to process npm outdated output: ${err}`);
    }

    const result = [];
    for (const key of Object.keys(json)) {
      try {
        result.push(new Outdated(key, json[key], packageJson));
      } catch (err) {
        ui.error(`unable to process npm outdated entry ${key}: ${err}`);
      }
    }

    return result;
  }

  async install(name: string, version: string, asDev: boolean): Promise<void> {
    debug('.install called');

    const save = (asDev) ? 'save-dev' : 'save';

    const cmd = `npm i ${name}@${version} --${save}`;
    ui.message(cmd);
    const code = exec(cmd).code;
    if (code) {
      ui.error(`Error: npm install returned a non-zero status: ${code}`);
    }
    ui.success(`${name} updated to ${version}`);
  }

  async test() {
    debug('.test called');

    const cmd = `npm test`;
    ui.message(cmd);
    const code = exec(cmd).code;
    if (code) {
      ui.error(`Error: npm test returned a non-zero status: ${code}`);
    }
    ui.success(`testing ok`);
  }
}

export let npm: Npm;

export function initNpm(args: IArgs) {
  debug('initNpm called');

  npm = new Npm(args);
}
