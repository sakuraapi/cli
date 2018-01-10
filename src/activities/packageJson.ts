import * as Table     from 'cli-table';
import * as debugInit from 'debug';
import {readFile}     from 'fs';
import {join}         from 'path';
import {promisify}    from 'util';
import {
  IInitCmdOptions,
  IPreferences
}                     from '../activities/preferences';
import {IArgs}        from '../i-args';
import {file}         from '../utilities/file';
import {ui}           from '../utilities/ui';

const debug = debugInit('sapi:PackageJson');
const rf = promisify(readFile);

export class PackageJson {

  private resolution: string = null;
  private json: any;

  constructor(private args: IArgs) {
    debug('PackageJson constructed');
  }

  get(): any {
    debug('.get called');
    return file.getJson('package.json') || {};
  }

  async update(prefs: IPreferences, cmd: IInitCmdOptions): Promise<void> {
    debug('.update called');

    if (cmd.skipPackageJson) {
      debug('skipping PackageJson.update because --skipPackageJson flag found');
      return;
    }

    while (true) {
      debug('while loop');

      this.json = this.get();
      this.sortJsonParts(this.json);

      ui.message('Updating package.json file user preferences');

      // user input
      await this.safeUpdate('name', prefs.name);
      await this.safeUpdate('version', prefs.version);
      await this.safeUpdate('description', prefs.description);
      await this.safeUpdate('author', prefs.author);
      await this.safeUpdate('license', prefs.license);

      // templated update
      const baseTemplatePath = [__dirname, '..', 'template-package.json'];
      const devDependencies = JSON.parse(await rf(join(...baseTemplatePath, 'dev-dependencies.json'), 'utf8'));
      const depdendencies = JSON.parse(await rf(join(...baseTemplatePath, 'dependencies.json'), 'utf8'));
      const scripts = JSON.parse(await rf(join(...baseTemplatePath, 'scripts.json'), 'utf8'));

      ui.message('Updating package.json devDependencies');
      await this.updateDependencies('devDependencies', devDependencies);
      await this.updateDependencies('dependencies', depdendencies);
      await this.updateDependencies('scripts', scripts);

      ui.message('Done updating package.json');

      let disk;
      try {
        disk = JSON.parse(await rf('package.json', 'utf8'));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }

      this.sortJsonParts(disk);
      this.sortJsonParts(this.json);

      if (prefs.authRole === 'none') {
        delete this.json.dependencies['@sakuraapi/auth-audience'];
        delete this.json.dependencies['@sakuraapi/auth-native-authority'];
      } else if (prefs.authRole === 'audience') {
        delete this.json.dependencies['@sakuraapi/auth-native-authority'];
      }

      if (!disk) {
        ui.message('The following package.json file will be created:');
        ui.lineOMagic();
        console.log(JSON.stringify(this.json, null, 2));
        ui.lineOMagic();
      } else {
        ui.message('The following changes were made (the order of fields will not be preserved when persisting to disk):');
        ui.lineOMagic();
        file.compareJsonPrint(this.json, disk);
        ui.lineOMagic();
      }

      if (await ui.question('Accept these changes?', {default: true})) {
        ui.message('Changes accepted (they will not be written to disk until all changes are completed)');
        break;
      } else {
        this.resolution = null;
        this.json = null;
        ui.message(`Restarting update to 'package.json'`);
      }
    }

    this.pruneJson(prefs);

    // write it to memFS
    file.writeJson('package.json', this.json);
  }

  private pruneJson(prefs: IPreferences) {
    debug('.pruneJson called');

    if (prefs.authRole !== 'issuer') {
      delete this.json.dependencies['email-templates'];
      delete this.json.dependencies['nodemailer'];
      delete this.json.devDependencies['@types/email-templates'];
      delete this.json.devDependencies['"@types/nodemailer'];
    }
  }

  private sort(target: any, field: string): any {
    debug('.sort called');

    if (!target[field]) {
      return target[field];
    }

    const ordered = {};
    const keys = Object.keys(target[field]).sort();
    for (const key of keys) {
      ordered[key] = target[field][key];
    }
    return ordered;
  }

  private sortJsonParts(target: any) {
    debug('.sortJsonParts called');

    if (!target) return;
    // sort the relevant sections
    target.dependencies = this.sort(target, 'dependencies');
    target.devDependencies = this.sort(target, 'devDependencies');
    target.scripts = this.sort(target, 'scripts');

    const copy = JSON.parse(JSON.stringify(target));
    Object.keys(target).forEach((key) => delete target[key]);

    // opinionated order
    target.name = copy.name;
    target.version = copy.version;
    target.description = copy.description;
    target.author = copy.author;
    target.license = copy.license;
    target.main = copy.main;
    target.scripts = copy.scripts;

    // alphabetical order
    for (const key of Object.keys(copy)) {
      if (!target[key] && key !== 'dependencies' && key !== 'devDependencies') {
        target[key] = copy[key];
      }
    }

    // put at the end
    target.dependencies = copy.dependencies;
    target.devDependencies = copy.devDependencies;
  }

  private getConflictChoices(): any[] {
    debug('.getConflictChoices called');

    return [
      {
        key: 'k',
        name: 'keep existing package.json',
        value: 'keep'
      },
      {
        key: 'r',
        name: 'Replace all (accept all changes)',
        value: 'replace'
      },
      {
        key: 'p',
        name: 'Pick per conflict',
        value: 'pick'
      }
    ];
  }

  private getConflictResolutionChoices(): any[] {
    debug('.getConflictResolutionChoices called');

    return [
      {
        key: 'k',
        name: 'keep original value',
        value: 'keep'
      },
      {
        key: 'r',
        name: 'Replace with new value',
        value: 'replace'
      },
      {
        key: 'a',
        name: 'Replace all (stop pestering me)',
        value: 'replaceAll'
      },
      {
        key: 'd',
        name: 'Diff the file with the proposed change included',
        value: 'diff'
      }
    ];
  }

  private deepGet(json: any, field: string) {
    debug('.deepGet called');

    const parts = field.split('.');
    let val = json;
    for (let part of parts) {
      if (val[part]) {
        val = val[part];
      } else {
        return null;
      }
    }
    return val;
  }

  private deepSet(json: any, field: string, value) {
    debug('.deepSet called');

    const parts = field.split('.');
    let val = json;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        val[part] = value;
        break;
      }

      try {
        val = (val[part])
          ? val[part]
          : val[part] = {};
      } catch (err) {
        ui.warn(err);
        ui.error(`package.json is in an unexpected state - trying to deepSet for field ${field}`, 1);
      }
    }
  }

  private async safeUpdate(field: string, newValue: string | boolean | number) {
    debug('.safeUpdate called');

    const val = this.deepGet(this.json, field);

    // get resolution preference
    if (val && val !== newValue && !this.resolution) {
      while (true) {
        this.resolution = await ui.listExpand('Package.json conflict (h for help):', this.getConflictChoices());
        if (this.resolution === 'replace') {
          if (await ui.question('Are you sure you want to accept all changes to package.json?'.red.bold.underline, {default: false})) {
            break;
          }
        } else if (this.resolution === 'diff') {

        }
        else {
          break;
        }
      }
    }

    if (val) {
      // if the value already existed, process the conflict resolution
      switch (this.resolution) {
        case 'replace':
          this.deepSet(this.json, field, newValue);
          ui.success(`Updated ${field} with '${newValue}'`);
          break;
        case 'pick':
          const table = new Table({
            head: ['field', 'original value', 'new value']
          });

          ui.warn(`package.json conflict:`);

          table.push([field, val, newValue]);
          console.log(table.toString());

          uiloop:while (true) {
            const fileResolution = await ui.listExpand('Resolve package.json conflict (h for help):', this.getConflictResolutionChoices());
            switch (fileResolution) {
              case 'keep':
                break uiloop;

              case 'replace':
                this.deepSet(this.json, field, newValue);
                ui.success(`Updated ${field} with '${newValue}'`);
                break uiloop;

              case 'replaceAll':
                this.resolution = 'replace';
                break uiloop;

              case 'diff':
                const disk = JSON.parse(await rf('package.json', 'utf8'));
                this.sortJsonParts(disk);

                const copy = this.getCopy(this.json);
                this.sortJsonParts(copy);

                this.deepSet(copy, field, newValue);
                file.compareJsonPrint(copy, disk);
                break;
            }
          }
          break;
      }
    } else {
      // otherwise, set the property
      this.deepSet(this.json, field, newValue);
    }
  }

  private async updateDependencies(field: string, dependencies: any): Promise<void> {
    debug('.updateDependencies called');

    for (const key of Object.keys(dependencies)) {
      const newValue = dependencies[key];
      await this.safeUpdate(`${field}.${key}`, newValue);
    }
  }

  private getCopy(json: any) {
    debug('.getCopy called');

    return JSON.parse(JSON.stringify(json));
  }
}
