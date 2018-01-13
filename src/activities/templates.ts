import * as debugInit from 'debug';
import * as ejs       from 'ejs';
import {readFile}     from 'fs';
import {join}         from 'path';
import {promisify}    from 'util';
import {IArgs}        from '../i-args';
import {file}         from '../utilities/file';
import {ui}           from '../utilities/ui';
import {
  IInitCmdOptions,
  IPreferences
}                     from './preferences';

const debug = debugInit('sapi:Templates');
const rf = promisify(readFile);

export class Templates {

  constructor(private args: IArgs) {
    debug('Templates constructed');
  }

  async createFiles(prefs: IPreferences, cmd: IInitCmdOptions) {
    debug('.createFiles called');

    ui.message('Creating files (not persisted until everything is completed)...');

    const templateBasePath = join(__dirname, '..', 'template/');
    const templateFiles = file.getTemplateFiles();

    debug('templateBasePath: %s', templateBasePath);
    debug('templateFiles: %o', templateFiles);

    for (const templateFilePath of templateFiles) {
      uiLoop:while (true) {
        const realFilePath = templateFilePath.replace(templateBasePath, '');

        const content = file.getText(realFilePath);
        const template = await rf(templateFilePath, 'utf8');

        let rendered;
        if (realFilePath.endsWith('ejs')) {
          rendered = template;
        } else {
          rendered = this.removeEjsEmptyCommentLines(ejs.render(template, prefs));
        }

        if (content) {
          // the file exists already
          if (content === rendered) {
            ui.success(`${realFilePath} exists`);

          } else {
            ui.warn(`${realFilePath} conflict`);
            const fileResolution = await ui.listExpand('Resolve conflict (h for help):', this.getConflictResolutionChoices());
            switch (fileResolution) {
              case 'keep':
                ui.success(`keeping ${realFilePath}`);
                break uiLoop;
              case 'replace':
                this.saveFile(realFilePath, rendered, 'replaced');
                break uiLoop;
              case 'diff':
                const realFile = await rf(realFilePath, 'utf8');
                ui.lineOMagic();
                file.compareLinesPrint(rendered, realFile);
                ui.lineOMagic();
                continue;
            }
          }

        } else {
          // the file does not yet exist
          this.saveFile(realFilePath, rendered, 'created');
        }
        break;
      }
    }
  }

  removeEjsEmptyCommentLines(source: string): string {
    debug('.removeEjsEmptyCommentLines called');

    const parts = source.split('\n');
    let results = [];
    for (let part of parts) {

      if (part.trim().startsWith('//-') && part.trim().length > 3) {
        part = part.replace('//-', '');
      }

      if (part.trim() !== '//-') {
        results.push(part);
      }

    }
    return results.join('\n').trim() + '\n';
  }

  saveFile(filePath, content, msg): void {
    debug('.saveFile called');

    if (content && content.trim().length === 0) {
      ui.warn(`${filePath} skipped, no content`);
    } else if (content.length > 0) {
      ui.success(`${filePath} ${msg}`);
      file.write(filePath, content);
    }
  }

  private getConflictResolutionChoices(): any[] {
    debug('.getConflictResolutionChoices called');

    return [
      {
        key: 'k',
        name: 'keep original file',
        value: 'keep'
      },
      {
        key: 'r',
        name: 'Replace with new file',
        value: 'replace'
      },
      {
        key: 'd',
        name: 'Diff the files',
        value: 'diff'
      }
    ];
  }
}
