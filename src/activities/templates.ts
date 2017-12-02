import * as ejs from 'ejs';
import {readFile} from 'fs';
import {join} from 'path';
import {promisify} from 'util';
import {IState} from '../i-state';
import {IInitCmdOptions, IPreferences} from './preferences';

const rf = promisify(readFile);

export class Templates {

  constructor(private state: IState) {
  }

  async createFiles(prefs: IPreferences, cmd: IInitCmdOptions) {
    this.state.ui.message('Creating files (not persisted until everything is completed)...');

    const templateBasePath = join(__dirname, '..', 'template/');
    const templateFiles = this.state.file.getTemplateFiles();

    for (const templateFilePath of templateFiles) {
      uiLoop:while (true) {
        const realFilePath = templateFilePath.replace(templateBasePath, '');

        const content = this.state.file.getText(realFilePath);
        const template = await rf(templateFilePath, 'utf8');
        const rendered = ejs.render(template, prefs);

        if (content) {
          // the file exists already
          if (content === rendered) {
            this.state.ui.success(`${realFilePath} exists`);

          } else {
            this.state.ui.warn(`${realFilePath} conflict`);
            const fileResolution = await this.state.ui.listExpand('Resolve package.json conflict (h for help):', this.getConflictResolutionChoices());
            switch (fileResolution) {
              case 'keep':
                this.state.ui.success(`keeping ${realFilePath}`);
                break uiLoop;
              case 'replace':
                this.saveFile(realFilePath, rendered, 'replaced');
                break uiLoop;
              case 'diff':
                const realFile = await rf(realFilePath, 'utf8');
                this.state.ui.lineOMagic();
                this.state.file.compareLinesPrint(rendered, realFile);
                this.state.ui.lineOMagic();
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

  private getConflictResolutionChoices(): any[] {
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

  private saveFile(filePath, content, msg): void {
    this.state.file.write(filePath, content);

    if (content.length > 0) {
      // don't report the creation of zero length files
      this.state.ui.success(`${filePath} ${msg}`);
    }
  }
}
