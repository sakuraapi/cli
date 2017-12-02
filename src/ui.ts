import * as clui from 'clui';
import {prompt, registerPrompt} from 'inquirer';
import * as autoComplete from 'inquirer-autocomplete-prompt';
import {IArgs} from './i-args';

export type InquirerAnswerFunction = (answers: any) => void;
export type InquirerChoicesFunction = (answers: any) => any[];

export interface IInquirerOptions {
  message?: string | InquirerAnswerFunction,
  default?: string | number | boolean | Array<string | number> | InquirerAnswerFunction,
  validate?: (input: string, answers: any) => boolean | string;
  filter?: (input: string) => any;
  when?: InquirerAnswerFunction | boolean;
  pageSize?: number;
  prefix?: string;
  suffix?: string;
}

export class UI {

  constructor(private args: IArgs) {
    registerPrompt('autocomplete', autoComplete);
  }

  /**
   * Prompts a user to select from a list of options with auto-complete capabilities
   * @param {string} msg
   * @param {Array<any>} choices
   * @param {IInquirerOptions} options
   * @returns {Promise<string>}
   */
  async autoList(msg: string, choices: Array<any>, options?: IInquirerOptions): Promise<string> {
    options = options || {};

    msg = options.message || msg as any;

    const answer = await prompt({
      type: 'autocomplete',
      name: 'selection',
      message: msg,
      default: options.default,
      filter: options.filter,
      source: (answers, input) => {
        const results = (!input)
          ? choices
          : choices.filter((choice) => choice.toLowerCase().includes(input.toLowerCase()));
        return Promise.resolve(results);
      },
      validate: options.validate
    } as any);

    return answer.selection;
  }

  error(msg: any[] | string, exitCode: number = 1, spaces?: number) {
    this.print(msg, 'red', spaces);
    process.exit(exitCode);
  }

  /**
   * A confirmation that if answered in an @exitOn way causes the process to exit with @exitCode
   * @param {string} msg the message to display
   * @param {boolean} exitOn the answer (true or false) to exit on
   * @param {number} exitCode the code to exit with
   * @param {IInquirerOptions} options
   * @returns {Promise<boolean>}
   */
  async exitQuestion(msg: string, exitOn = false, exitCode = 1, options?: IInquirerOptions): Promise<boolean> {
    const answer = await this.question(msg, options);
    if (answer === exitOn) {
      process.exit(exitCode);
    }

    return answer;
  }

  /**
   * Displays a success message
   * @param {any[] | string} msg
   * @param {number} spaces
   */
  failure(msg: any[] | string, spaces?: number) {
    this.print(`🚫 ${msg}`, 'red', spaces);
  }

  /**
   * Prompts the user for a string response
   * @param {string} msg
   * @param {string} def
   * @param filter
   * @param validate
   * @returns {Promise<string>}
   */
  async input(msg: string, options?: IInquirerOptions): Promise<string> {
    options = options || {};

    msg = options.message || msg as any;

    const answer = await prompt({
      type: 'input',
      name: 'input',
      message: msg,
      default: options.default,
      filter: options.filter,
      validate: options.validate
    });

    return answer.input;
  }

  /**
   * Magical rainbow line that extends across the screen.
   */
  lineOMagic() {
    process.stdout.write('—'.repeat(process.stdout.columns).rainbow);
    console.log();
  }

  /**
   * Magical cyan line that extends across the screen.
   */
  lineOfCyan() {
    process.stdout.write('—'.repeat(process.stdout.columns).cyan.bold);
    console.log();
  }

  /**
   * Prompts a user to select from a list of options
   * @param items
   * @param {IInquirerOptions} options
   * @returns {Promise<string>}
   */
  async list(msg: string, choices: Array<any> | InquirerChoicesFunction, options?: IInquirerOptions): Promise<string> {
    return this.baseList('list', msg, choices, options);
  }

  /**
   * Prompts a user to select from a list of expandable options
   * @param {string} msg
   * @param {Array<any> | InquirerChoicesFunction} choices
   * @param {IInquirerOptions} options
   * @returns {Promise<string>}
   */
  async listExpand(msg: string, choices: Array<any> | InquirerChoicesFunction, options?: IInquirerOptions): Promise<string> {
    return this.baseList('expand', msg, choices, options);
  }

  /**
   * Displays a message
   * @param {any[] | string} msg
   * @param {number} spaces
   */
  message(msg: any[] | string, spaces?: number) {
    this.print(msg, 'cyan', spaces);
  }

  /**
   * Prompts the user to confirm
   * @param {string} msg the message to display
   * @param {IInquirerOptions} options
   * @returns {Promise<boolean>}
   */
  async question(msg: string, options?: IInquirerOptions): Promise<boolean> {
    if (this.args.silent) {
      return Promise.resolve(true);
    }

    options = options || {};
    options.default = options.default || false;
    options.message = options.message || msg;

    const answer = await prompt({
      type: 'confirm',
      name: 'confirmation',
      message: options.message as any,
      default: options.default
    });

    return answer.confirmation;
  }

  /**
   * Displays a success message
   * @param {any[] | string} msg
   * @param {number} spaces
   */
  success(msg: any[] | string, spaces?: number) {
    this.print(`✓ ${msg}`, 'green', spaces);
  }

  /**
   * Starts a UI spinner... returns a reference to the spinner which has two methods:
   * `stop()`, which stops the spinner, or `message(msg)` which updates the spinner with a message.
   * @param {string} msg
   * @returns {{message: ((msg: string) => void); stop: (() => void)}}
   */
  spinner(msg: string): { message: (msg: string) => void; stop: () => void } {
    const Spinner = clui.Spinner;
    const spinner = new Spinner(msg);
    spinner.start();
    return spinner;
  }

  /**
   * Displays a warning message
   * @param {any[] | string} msg
   * @param {number} spaces
   */
  warn(msg: any[] | string, spaces?: number) {
    this.print(msg, 'yellow', spaces);
  }

  private async baseList(type: 'list' | 'expand', msg: string, choices: Array<any> | InquirerChoicesFunction, options?: IInquirerOptions): Promise<string> {
    options = options || {};

    msg = options.message || msg as any;

    const answer = await prompt({
      type: type,
      name: 'selection',
      message: msg,
      choices: choices,
      default: options.default
    } as any);

    return answer.selection;
  }

  private print(msg: any[] | string, color: string, spaces?: number) {

    if (spaces) {
      process.stdout.write(' '.repeat(spaces));
    }

    if (!Array.isArray(msg)) {
      msg = [msg];
    }

    msg[0] = `${msg[0]}`[color];

    console.log((msg as Array<any>).shift(), ...msg);
  }

}
