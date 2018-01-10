import {randomBytes as randomBytesCb} from 'crypto';
import * as debugInit                 from 'debug';
import {
  readFile,
  writeFile
}                                     from 'fs';
import {
  homedir,
  hostname,
  userInfo
}                                     from 'os';
import {join}                         from 'path';
import * as semVer                    from 'semver';
import {promisify}                    from 'util';
import * as validateNpmName           from 'validate-npm-package-name';
import {IArgs}                        from '../i-args';
import {ui}                           from '../utilities/ui';
import {PackageJson}                  from './packageJson';

const debug = debugInit('sapi:Preferences');
const randomBytes = promisify(randomBytesCb);
const rf = promisify(readFile);
const spdxIds = require('spdx-license-ids');
const wf = promisify(writeFile);

export interface IDotSapiDefaults {
  author: string;
  license: string;
  version: string;
}

export interface IPreferences {
  /**
   * package.json: name
   */
  author: string;
  authAudiences: string;
  /**
   * src/config/environment.ts
   */
  authAudienceName: string;
  /**
   * src/config/environment.ts
   */
  authJwtIssuerKey: string;
  /**
   * src/config/environment.ts
   */
  authIssuerName: string;
  /**
   * src/config/environment.ts
   */
  authRole: string;
  /**
   * package.json: description
   */
  description: string;
  /**
   * package.json: license
   * LICENSE
   */
  license: string;
  /**
   * package.json: name
   */
  name: string;
  /**
   * package.json: version
   */
  version: string;
}

export interface IInitCmdOptions {
  acceptDefaults: boolean;
  save: boolean;
  skipPackageJson: boolean;
  skipNpmInit: boolean;
}

export class Preferences {
  constructor(private args: IArgs) {
    debug('Preferences constructed');
  }

  async gather(cmd: IInitCmdOptions): Promise<IPreferences> {
    debug('.gather called');

    const defaults = await this.getDefaults();
    const results = {} as IPreferences;

    await this.getPreferencesForPackageJson(defaults, results, cmd);
    await this.getPreferencesForEnvironment(defaults, results, cmd);

    if (cmd.acceptDefaults) {
      ui.message('Accepting defaults preferences:');
      for (const key of Object.keys(results)) {
        ui.success(`${key}: ${results[key]}`);
      }
    }

    this.saveDefaults(results, cmd);

    return results;
  }

  private async generatePassword(): Promise<string> {
    debug('.generatePassword called');

    return (await randomBytes(128))
      .toString('ascii')
      .match(/[!-_a-~]/gi)
      .join('')
      .replace(`\\`, '')
      .replace(`'`, '')
      .substring(0, 32);
  }

  private async getPreferencesForEnvironment(defaults: IDotSapiDefaults, results: IPreferences, cmd: IInitCmdOptions): Promise<void> {
    debug('.getPreferencesForEnvironment called');

    if (!cmd.acceptDefaults) {
      ui.message('src/config/environment.ts preferences:');
    }

    results.authAudiences = '';
    const currentAuthRole = await this.getCurrentAuthSetup();
    results.authRole = await ui.listExpand(`What JWT role does this server fulfill?: (${currentAuthRole})`, [
      {key: 'a', value: 'audience'},
      {key: 'i', value: 'issuer'},
      {key: 'n', value: 'none'}
    ]);

    if (results.authRole !== 'none') {
      let authAudiences: Array<{ name: string; key: string }>;

      results.authIssuerName = cmd.acceptDefaults
        ? `issuer.${hostname()}`
        : await ui.input('Server JWT Issuer Name', {default: `issuer.${hostname()}`});

      if (results.authRole === 'audience') {
        results.authAudienceName = cmd.acceptDefaults
          ? `audience.${hostname()}`
          : await ui.input('Server JWT Audience Name', {default: `audience.${hostname()}`});
      }

      results.authJwtIssuerKey = cmd.acceptDefaults
        ? await this.generatePassword()
        : await ui.input('Server JWT Signing Key:', {default: await this.getCurrentIssuerKey()});

      if (results.authRole === 'issuer' && !cmd.acceptDefaults) {

        ui.message('An issuer needs to know the audiences that will be served <type done to continue>:');

        authAudiences = await this.getCurrentAudienceSetup();

        let i = 1;
        while (true) {
          for (let i = 0; i < authAudiences.length; i++) {
            const audience = authAudiences[i];
            ui.success(`[${i}] Added audience server: { name: ${audience.name}, key: ${audience.key} }`);
          }

          const name = await ui.input('Audience Server Name:', {default: `audience${i++}.${hostname()}`});

          if (name === 'done' && await ui.question(`Are you sure you're done defining audiences?`, {default: true})) {
            break;
          }

          const key = await ui.input('Audience Server Key:', {default: await this.generatePassword()});

          authAudiences.push({
            name,
            key
          });
        }
      }

      let i = 0;
      for (const audience of authAudiences || []) {
        results.authAudiences += `        '${audience.name}': \`${audience.key}\`` + ((++i < authAudiences.length) ? ',\n' : '');
      }
    }
  }

  private async getPreferencesForPackageJson(defaults: IDotSapiDefaults, results: IPreferences, cmd: IInitCmdOptions): Promise<void> {
    debug('.getPreferencesForPackageJson called');

    if (!cmd.acceptDefaults) {
      ui.message('package.json preferences:');
    }

    const packageJson = new PackageJson(this.args).get() as any;

    const author = packageJson.author || defaults.author || userInfo().username || 'nodejs sakuraapi typescript';
    const description = packageJson.description || 'SakuraApi Awesome Sauce';
    const name = packageJson.name || process.cwd().split('/').pop();
    const version = packageJson.version || defaults.version || '0.0.0';

    const currentLicense = (packageJson.license) ? ` (${packageJson.license})` : '';

    results.author = cmd.acceptDefaults
      ? author
      : await ui.input('Author:', {default: author});

    results.description = cmd.acceptDefaults
      ? description
      : await ui.input('Description:', {default: description});

    results.license = cmd.acceptDefaults
      ? packageJson.license || defaults.license || 'UNDEFINED'
      : await ui.autoList(`License${currentLicense}:`, this.getLicenses(packageJson, defaults));

    results.name = cmd.acceptDefaults
      ? name
      : await ui.input('Project Name (npm name):', {
        default: name,
        validate: this.npmNameValidator
      });

    results.version = cmd.acceptDefaults
      ? version
      : await ui.input('Version:', {default: version, validate: this.versionValidator});

  }

  private async getCurrentAuthSetup(): Promise<string> {
    debug('.getCurrentAuthSetup called');

    try {
      const sakuraApiTs = await rf('src/sakura-api.ts', 'utf8');
      if (sakuraApiTs.includes('addAuthenticationAuthority')) {
        return 'issuer';
      }

      if (sakuraApiTs.includes('addAuthAudience')) {
        return 'audience';
      }

      return 'none';
    } catch (err) {
      return 'none';
    }
  }

  private async getCurrentAudienceSetup(): Promise<Array<{ name: string, key: string }>> {
    debug('.getCurrentAudienceSetup called');

    try {
      const env = require(join(process.cwd(), 'dist/config/environment.js'));

      const result = [];
      const obj = (((env || {} as any).authentication || {} as any).jwt || {} as any).audiences || {};
      for (const key of Object.keys(obj)) {
        result.push({
          name: key,
          key: obj[key]
        });
      }
      return result;
    } catch (err) {
      return [];
    }
  }

  private async getCurrentIssuerKey(): Promise<string> {
    debug('.getCurrentIssuerKey called');

    try {
      const env = require(join(process.cwd(), 'dist/config/environment.js'));
      return (((env || {} as any).authentication || {} as any).jwt || {} as any).key || this.generatePassword();
    } catch (err) {
      return this.generatePassword();
    }
  }

  private async getDefaults(): Promise<IDotSapiDefaults> {
    debug('.getDefaults called');

    try {
      ui.success(`Loaded default preferences from ${homedir()}/.sapi`);
      return JSON.parse(await rf(join(homedir(), '.sapi'), 'utf8')) as IDotSapiDefaults;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return {} as IDotSapiDefaults;
      }
    }
  }

  private getLicenses(pacakgeJson, defaults): any[] {
    debug('.getLicenses called');

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
    debug('.npmNameValidator called');

    const validation = validateNpmName(input);

    return validation.validForNewPackages || `Invalid NPM Package Name: ${validation.warnings.join(', '.yellow.bold)}`;
  }

  private async saveDefaults(results: IPreferences, cmd: IInitCmdOptions) {
    debug('.saveDefaults called');

    if (!cmd.save) {
      return;
    }

    const path = join(homedir(), '.sapi');
    ui.message(`Saving defaults to ${path}`);

    const defaults = {
      author: results.author,
      license: results.license,
      version: results.version
    } as IDotSapiDefaults;

    try {
      await wf(path, JSON.stringify(defaults, null, 2), 'utf8');
      ui.success(`Defaults saved to ${path}`);
    } catch (err) {
      ui.error(`Unable to safe defaults: ${err}`);
    }

  }

  private versionValidator(input: string, answers: any) {
    debug('.versionValidator called');

    return semVer.valid(input) ? true : 'Invalid version number. Make sure your version complies with Semantic Versioning.';
  }
}
