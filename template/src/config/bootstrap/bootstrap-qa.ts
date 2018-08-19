import { SakuraApi }  from '@sakuraapi/core';
import { hash }       from 'bcrypt';
import * as crypto    from 'crypto';
import { LogService } from '../../services/log-service';
import { dbs }        from './db';

export class BootstrapQA {

  log: LogService;

  constructor(public sapi: SakuraApi) {
    this.log = this.sapi.getProvider(LogService);
  }

  run() {

    //-<%if(authRole === 'issuer') {%>
    if (process.env.NODE_ENV === 'production') {
      throw new Error('You cannot run BootstrapQA when in production mode');
    }

    this.log.info('Bootstrapping Test Data for QA');
    const userDb = this.sapi.dbConnections.getDb(dbs.user.db);
    const userCol = userDb.collection(dbs.user.collection);

    const wait = [];
    // create a user for QA purposes following this pattern
    // wait.push(this.addUser(userCol, {
    //   domain: 'default',
    //   email: 'jp@someserver.somewhere',
    //   emailVerified: true,
    //   fn: 'J.P.',
    //   ln: 'Poveda'
    // }));

    return Promise.all(wait);
    //-<%}%>
  }

  //-<%if(authRole === 'issuer') {%>
  async addUser(userCol, userData) {
    const user = await userCol.findOne({email: userData.email});

    if (user) {
      this.log.info(`${userData.email} found, skipping`);
      return;
    }

    const password = userData.pw || crypto.randomBytes(6).toString('base64');
    const hashRounds = (((this.sapi.config || {}  as any).authentication || {} as any).native
      || {} as any).bcryptHashRounds || 12;
    return hash(password, hashRounds)
      .then((pw) => {
        userData.pw = pw;
        return userCol
          .insertOne(userData)
          .then(() => this
            .log
            .info(`Created test user - Email: ${userData.email}, PW: ${password}`.magenta));
      });

  }

  //-<%}%>
}
