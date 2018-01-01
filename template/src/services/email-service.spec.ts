//-<%if (authRole === 'issuer') {%>
import {Injectable, SakuraApi} from '@sakuraapi/api';
import {addAuthAudience} from '@sakuraapi/auth-audience';
import {addAuthenticationAuthority, IAuthenticationAuthorityOptions} from '@sakuraapi/auth-native-authority';
import {testSapi} from '../../spec/helpers/sakura-api';
import {EmailService, EmailServiceFactory} from './email-service';
import {LogService} from './log-service';

@Injectable()
class MockEmailServiceFactory {
  static lastOptions: any;

  getEmailTemplateService() {
    return {
      send(options: any) {
        MockEmailServiceFactory.lastOptions = options;
      }
    };
  }

}

const req = null;

const res = {
  locals: {
    send: () => {
      return null;
    }
  }
};

describe('EmailService', () => {
  let emailService;
  let sapi: SakuraApi;
  const token = '123';
  const user = {
    email: 'george.washington@test',
    fn: 'george',
    ln: 'washington'
  };

  beforeEach(async () => {
    sapi = testSapi({
      providers: [
        EmailService,
        {use: MockEmailServiceFactory, for: EmailServiceFactory},
        LogService
      ]
    });

    emailService = sapi.getProvider(EmailService);
  });

  it('onChangePasswordEmailRequest', async (done) => {
    try {
      await emailService.onChangePasswordEmailRequest(user, req, res);

      const results = (MockEmailServiceFactory.lastOptions || {} as any).locals;
      expect(results.email).toBe(user.email);
      expect(results.firstName).toBe(user.fn);
      expect(results.lastName).toBe(user.ln);

      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it('onForgotPasswordEmailRequest', async (done) => {
    try {
      await emailService.onForgotPasswordEmailRequest(user, token, req, res);

      const results = (MockEmailServiceFactory.lastOptions || {} as any).locals;
      expect(results.email).toBe(user.email);
      expect(results.firstName).toBe(user.fn);
      expect(results.lastName).toBe(user.ln);
      expect(results.tokenUrl).toBe(`test/?token=${token}`);

      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it('onResendEmailConfirmation', async (done) => {
    try {
      await emailService.onResendEmailConfirmation(user, token, req, res);

      const results = (MockEmailServiceFactory.lastOptions || {} as any).locals;
      expect(results.email).toBe(user.email);
      expect(results.firstName).toBe(user.fn);
      expect(results.lastName).toBe(user.ln);
      expect(results.tokenUrl).toBe(`test/?token=${token}`);

      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it('onUserCreated', async (done) => {
    try {

      await emailService.onUserCreated(user, token, req, res);

      const results = (MockEmailServiceFactory.lastOptions || {} as any).locals;
      expect(results.email).toBe(user.email);
      expect(results.firstName).toBe(user.fn);
      expect(results.lastName).toBe(user.ln);
      expect(results.tokenUrl).toBe(`test/?token=${token}`);

      done();

    } catch (err) {
      done.fail(err);
    }
  });
});
//-<%}%>
