import {
  IRoutableLocals,
  Routable,
  Route,
  SakuraApi,
  SapiRoutableMixin
}                   from '@sakuraapi/core';
import {
  NextFunction,
  Request,
  Response
}                   from 'express';
import {
  OK,
  SERVER_ERROR
}                   from '../lib/http-status';
import {LogService} from '../services/log-service';

export {SakuraApi};

@Routable({
  baseUrl: '/'
})
export class ConfigApi extends SapiRoutableMixin() {

  constructor(private log: LogService) {
    super();
  }

  @Route({
    method: '*',
    path: ''
  })
  allHandler(req: Request, res: Response, next: NextFunction) {
    const locals = res.locals as IRoutableLocals;

    try {
      locals
        .send(OK, {
          server: '<%= name %>',
          serverUp: true
        });
    } catch (err) {
      locals
        .send(SERVER_ERROR, {
          error: 'SERVER_ERROR'
        });
      this.log.error(err);
    } finally {
      next();
    }
  }
}
