//-<%if (authRole === 'issuer') {%>
import {
  Injectable,
  SakuraApi,
  SapiInjectableMixin
}                        from '@sakuraapi/api';
import * as debugInit    from 'debug';
import * as Email        from 'email-templates';
import {
  Request,
  Response
}                        from 'express';
import {createTransport} from 'nodemailer';
import {join}            from 'path';
import {LogService}      from './log-service';

export {SakuraApi};

const debug = debugInit('profile:email');

@Injectable()
export class EmailServiceFactory extends SapiInjectableMixin() {

  private email: Email;

  constructor() {
    super();

    this.email = new Email({
      message: {
        from: (this.sapi.config.smtpOptions || {} as any).from || '---set env smtpOptions.from---'
      },
      transport: createTransport(this.sapi.config.smtp),
      views: {
        options: {
          extension: 'ejs'
        },
        root: join(__dirname, (this.sapi.config.smtpOptions || {} as any).templates || 'config/templates/email')
      }
    });
  }

  getEmailTemplateService(): Email {
    return this.email;
  }
}

@Injectable()
export class EmailService extends SapiInjectableMixin() {

  private email: Email;
  private emailOptions = {
    forgotPasswordTokenUrl: '',
    newUserTokenUrl: ''
  };

  constructor(private emailServiceFactory: EmailServiceFactory,
              private log: LogService) {
    super();

    this.emailOptions.forgotPasswordTokenUrl = (this.sapi.config.smtpOptions || {} as any).forgotPasswordTokenUrl
      || '---set env smtpOptions.forgotPasswordTokenUrl---';

    this.emailOptions.newUserTokenUrl = (this.sapi.config.smtpOptions || {}  as any).newUserTokenUrl
      || '---set env smtpOptions.newUserTokenUrl---';

    this.email = this.emailServiceFactory.getEmailTemplateService();
  }

  /**
   * Triggered when a user's password has been changed to notify them of the change.
   */
  async onChangePasswordEmailRequest(user: any, req: Request, res: Response): Promise<void> {
    debug('onChangePasswordEmailRequest called');

    if (!user) {
      return;
    }

    try {
      await this.email.send({
        locals: {
          email: user.email,
          firstName: user.fn,
          lastName: user.ln
        },
        message: {
          to: user.email
        },
        template: 'password-changed'
      });
    } catch (err) {
      this.log.error('unable to send password changed email', err);
      return Promise.reject(err);
    }

    res
      .locals
      .send(200, {ok: `email sent`});
  }

  /**
   * Triggered when a user has requested a forgot password email
   */
  async onForgotPasswordEmailRequest(user: any, token: string, req: Request, res: Response): Promise<void> {
    debug('onForgotPasswordEmailRequest');

    if (!user || !token) {
      return;
    }

    try {
      await this.email.send({
        locals: {
          email: user.email,
          firstName: user.fn,
          lastName: user.ln,
          tokenUrl: `${this.emailOptions.forgotPasswordTokenUrl}?token=${token}`
        },
        message: {
          to: user.email
        },
        template: 'forgot-password'
      });
    } catch (err) {
      this.log.error('unable to send forgot password email', err);
      return Promise.reject(err);
    }

    res
      .locals
      .send(200, {ok: `email sent`});
  }

  /**
   * Triggered when a user requests that email confirmation be resent
   */
  async onResendEmailConfirmation(user: any, token: string, req: Request, res: Response): Promise<void> {
    debug('onResendEmailConfirmation called');

    if (!user || !token) {
      return;
    }

    try {
      await this.email.send({
        locals: {
          email: user.email,
          firstName: user.fn,
          lastName: user.ln,
          tokenUrl: `${this.emailOptions.newUserTokenUrl}?token=${token}`
        },
        message: {
          to: user.email
        },
        template: 'user-created-resend'
      });
    } catch (err) {
      this.log.error('unable to resend email confirmation', err);
      return Promise.reject(err);
    }

    res
      .locals
      .send(200, {ok: `email sent`});
  }

  /**
   * Triggered when a user is created
   */
  async onUserCreated(user: any, token: string, req: Request, res: Response): Promise<void> {
    debug('onUserCreated called');

    if (!user || !token) {
      return;
    }

    try {
      await this.email.send({
        locals: {
          email: user.email,
          firstName: user.fn,
          lastName: user.ln,
          tokenUrl: `${this.emailOptions.newUserTokenUrl}?token=${token}`
        },
        message: {
          to: `${user.fn}${user.fn ? ' ' : ''}${user.ln}<${user.email}>`
        },
        template: 'user-created'
      });
    } catch (err) {
      this.log.error('unable to send user created email', err);
      return Promise.reject(err);
    }

    res
      .locals
      .send(200, {ok: `email sent`});
  }
}

//-<%}%>
