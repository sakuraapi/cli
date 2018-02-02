import {SakuraApi} from '@sakuraapi/core';
import {json}      from 'body-parser';
import * as helmet from 'helmet';
import {sign}      from 'jsonwebtoken';

export const baseUri = '/testApi';
export const noNetwork = !!process.env.NO_NETWORK || false;
process.on('unhandledRejection', err => {
  console.log('Caught unhandledRejection');
  console.log(err);
});

process.on('uncaughtException', err => {
  console.log('Caught uncaughtException');
  console.log(err);
});

if (noNetwork) {
  // tslint:disable-next-line
  console.log('NO_NETWORK mode enabled'.yellow.underline);
}

/**
 * Place at the top of a test method to skip that test if you start the tests with NO_NETWORK=true as
 * an environment variable
 * @param {string} msg
 */
export function skipNoNetwork(msg?: string) {
  if (noNetwork) {
    pending(msg || 'skipping, no network');
  }
}

export function testSapi(di: { models?: any[], plugins?: any[], providers?: any[], routables?: any[] }): SakuraApi {

  const sapi = new SakuraApi({
    baseUrl: '/testApi',
    configPath: 'dist/spec/config/environment.json',
    models: di.models || [],
    plugins: di.plugins || [],
    providers: di.providers || [],
    routables: di.routables || []
  });

  sapi.addMiddleware(helmet(), 0);
  sapi.addMiddleware(json());

  if (process.env.TRACE_REQ) {
    sapi.addMiddleware((req, res, next) => {
      // tslint:disable:no-console
      console.log(`REQUEST: ${req.method}: ${req.url} (${req.originalUrl}), body: ${JSON.stringify(req.body)}`.blue);
      // tslint:enable:no-console
      next();
    });
  }

  // not supported in SakuraApi 0.4.0 or the head of 0.5.0  -- integrate once 0.5.0 is released
  sapi.addLastErrorHandlers((err, req, res, next) => {

    // tslint:disable
    console.log('------------------------------------------------'.red);
    console.log('↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓'.zebra);
    console.log('An error bubbled up in an unexpected way during testing');
    console.log(err);
    console.log('↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑'.zebra);
    console.log('------------------------------------------------'.red);
    // tslint:enable

    next(err);
  });

  return sapi;
}

export function testUrl(endpoint: string, sapi: SakuraApi): string {
  const server = sapi.config.server || {};
  return `${baseUri}${endpoint}`;
}

export function testToken(sapi: SakuraApi, obj?: any): any {

  const token = Object.assign(obj || {}, {
    aud: sapi.config.authentication.jwt.audience,
    iss: sapi.config.testSetup.jwt.issuer
  });

  return sign(token, sapi.config.authentication.jwt.key);
}
