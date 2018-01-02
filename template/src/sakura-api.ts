import {SakuraApi} from '@sakuraapi/api';
//-<%if(authRole === 'issuer' || authRole === 'audience') {%>
import {addAuthAudience, IAuthAudienceOptions} from '@sakuraapi/auth-audience';
//-<%}%>
//-<%if(authRole === 'issuer') {%>
import {addAuthenticationAuthority, IAuthenticationAuthorityOptions} from '@sakuraapi/auth-native-authority';
//-<%}%>
import {json} from 'body-parser';
import * as cors from 'cors';
import * as debugInit from 'debug';
import * as helmet from 'helmet';
import {ConfigApi} from './api/config.api';
//-<%if(authRole === 'issuer' || authRole === 'audience') {%>
import {authExcludedRoutes} from './config/bootstrap/auth-excluded-routes';
//-<%}%>
import {BootstrapIndexes} from './config/bootstrap/bootstrap-indexes';
//-<%if(authRole === 'issuer') {%>
import {dbs} from './config/bootstrap/db';
import {EmailService, EmailServiceFactory} from './services/email-service';
//-<%}%>
import {LogService} from './services/log-service';

const debug = debugInit('app:bootstrap');

export class Bootstrap {
  //-<%if(authRole === 'issuer') {%>
  private emailService: EmailService;
  //-<%}%>
  private log: LogService;
  private sapi: SakuraApi;
  private shuttingDown = false;

  async boot(): Promise<SakuraApi> {
    debug('boot called');

    process.env.NODE_ENV = process.env.NODE_ENV || 'development';

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
        //-<%if(authRole === 'issuer') {%>
        EmailService,
        EmailServiceFactory,
        //-<%}%>
        LogService
      ],
      routables: [
        ConfigApi
      ]
    });

    this.log = this.sapi.getProvider(LogService);
    //-<%if(authRole === 'issuer') {%>
    this.emailService = this.sapi.getProvider(EmailService);
    //-<%}%>

    // SakuraApi setup
    this.sapi.addMiddleware(cors(this.sapi.config.cors), 0);
    this.sapi.addMiddleware(helmet(), 0);
    this.sapi.addMiddleware(json());

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
    debug(`shutdownServer called by ${signal}`);

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
    // SakuraApi providers are not available until after SakuraApi is constructed and initialized, so wrapper functions
    // are used that point to the EmailService that will be available once the bootstrap is completed.
    return {
      authDbConfig: dbs.authentication,
      defaultDomain: 'default',
      endpoints: {},
      onChangePasswordEmailRequest: this.onChangePasswordEmailRequest.bind(this),
      onForgotPasswordEmailRequest: this.onForgotPasswordEmailRequest.bind(this),
      onResendEmailConfirmation: this.onResendEmailConfirmation.bind(this),
      onUserCreated: this.onUserCreated.bind(this),
      userDbConfig: dbs.user
    };
  }

  private onChangePasswordEmailRequest() {
    (this.emailService as any).onChangePasswordEmailRequest(...arguments);
  }

  private onForgotPasswordEmailRequest() {
    (this.emailService as any).onForgotPasswordEmailRequest(...arguments);
  }

  private onResendEmailConfirmation() {
    (this.emailService as any).onResendEmailConfirmation(...arguments);
  }

  private onUserCreated() {
    (this.emailService as any).onUserCreated(...arguments);
  }

  //-<%}%>
}



