"use strict";
var ts = require("typescript-plus");
var config = require("./Config");
var compiler = require("./Compiler");
var commandLine = require("./CommandLine");
var utils = require("./Utils");
exports.version = "2.0.4";
function run(args) {
    var commandOptions = commandLine.parse(args);
    if (commandOptions.errors.length > 0) {
        ts.sys.write(commandOptions.errors.join(ts.sys.newLine) + ts.sys.newLine);
        ts.sys.exit(1);
        return;
    }
    if (commandOptions.version) {
        printVersion();
        ts.sys.exit(0);
    }
    if (commandOptions.help) {
        printVersion();
        printHelp();
        ts.sys.exit(0);
    }
    var configFileName = "";
    if (commandOptions.project) {
        if (!commandOptions.project || ts.sys.directoryExists(commandOptions.project)) {
            configFileName = utils.joinPath(commandOptions.project, "tspack.json");
            if (!ts.sys.fileExists(configFileName)) {
                configFileName = utils.joinPath(commandOptions.project, "tsconfig.json");
            }
        }
        else {
            configFileName = commandOptions.project;
        }
        if (ts.sys.fileExists(configFileName)) {
            ts.sys.write("Cannot find a tsconfig.json file at the specified directory: " + commandOptions.project + ts.sys.newLine);
            ts.sys.exit(1);
        }
    }
    else {
        var searchPath = ts.sys.getCurrentDirectory();
        configFileName = config.findConfigFile(searchPath);
        if (!configFileName) {
            printVersion();
            printHelp();
            ts.sys.exit(0);
        }
    }
    var result = config.parseOptionsFromFile(configFileName);
    if (result.errors.length > 0) {
        ts.sys.write(result.errors.join(ts.sys.newLine) + ts.sys.newLine);
        ts.sys.exit(1);
    }
    if (commandOptions.watch) {
    }
    else {
        var errors_1 = [];
        result.modules.forEach(function (moduleConfig) {
            var sortedFileNames = compiler.emitModule(moduleConfig, result.compilerOptions, errors_1);
            if (commandOptions.listSortedFiles) {
                ts.sys.write("sorted files of '" + moduleConfig.name + "' :" + ts.sys.newLine);
                ts.sys.write("    " + sortedFileNames.join(ts.sys.newLine + "    ") + ts.sys.newLine);
            }
        });
        if (errors_1.length > 0) {
            ts.sys.write(errors_1.join(ts.sys.newLine) + ts.sys.newLine);
            ts.sys.exit(1);
        }
    }
}
function printVersion() {
    ts.sys.write("Version " + exports.version + ts.sys.newLine);
}
function printHelp() {
    var newLine = ts.sys.newLine;
    var output = "";
    output += "Syntax:   tspack [options]" + newLine + newLine;
    output += "Examples: tspack --watch" + newLine;
    output += "Examples: tspack --project /usr/local/test/" + newLine + newLine;
    output += "Options:" + newLine;
    commandLine.optionDeclarations.forEach(function (option) {
        var name = "";
        if (option.shortName) {
            name += "-" + option.shortName + ", ";
        }
        name += "--" + option.name;
        name += makePadding(25 - name.length);
        output += name + option.description + newLine;
    });
    ts.sys.write(output);
}
function makePadding(paddingLength) {
    return Array(paddingLength + 1).join(" ");
}
run(ts.sys.args);
