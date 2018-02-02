import {
  Injectable,
  SakuraApi,
  SapiInjectableMixin
}                                from '@sakuraapi/core';
import {hostname}                from 'os';
import * as request              from 'request-promise-native';
import {
  Logger,
  LoggerInstance,
  transports
}                                from 'winston';
import * as winstonAwsCloudWatch from 'winston-aws-cloudwatch';
import {errorToJsonString}       from '../lib/error-to-json-string';

export {SakuraApi};

export type levels = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

/**
 * Logging is set to output json.
 *
 * Example Sapi Config:
 * {
 *   logging: {
 *      transports: [
 *        {
 *          transport: "File",
 *          level: "info",
 *          filename: "error.log"
 *        },
 *        {
 *          transport: "Console",
 *          level: "debug",
 *          colorize: true
 *        }
 *      ]
 *   }
 * }
 *
 * Basically, each "transports" object has a `transport` property that corresponds to the name of a Winston transport
 * (see https://github.com/winstonjs/winston/blob/master/docs/transports.md#winston-core, and
 * https://github.com/winstonjs/winston/blob/master/docs/transports.md#additional-transports). The `transport` property
 * should match the transport name exactly (capitalization matters). The rest of the properties for that transport
 * are whatever the properties are in the documentation for that transport.
 */
@Injectable()
export class LogService extends SapiInjectableMixin() {

  private static city = 'unacquired';
  private static country = 'unacquired';
  private static externalHostname = 'unacquired';
  private static logger: LoggerInstance;
  private static hostName = 'unknown';
  private static ip = 'unacquired';
  private static nodeEnv = 'unknown';

  get logger(): LoggerInstance {
    return LogService.logger;
  }

  constructor() {
    super();
    const config = this.sapi.config.logging || {};

    if (!LogService.logger) {
      LogService.logger = new Logger();
      this.initializeTransports(config);

      LogService.hostName = hostname() || 'unknown';
      LogService.nodeEnv = process.env.NODE_ENV || 'unknown';

      this.getIpInfo();

      LogService.logger.on('error', (err) => {
        console.log(`Logging Error: %O:`, err); // tslint:disable-line
      });
    }
  }

  error(message: any, err?: Error): void {
    this.logger.log('error', this.buildJsonObj(message, err));
  }

  warn(message: any, err?: Error): void {
    this.logger.log('warn', this.buildJsonObj(message, err));
  }

  info(message: any, err?: Error): void {
    this.logger.log('info', this.buildJsonObj(message, err));
  }

  verbose(message: any, err?: Error): void {
    this.logger.log('verbose', this.buildJsonObj(message, err));
  }

  debug(message: any, err?: Error): void {
    this.logger.log('debug', this.buildJsonObj(message, err));
  }

  silly(message: any, err?: Error): void {
    this.logger.log('silly', this.buildJsonObj(message, err));
  }

  private buildJsonObj(message: any, err?: Error): object {
    const obj = typeof message === 'string' ? {message} : message;

    obj.serverCity = LogService.city;
    obj.serverCountry = LogService.country;
    obj.serverExternalHostname = LogService.externalHostname;
    obj.serverHostname = LogService.hostName;
    obj.serverIp = LogService.ip;
    obj.serverNodeEnv = LogService.nodeEnv;

    if (err) {
      obj.error = errorToJsonString(err);
    }

    return obj;
  }

  private initializeTransports(config): void {
    const transportConfigs = config.transports || [];

    for (const transConfig of transportConfigs) {

      let trans = null;
      switch (transConfig.transport) {
        case 'winstonAwsCloudWatch':
          trans = winstonAwsCloudWatch;
          break;
        default:
          trans = transports[transConfig.transport];
          break;
      }

      this.logger.add(trans, transConfig);
    }
  }

  private async getIpInfo() {
    // remember, this service is normally running in a docker container and at the time this was implemented it is
    // not possible for the internal process of a container to get much information about its host environment, so
    // this is an attempt to get some useful information

    // this is a fire and forget block of code... if it does not get the information it needs it will try every minutes
    // for 1 day -- so as to account for ifconfig.co being down
    let retries = 0;
    try {
      const result = await request('https://ifconfig.co/json');

      const json = JSON.parse(result) || {};
      LogService.externalHostname = json.hostname || 'unknown';
      LogService.city = json.city || 'unknown';
      LogService.country = json.country || 'unknown';
      LogService.ip = json.ip || 'unknown';
      this.info(`Logger acquired external ip: ${LogService.ip}, from ifconfig.co/json: ${result}`);
    } catch (err) {
      LogService.ip = 'unknown';
      if (retries < 1440) {
        this.info(`Logger unable to acquire external ip through ifconfig.co/json, retry ${retries}`, err);
        setTimeout(() => {
          retries++;
          this.getIpInfo();
        }, 60000);
      } else {
        this.info(`Logger unable to acquire external ip through ifconfig.co/json, retry ${retries}... giving up.`, err);
      }
    }
  }
}
