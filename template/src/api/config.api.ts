import {IRoutableLocals, Routable, Route, SakuraApiRoutable} from '@sakuraapi/api';
import {NextFunction, Request, Response} from 'express';
import {OK, SERVER_ERROR} from '../lib/http-status';
import {LogService} from '../services/log-service';

@Routable({
  baseUrl: '/'
})
export class ConfigApi extends SakuraApiRoutable {

  constructor(private log: LogService) {
    super();
  }

  @Route({
    method: 'delete',
    path: ''
  })
  async deleteHandler(req: Request, res: Response, next: NextFunction) {
    await this.configHandler(req, res);
    next();
  }

  @Route({
    method: 'get',
    path: ''
  })
  async getHandler(req: Request, res: Response, next: NextFunction) {
    await this.configHandler(req, res);
    next();
  }

  @Route({
    method: 'head',
    path: ''
  })
  async headHandler(req: Request, res: Response, next: NextFunction) {
    await this.configHandler(req, res);
    next();
  }

  @Route({
    method: 'post',
    path: ''
  })
  async postHandler(req: Request, res: Response, next: NextFunction) {
    await this.configHandler(req, res);
    next();
  }

  @Route({
    method: 'put',
    path: ''
  })
  async putHandler(req: Request, res: Response, next: NextFunction) {
    await this.configHandler(req, res);
    next();
  }

  async configHandler(req: Request, res: Response): Promise<void> {
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
    }
  }
}
