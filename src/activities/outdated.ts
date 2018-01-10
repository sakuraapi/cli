import * as debugInit from 'debug';
import {IArgs}        from '../i-args';
import {npm}          from '../utilities/npm';
import {ui}           from '../utilities/ui';

const debug = debugInit('sapi:UpdateOutdated');

export interface IOutdatedCmdOptions {
  skipLatest: boolean,
  skipTests: boolean
}

export class UpdateOutdated {
  constructor(private args: IArgs) {
    debug('UpdateOutdated constructed');
  }

  async update(cmd: IOutdatedCmdOptions): Promise<void> {
    debug('.update called');

    const choices = [
      {key: 's', name: 'skip'},
      {key: 'w', name: 'wanted'},
      {key: 'l', name: 'latest'}
    ];

    const packages = await npm.outdated();

    debug(`packages:\n`, packages);

    if (packages.length === 0) {
      ui.message('Looks like you are all up to date');
      process.exit(0);
    }

    const total = (cmd.skipLatest)
      ? packages.reduce((val, pack) => (pack.current !== pack.wanted) ? ++val : val, 0)
      : packages.length;

    ui.message(`You have ${total} outdated packages`);

    let i = 0;
    for (const pack of packages) {

      if (cmd.skipLatest && pack.current === pack.wanted) {
        continue;
      }

      ui.message(`package ${++i} of ${total}`);

      ui.table(['Package'.white, 'Current'.white, 'Wanted'.white, 'Latest'.white], [
        [`${pack.name}`[(pack.wanted === pack.latest) ? 'red' : 'yellow'], `${pack.current}`.white, `${pack.wanted}`.green, `${pack.latest}`.magenta]
      ]);

      const choice = await ui.listExpand(`Choice`, choices);

      switch (choice) {
        case 'skip':
          continue;
        case 'wanted':
          await npm.install(pack.name, pack.wanted, pack.isDevDependency);
          !cmd.skipTests && await  npm.test();
          break;
        case 'latest':
          await npm.install(pack.name, pack.latest, pack.isDevDependency);
          !cmd.skipTests && await  npm.test();
          break;
      }
    }
  }
}
