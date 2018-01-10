# Installing

SakuraAPI CLI helps you scaffold new projects.

`npm install -g @sakuraapi/cli`

`sapi help`

# Scaffolding a SakuraAPI project

`sapi init [dir]` where dir is the path to the directory in which you want to initialize the project.

You can also run `sapi init` within a directory and it will initialize the project there.

You can also run `sapi init` over an existing project and it will give you the option to diff changes file by file.

`sapi init` supports setting up the server without authentication, as a JWT issuer and as a JWT audience server.

# Updating outdated dependencies
Managing the never ending process of updating your `package.json` dependencies can be tedious. `sapi outdated` will take you through your list of outdated dependencies, giving you the option for each dependency to either skip it, update it to the wanted version, or updated it to the latest version. After each update, `sapi` runs your unit-tests to make sure that particular update did not break your build. It also properly saves the new version in either `dependencies` or `devDependencies` in your `package.json` file. It's still a tedious process... but hopefully a little less so.

To get help with other options for outdated, use `sapi outdated --help`. 

# Some Caution

`sapi` cli is pretty early in its development. Make sure you have a backup of your files before you use it to update an existing project.

# Bugs and requests:

Please report bugs and reports here: https://github.com/sakuraapi/cli/issues

You can get debug output. For example: `DEBUG=sapi:* sapi --help`. Replace `--help` with whatever `sapi` command you want. This might help you report more accurate bugs... it might not.

# Contribution
[![CLA assistant](https://cla-assistant.io/readme/badge/sakuraapi/cli)](https://cla-assistant.io/sakuraapi/cli)

* Sign the Contributor License Agreement (CLA)
* Fork the project; make your contribution (don't forget to write your unit-tests); do a pull request back to develop (pull updates frequently to not fall too far behind)
* Before heading off to work on something, considering collaborating first by either (1) opening an issue or (2) starting a conversation on gitter or in the Google forum that leads to back to (1)
* All work should be done against an issue (https://github.com/sakuraapi/cli/issues)
* All contributions require unit-tests
* Use the linter (npm run lint) to verify you comply with the style guide
