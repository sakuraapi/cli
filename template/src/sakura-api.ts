import {SakuraApi} from '@sakuraapi/api';
//-<%if(authRole === 'issuer' || authRole === 'audience') {%>
import {addAuthAudience, IAuthAudienceOptions} from '@sakuraapi/auth-audience/lib';
//-<%}%>
//-<%if(authRole === 'issuer') {%>
import {addAuthenticationAuthority, IAuthenticationAuthorityOptions} from '@sakuraapi/auth-native-authority';
//-<%}%>
import * as cors from 'cors';
//-<%if(authRole === 'issuer') {%>
import {NextFunction, Request, Response} from 'express';
//-<%}%>
import * as helmet from 'helmet';
import {ConfigApi} from './api/config.api';
//-<%if(authRole === 'issuer' || authRole === 'audience') {%>
import {authExcludedRoutes} from './config/bootstrap/auth-excluded-routes';
//-<%}%>
import {BootstrapIndexes} from './config/bootstrap/bootstrap-indexes';
//-<%if(authRole === 'issuer') {%>
import {dbs} from './config/bootstrap/db';
//-<%}%>
import {LogService} from './services/log';

export class Bootstrap {
  private log: LogService;
  private sapi: SakuraApi;
  private shuttingDown = false;

  async boot(): Promise<SakuraApi> {
    this.sapi = new SakuraApi({
      baseUrl: '/api',
      models: [],
      plugins: [
        //-<%if(authRole === 'issuer') {%>
        {
          options: this.authNativeAuthorityOptions(),
          plugin: addAuthenticationAuthority
        },
        //-<%}%>
        //-<%if(authRole === 'issuer' || authRole === 'audience') {%>
        {
          options: this.authAudienceOptions(),
          order: 1,
          plugin: addAuthAudience
        }
        //-<%}%>
      ],
      providers: [
        LogService
      ],
      routables: [
        ConfigApi
      ]
    });

    this.log = this.sapi.getProvider(LogService);

    // SakuraApi setup
    this.sapi.addMiddleware(cors(this.sapi.config.cors), 0);
    this.sapi.addMiddleware(helmet(), 0);

    // Add debug tracing
    if (this.sapi.config.TRACE_REQ === 'true') {
      this.sapi.addMiddleware((req, res, next) => {
        this.log.info({
          body: req.body,
          method: req.method,
          url: req.url
        });
        next();
      });
    }

    await this.sapi.dbConnections.connectAll();

    // Bootstrap items
    const wait = [];
    wait.push(new BootstrapIndexes(this.sapi).run());
    await Promise.all(wait);

    process.once('SIGINT', () => this.shutdownServer.call(this, 'SIGINT'));
    process.once('SIGTERM', () => this.shutdownServer.call(this, 'SIGTERM'));
    process.once('SIGUSR1', () => this.shutdownServer.call(this, 'SIGUSR1'));
    process.once('SIGUSR2', () => this.shutdownServer.call(this, 'SIGUSR2'));

    return this.sapi;
  }

  async shutdownServer(signal: string): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;

    this.log.info(`Shutting down Donation Server (signal: ${signal})`);

    await this.sapi
      .close()
      .catch((err) => this.log.error('Unable to shutdown SakuraApi', err));

    this.log.info('And now his watch is ended');
    process.exit(0);
  }

  //-<%if(authRole === 'issuer' || authRole === 'audience') {%>
  private authAudienceOptions(): IAuthAudienceOptions {
    return {
      excludedRoutes: authExcludedRoutes
    };
  }

  //-<%}%>
  //-<%if(authRole === 'issuer') {%>
  private authNativeAuthorityOptions(): IAuthenticationAuthorityOptions {
    return {
      authDbConfig: dbs.authentication,
      defaultDomain: 'default',
      endpoints: {create: 'users'},
      onChangePasswordEmailRequest: this.onChangePasswordEmailRequest.bind(this),
      onForgotPasswordEmailRequest: this.onForgotPasswordEmailRequest.bind(this),
      onResendEmailConfirmation: this.onResendEmailConfirmation.bind(this),
      onUserCreated: this.onUserCreated.bind(this),
      userDbConfig: dbs.user
    };
  }

  private async onChangePasswordEmailRequest(user: any, req: Request, res: Response): Promise<void> {
    // send email if user requests password change
  }

  private async onForgotPasswordEmailRequest(user: any, token: string, req: Request, res: Response): Promise<void> {
    // send email if user forgot password
  }

  private async onResendEmailConfirmation(user: any, token: string, req: Request, res: Response): Promise<void> {
    // send email if user requests resend of email confirmation
  }

  private async onUserCreated(user: any, token: string, req: Request, res: Response): Promise<void> {
    // send email when new user is created with confirmation token
  }

  //-<%}%>
}



