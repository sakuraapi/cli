import * as debugInit from 'debug';
import {
  diffChars,
  diffJson,
  diffLines
}                     from 'diff';
import {
  readdir,
  readFile
}                     from 'fs';
import * as glob      from 'glob';
import * as memFs     from 'mem-fs';
import * as editor    from 'mem-fs-editor';
import {join}         from 'path';
import {
  cd,
  mkdir
}                     from 'shelljs';
import {promisify}    from 'util';
import {IArgs}        from '../i-args';
import {UI}           from './ui';

const debug = debugInit('sapi:File');
const rd = promisify(readdir);
const rf = promisify(readFile);

export interface IMemFs {
  get: (path: string) => object;
}

export interface IMemFsEditor {
  commit: (any) => Promise<void>;
  exists: (path: string) => boolean;
  read: (path: string, defaultValue: any) => string;
  readJSON: (path: string, defaultValue: any) => object;
  write: (path: string, content: string | Buffer) => void;
  writeJSON: (path: string, json: any, replacer?: any, space?: number) => void;
}

export class File {

  memfs: IMemFs;

  private memEditor: IMemFsEditor;
  private ui: UI;

  constructor(private args: IArgs) {
    this.ui = new UI(this.args);

    this.memfs = memFs.create();
    this.memEditor = editor.create(this.memfs);

    this.memfs.get('package.json');

    debug('File constructed');
  }

  /**
   * Commit files in memory FS to disk
   * @returns {Promise<void>}
   */
  async commit(): Promise<void> {
    debug('.commit called');

    return new Promise<void>((resolve, reject) => {
      this.memEditor.commit((err) => {
        (err)
          ? reject(err)
          : resolve();
      });
    });
  }

  compareCharacters(mem: any, disk: any): string {
    debug('.compareCharacters called');

    const diff = diffChars(disk, mem);

    let lc = 1;
    let result = `${lc++}: `;
    for (const part of diff) {
      const color = (part.added)
        ? 'green'
        : part.removed ? 'red' : 'grey';

      for (const c of part.value) {
        result += (c === '\n')
          ? `\n${lc++}: `.white
          : c[color];

      }
    }
    return result;
  }

  compareCharactersPrint(mem: any, disk: any): void {
    debug('.compareCharactersPrint called');

    console.log(this.compareCharacters(mem, disk));
  }

  /**
   * Returns a color coded string with the diff of the two inputs
   * @param {string} mem the memory version of the file
   * @param {string} disk the disk version of the file
   * @returns {string}
   */
  compareJson(mem: { any }, disk: { any }): string {
    debug('.compareJson called');

    const diff = diffJson(disk, mem);

    let result = '';
    diff.forEach(function(part) {
      // green for additions, red for deletions
      // grey for common parts
      let color = part.added ? 'green' :
        part.removed ? 'red' : 'grey';
      result += part.value[color];
    });

    return result + '\n';
  }

  /**
   * Prints a comparison with the diff of the two inputs
   * @param {string} mem the memory version of the file
   * @param {string} disk the disk version of the file
   */
  compareJsonPrint(mem: { any }, disk: { any }): void {
    debug('.compareJsonPrint called');
    console.log(this.compareJson(mem, disk));
  }

  compareLines(mem: any, disk: any): string {
    debug('.compareLines called');

    const diff = diffLines(disk, mem);

    let lc = 1;
    let result = `${lc++}:\t`;
    for (const part of diff) {
      const color = (part.added)
        ? 'green'
        : part.removed ? 'red' : 'grey';

      for (const c of part.value) {
        result += (c === '\n')
          ? `\n${lc++}:\t`.white
          : c[color];

      }
    }

    return result;
  }

  compareLinesPrint(mem: any, disk: any): void {
    debug('.compareLinesPrint called');

    console.log(this.compareLines(mem, disk));
  }

  exists(path: string) {
    debug('.exists called');

    return this.memEditor.exists(path);
  }

  getTemplateFiles(): string[] {
    const templatePath = join(__dirname, '..', 'template');

    debug('.getTemplateFiles called for path: %s', templatePath);

    return glob.sync(`${templatePath}/**/*`, {dot: true, nodir: true});
  }

  /**
   * Lazy loads file from FS into memory FS and then returns the content as a string. Returns '' if the file
   * doesn't exist on the FS.
   * @param {string} file
   * @returns {any}
   */
  getText(file: string) {
    debug('.getText called for file: %s', file);

    try {
      const result = this.memEditor.read(file, {});
      debug('.getText result:\n%s', result);
      return result;
    } catch (err) {
      debug('.getText error: %O', err);
      return null;
    }
  }

  /**
   * Lazy loads file from FS into memory FS and then returns the content as a json file or null if the file
   * doesn't exist on the FS.
   * @param {string} file
   * @returns {Object}
   */
  getJson(file: string) {
    debug('.getJson called');

    try {
      return this.memEditor.readJSON(file, null);
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  }

  newCwd(path: string) {
    debug('.newCwd called');

    if (!path) {
      return;
    }

    mkdir('-p', path);
    cd(path);
  }

  write(path: string, content: string | Buffer) {
    debug('.write called');

    this.memEditor.write(path, content);
  }

  writeJson(file: string, json: any, replacer?: any, space?: number) {
    debug('.writeJson called');

    this.memEditor.writeJSON(file, json, replacer, space);
  }

  /**
   * Returns an array of files in the current working directory. An array of length 0 means the directory is empty.
   * @returns {Promise<string[]>}
   */
  async verifyEmpty(): Promise<string[]> {
    debug('.verifyEmpty called');

    const files = await rd(process.cwd()) || [];
    if (files.length > 0 && !this.args.skipDirectoryCheck) {
      this.ui.warn(`sapi will not write changes to any files until it is complete. If you already have SakuraAPI`);
      this.ui.warn(`setup in this directory, sapi will confirm conflicts before making any changes.`);
      await this.ui.exitQuestion(`There are ${files.length} files in ${process.cwd()}. Proceed?`, false, 1, {default: true});
    }
    return files;
  }
}

export let file: File;

export function initFile(args: IArgs) {
  debug('.initFile called');
  file = new File(args);
}
