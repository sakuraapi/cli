export interface IArgs {
  dryRun: boolean;
  help: () => void;
  length: boolean;
  save: boolean;
  silent: boolean;
  skipDirectoryCheck: boolean;
  skipGitInit: boolean;
}
