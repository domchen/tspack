//////////////////////////////////////////////////////////////////////////////////////
//
//  The MIT License (MIT)
//
//  Copyright (c) 2015-present, Dom Chen.
//  All rights reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy of
//  this software and associated documentation files (the "Software"), to deal in the
//  Software without restriction, including without limitation the rights to use, copy,
//  modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
//  and to permit persons to whom the Software is furnished to do so, subject to the
//  following conditions:
//
//      The above copyright notice and this permission notice shall be included in all
//      copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
//  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
//  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
//////////////////////////////////////////////////////////////////////////////////////

import * as ts from "typescript-plus";
import * as config from "./Config";
import * as compiler from "./Compiler";
import * as commandLine from "./CommandLine";
import * as utils from "./Utils";

export const version = "2.0.4";

function run(args:string[]):void {
    let commandOptions = commandLine.parse(args);
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
    let configFileName:string = "";
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
        let searchPath = ts.sys.getCurrentDirectory();
        configFileName = config.findConfigFile(searchPath);
        if (!configFileName) {
            printVersion();
            printHelp();
            ts.sys.exit(0);
        }
    }

    let result = config.parseOptionsFromFile(configFileName);
    if (result.errors.length > 0) {
        ts.sys.write(result.errors.join(ts.sys.newLine) + ts.sys.newLine);
        ts.sys.exit(1);
    }

    if (commandOptions.watch) {

    }
    else {
        let errors:string[] = [];
        result.modules.forEach(moduleConfig=> {
            let sortedFileNames = compiler.emitModule(moduleConfig, result.compilerOptions, errors);
            if (commandOptions.listSortedFiles) {
                ts.sys.write("sorted files of '" + moduleConfig.name + "' :" + ts.sys.newLine);
                ts.sys.write("    " + sortedFileNames.join(ts.sys.newLine + "    ") + ts.sys.newLine);
            }
        });
        if (errors.length > 0) {
            ts.sys.write(errors.join(ts.sys.newLine) + ts.sys.newLine);
            ts.sys.exit(1);
        }
    }
}

function printVersion():void {
    ts.sys.write("Version " + version + ts.sys.newLine);
}

function printHelp():void {
    const newLine = ts.sys.newLine;
    let output = "";
    output += "Syntax:   tspack [options]" + newLine + newLine;
    output += "Examples: tspack --watch" + newLine;
    output += "Examples: tspack --project /usr/local/test/" + newLine + newLine;
    output += "Options:" + newLine;
    commandLine.optionDeclarations.forEach(option=> {
        let name = "";
        if (option.shortName) {
            name += "-" + option.shortName + ", ";
        }
        name += "--" + option.name;
        name += makePadding(25 - name.length);
        output += name + option.description + newLine;
    });
    ts.sys.write(output);
}

function makePadding(paddingLength:number):string {
    return Array(paddingLength + 1).join(" ");
}

run(ts.sys.args);