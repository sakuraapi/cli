import {
  paramCase,
  pascalCase
}                  from 'change-case';
import * as ejs    from 'ejs';
import {readFile}  from 'fs';
import {join}      from 'path';
import {promisify} from 'util';
import {IArgs}     from '../i-args';
import {file}      from '../utilities/file';
import {ui}        from '../utilities/ui';
import {Templates} from './templates';

const rf = promisify(readFile);

interface IParts {
  className: string;
  destPath: string;
  fileName: string;
  rawFileName: string;
  specFileName: string;
}

export class Generate {
  constructor(private args: IArgs) {
  }

  async generate(schematic: string, path: string) {
    const {className, destPath, fileName, rawFileName, specFileName} = this.parsePath(path);

    const templatePath = join(__dirname, '..', `generators/${schematic}.ts.ejs`);
    const templatePathSpec = join(__dirname, '..', `generators/${schematic}.spec.ts.ejs`);

    const realFilePath = join(destPath, fileName);
    const realSpecFilePath = join(destPath, specFileName);

    const content = file.getText(realFilePath);
    if (content) {
      ui.error(`${path} already exists`);
    }

    const contentSpec = file.getText(realSpecFilePath);
    if (contentSpec) {
      ui.error(`${path} spec file already exists`);
    }

    const templateFile = await rf(templatePath, 'utf8');
    const templateSpecFile = await rf(templatePathSpec, 'utf8');
    const templates = new Templates(this.args);

    const rendered = templates
      .removeEjsEmptyCommentLines(ejs.render(templateFile, {
        className,
        fileName,
        rawFileName,
        specFileName
      }));

    const renderedSpec = templates
      .removeEjsEmptyCommentLines(ejs.render(templateSpecFile, {
        className,
        fileName,
        rawFileName,
        specFileName
      }));

    templates.saveFile(realFilePath, rendered, 'created');
    templates.saveFile(realSpecFilePath, renderedSpec, 'created');
    ui.boxedMessage(`Don't forget to inject ${className} when instantiating SakuraApi`);
  }

  private parsePath(path: string): IParts {
    let destPath = '';
    let filename = '';

    if (path.endsWith('.ts')) {
      path = path.substring(0, path.length - 2);
    }

    let pathParts = path.split('/');
    if (pathParts.length === 1) {
      destPath = '/';
      filename = path;
    } else {
      destPath = pathParts.slice(0, pathParts.length - 1).join('/');
      filename = pathParts[pathParts.length - 1];
    }

    filename = paramCase(filename);
    let className = pascalCase(filename);

    return {
      className,
      destPath,
      fileName: `${filename}.ts`,
      rawFileName: `${filename}`,
      specFileName: `${filename}.spec.ts`
    };
  }
}
