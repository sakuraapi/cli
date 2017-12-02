import {readFile, writeFile} from 'fs';
import {homedir, userInfo} from 'os';
import {join} from 'path';
import * as semVer from 'semver';
import {promisify} from 'util';
import * as validateNpmName from 'validate-npm-package-name';
import {IState} from '../i-state';
import {PackageJson} from './packageJson';

const rf = promisify(readFile);
const spdxIds = require('spdx-license-ids');
const wf = promisify(writeFile);

export interface IDotSapiDefaults {
  author: string;
  license: string;
  version: string;
}

export interface IPreferences {
  author: string;
  description: string;
  license: string;
  name: string;
  version: string;
}

export interface IInitCmdOptions {
  acceptDefaults: boolean;
  save: boolean;
  skipPackageJson: boolean;
}

export class Preferences {
  constructor(private state: IState) {
  }

  async gather(cmd: IInitCmdOptions): Promise<IPreferences> {
    const defaults = await this.getDefaults();
    const results = {} as IPreferences;

    await this.getPreferencesForPackageJson(defaults, results, cmd);

    this.saveDefaults(results, cmd);

    return results;
  }

  private async getPreferencesForPackageJson(defaults: IDotSapiDefaults, results: IPreferences, cmd: IInitCmdOptions) {
    if (!cmd.acceptDefaults) {
      this.state.ui.message('package.json preferences:');
      this.state.ui.lineOfCyan();
    }

    const packageJson = new PackageJson(this.state).get() as any;

    const author = packageJson.author || defaults.author || userInfo().username || 'nodejs sakuraapi typescript';
    const description = packageJson.description || 'SakuraApi Awesome Sauce';
    const name = packageJson.name || process.cwd().split('/').pop();
    const version = packageJson.version || defaults.version || '0.0.0';

    const currentLicense = (packageJson.license) ? ` (${packageJson.license})` : '';

    results.author = cmd.acceptDefaults
      ? author
      : await this.state.ui.input('Author:', {default: author});

    results.description = cmd.acceptDefaults
      ? description
      : await this.state.ui.input('Description:', {default: description});

    results.license = cmd.acceptDefaults
      ? packageJson.license || defaults.license || 'UNDEFINED'
      : await this.state.ui.autoList(`License${currentLicense}:`, this.getLicenses(packageJson, defaults));

    results.name = cmd.acceptDefaults
      ? name
      : await this.state.ui.input('Project Name (npm name):', {
        default: name,
        validate: this.npmNameValidator
      });

    results.version = cmd.acceptDefaults
      ? version
      : await this.state.ui.input('Version:', {default: version, validate: this.versionValidator});

    if (cmd.acceptDefaults) {
      this.state.ui.message('Accepting defaults for package.json preferences:');
      for (const key of Object.keys(results)) {
        this.state.ui.success(`${key}: ${results[key]}`);
      }
    }

  }

  private async getDefaults(): Promise<IDotSapiDefaults> {
    try {
      this.state.ui.success(`Loaded default preferences from ${homedir()}/.sapi`);
      return JSON.parse(await rf(join(homedir(), '.sapi'), 'utf8')) as IDotSapiDefaults;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return {} as IDotSapiDefaults;
      }
    }
  }

  private getLicenses(pacakgeJson, defaults): any[] {

    const spdx = [...spdxIds];
    const prepend = [];

    if (pacakgeJson.license) {
      prepend.push(pacakgeJson.license);
      const i = spdx.indexOf(pacakgeJson.license);
      if (i > -1) {
        spdx.splice(i, 1);
      }
    }

    if (defaults.license && prepend.indexOf(defaults.license) === -1) {
      prepend.push(defaults.license);
      const i = spdx.indexOf(defaults.license);
      if (i > -1) {
        spdx.splice(i, 1);
      }
    }

    if (prepend.indexOf('UNLICENSED') === -1) {
      prepend.push('UNLICENSED');
    }

    return [...prepend, ...spdx];
  }

  private npmNameValidator(input: string, answers: any) {
    const validation = validateNpmName(input);

    return validation.validForNewPackages || `Invalid NPM Package Name: ${validation.warnings.join(', '.yellow.bold)}`;
  }

  private async saveDefaults(results: IPreferences, cmd: IInitCmdOptions) {

    if (!cmd.save) {
      return;
    }

    const path = join(homedir(), '.sapi');
    this.state.ui.message(`Saving defaults to ${path}`);

    const defaults = {
      author: results.author,
      license: results.license,
      version: results.version
    } as IDotSapiDefaults;

    try {
      await wf(path, JSON.stringify(defaults, null, 2), 'utf8');
      this.state.ui.success(`Defaults saved to ${path}`);
    } catch (err) {
      this.state.ui.error(`Unable to safe defaults: ${err}`);
    }

  }

  private versionValidator(input: string, answers: any) {
    return semVer.valid(input) ? true : 'Invalid version number. Make sure your version complies with Semantic Versioning.';
  }
}
