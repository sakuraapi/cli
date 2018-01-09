import {SakuraApi}  from '@sakuraapi/api';
import 'colors';
import * as fs      from 'fs';
import * as util    from 'util';
import {Bootstrap}  from './sakura-api';
import {LogService} from './services/log-service';

// Note to implementor: you'll want to think through what the right behavior for your server is
// when there's an `unhandledRejection` or `uncaughtException`. This placeholder is here so you at least
// get some kind of useful stack trace until you implement the solution that makes sense for you.
// Do not go to production with these event handlers as-is.

// tslint:disable:no-console
process.on('unhandledRejection', (err) => {
  console.log('Caught unhandledRejection');
  console.log(err);
});

process.on('uncaughtException', (err) => {
  console.log('Caught uncaughtException');
  console.log(err);
});

/**
 * Entry point for Donation server.
 *
 * See `./sakuraapi.ts` for configuration of SakuraApi.
 */
class Server {

  log: LogService;
  sapi: SakuraApi;

  async start() {
    const writeFile = util.promisify(fs.writeFile);

    try {
      this.sapi = await new Bootstrap().boot();
      this.log = this.sapi.getProvider(LogService);

      await this
        .sapi
        .listen({bootMessage: `SakuraAPI Server :: port: ${this.sapi.port} :: By your command |<\n`.red});

      this.log.info(`SakuraAPI Server started :: port: ${this.sapi.port}`);

      const configJson = JSON.stringify(this.sapi.config, null, 2);
      await writeFile('config.json', configJson, 'utf8');

    } catch (err) {
      if (this.log) {
        this.log.error(`Error starting SakuraAPI Server: %o`, err);
      } else {
        console.log(err);
      }
    }
  }
}

new Server().start();
// tslint:enable:no-console
