import {SakuraApi} from '@sakuraapi/api';
import {addAuthAudience, IAuthAudienceOptions} from '@sakuraapi/auth-audience/lib';
import * as helmet from 'helmet';
import {sign} from 'jsonwebtoken';
import {authExcludedRoutes} from '../../src/lib/auth-excluded-routes';

export const baseUri = '/testApi';

export const noNetwork = !!process.env.NO_NETWORK || false;

if (noNetwork) {
  // tslint:disable-next-line
  console.log('NO_NETWORK mode enabled'.yellow.underline);
}

export function skipNoNetwork(msg?: string) {
  if (noNetwork) {
    pending(msg || 'skipping, no network');
  }
}

export function testSapi(di: { models: any[], routables: any[] }): SakuraApi {

  const authAudienceOptions: IAuthAudienceOptions = {
    excludedRoutes: authExcludedRoutes
  };
  const sapi = new SakuraApi({
    baseUrl: '/testApi',
    configPath: 'dist/spec/config/environment.json',
    models: di.models,
    plugins: [
      {
        options: authAudienceOptions,
        order: 1,
        plugin: addAuthAudience
      }
    ],
    routables: di.routables
  });

  sapi.addMiddleware(helmet(), 0);

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
