import {SakuraApi}        from '@sakuraapi/core';
import {agent as request} from 'supertest';
import {
  testSapi,
  testUrl
}                         from '../../spec/helpers/sakura-api';
import {LogService}       from '../services/log-service';
import {ConfigApi}        from './config.api';

describe('ConfigApi', () => {
  let sapi: SakuraApi;

  beforeEach((done) => {
    sapi = testSapi({
      routables: [
        ConfigApi
      ],
      providers: [
        LogService
      ]
    });

    sapi
      .listen({bootMessage: ''})
      .then(done)
      .catch(done.fail);
  });

  afterEach(async (done) => {
    try {
      await sapi.close();
      sapi.deregisterDependencies();
      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it('is instantiated', async (done) => {
    try {

      const result = await request(sapi.app)
        .get(testUrl('/', sapi))
        .expect(200);

      expect(result.body.serverUp).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  });
});
