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

import * as path from "path";
import * as fs from "fs";
import * as ts from "typescript-plus";
import * as sorting from "./Sorting";
import * as config from "./Config";
import * as utils from "./Utils";

function run(args:string[]):void {
    let searchPath = ts.sys.getCurrentDirectory();
    let configFileName = config.findConfigFile(searchPath);
    let jsonResult = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName));
    const configObject = jsonResult.config;
    if (!configObject) {
        ts.sys.write(utils.formatDiagnostics([jsonResult.error]));
        ts.sys.exit(1);
        return;
    }
    let baseDir = path.dirname(configFileName);
    let result = config.parseOptionsFromJson(configObject, baseDir, configFileName);
    if (result.errors.length > 0) {
        ts.sys.write(result.errors.join(ts.sys.newLine));
        ts.sys.exit(1);
        return;
    }

    result.modules.forEach(moduleConfig=> {
        emitModule(moduleConfig, result.packerOptions, result.compilerOptions);
    });
}


function emitModule(moduleConfig:config.ModuleConfig, packerOptions:config.PackerOptions, compilerOptions:ts.CompilerOptions):void {
    compilerOptions.outFile = moduleConfig.outFile;
    compilerOptions.declaration = moduleConfig.declaration;
    let fileNames = moduleConfig.fileNames;
    let program = ts.createProgram(fileNames, compilerOptions);

    if (fileNames.length > 1) {
        let sortResult = sorting.sortFiles(program.getSourceFiles(), program.getTypeChecker())
        if (sortResult.circularReferences.length > 0) {
            ts.sys.write("error: circular references in '" + moduleConfig.name + "' :" + ts.sys.newLine);
            ts.sys.write("    at " + sortResult.circularReferences.join(ts.sys.newLine + "    at ") +
                ts.sys.newLine + "    at ..." + ts.sys.newLine);
            ts.sys.exit(1);
            return;
        }
        // apply the sorting result.
        let sourceFiles = program.getSourceFiles();
        let rootFileNames = program.getRootFileNames();
        sourceFiles.length = 0;
        rootFileNames.length = 0;
        let sortedFileNames:string[] = [];
        sortResult.sortedFiles.forEach(sourceFile=> {
            sourceFiles.push(sourceFile);
            rootFileNames.push(sourceFile.fileName);
            if (!sourceFile.isDeclarationFile) {
                sortedFileNames.push(sourceFile.fileName);
            }
        });
        if (packerOptions.listSortedFiles) {
            console.log("sorted files of '" + moduleConfig.name + "' :");
            console.log("    " + sortedFileNames.join(ts.sys.newLine + "    ") + ts.sys.newLine);
        }

    }

    let emitResult = program.emit();
    let diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            ts.sys.write(utils.formatDiagnostics([diagnostic]));
        });
        let exitCode = emitResult.emitSkipped ? 1 : 0;
        ts.sys.exit(exitCode);
    }
}

run(ts.sys.args);