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
import * as utils from "./Utils";


export function emitModule(moduleConfig:config.ModuleConfig, compilerOptions:ts.CompilerOptions, errors:string[]):string[] {
    if (moduleConfig.name) {
        compilerOptions.module = ts.ModuleKind.None;
        compilerOptions.outFile = moduleConfig.outFile;
        compilerOptions.declaration = moduleConfig.declaration;
    }
    let fileNames = moduleConfig.fileNames;
    let program = ts.createProgram(fileNames, compilerOptions);

    let sortResult = ts.reorderSourceFiles(program);
    if (sortResult.circularReferences.length > 0) {
        let error:string = "";
        error += "error: circular references in '" + moduleConfig.name + "' :" + ts.sys.newLine;
        error += "    at " + sortResult.circularReferences.join(ts.sys.newLine + "    at ") + ts.sys.newLine + "    at ...";
        return sortResult.sortedFileNames;
    }

    let emitResult = program.emit();
    let diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            errors.push(utils.formatDiagnostics([diagnostic]));
        });
    }
    return sortResult.sortedFileNames;
}