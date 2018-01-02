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

        let rendered;
        if (realFilePath.endsWith('ejs')) {
          rendered = template;
        } else {
          rendered = this.removeEjsEmptyCommentLines(ejs.render(template, prefs));
        }

        if (content) {
          // the file exists already
          if (content === rendered) {
            this.state.ui.success(`${realFilePath} exists`);

          } else {
            this.state.ui.warn(`${realFilePath} conflict`);
            const fileResolution = await this.state.ui.listExpand('Resolve conflict (h for help):', this.getConflictResolutionChoices());
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

  private removeEjsEmptyCommentLines(source: string): string {
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
    if (content && content.trim().length === 0) {
      this.state.ui.warn(`${filePath} skipped, no content`);
    } else if (content.length > 0) {
      this.state.ui.success(`${filePath} ${msg}`);
      this.state.file.write(filePath, content);
    }
  }
}
