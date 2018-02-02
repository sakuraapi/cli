/**
 * Uncomment and place your indexes here if you'd like your server to verify indexes on start
 */
import {SakuraApi} from '@sakuraapi/core';

// import {dbs} from './db';

export class BootstrapIndexes {

  constructor(private sapi: SakuraApi) {
  }

  async run(): Promise<void> {
    // const testDb = this.sapi.dbConnections.getDb(dbs.test.db);
    //
    // await testDb
    //   .createIndex(dbs.test.collection, {
    //     chargeId: 1
    //   });
  }
}
