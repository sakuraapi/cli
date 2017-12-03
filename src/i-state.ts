import {File} from './file';
import {Git} from './git';
import {IArgs} from './i-args';
import {UI} from './ui';

export interface IState {
  args: IArgs;
  file: File;
  git: Git
  ui: UI;
}
