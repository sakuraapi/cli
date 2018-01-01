import {dbs} from '../../src/config/bootstrap/db';

// tslint:disable:max-line-length
module.exports = {
  dbConnections: [
    //-<%if(authRole === 'issuer') {%>
    {
      mongoClientOptions: {},
      name: dbs.user.db,
      url: `mongodb://${process.env.TEST_MONGO_DB_ADDRESS}:${process.env.TEST_MONGO_DB_PORT}/test`
    }
    //-<%}%>
  ],
  server: {
    address: '127.0.0.1',
    port: 8777
  },
  smtp: {
    auth: {
      pass: process.env.SMTP_PASSWORD || '',
      user: process.env.SMTP_USER || ''
    },
    host: process.env.SMTP_HOST || '',
    port: (Number as any).parseInt(process.env.SMTP_PORT || '465'),
    requireTLS: true
  },
  smtpOptions: {
    dateFormat: process.env.SMTP_DATE_FORMAT || 'MMMM D, YYYY (UTC offset: ZZ)',
    forgotPasswordTokenUrl: 'test/',
    from: process.env.SMTP_FROM || 'UNIT TESTING',
    newUserTokenUrl: 'test/'
  }
};
// tslint:enable:max-line-length
