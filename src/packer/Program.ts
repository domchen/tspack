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

function run(args:string[]):void {
    let searchPath = ts.sys.getCurrentDirectory();
    let configFileName = config.findConfigFile(searchPath);
    if (!configFileName) {

        return;
    }
    let result = config.parseOptionsFromFile(configFileName);
    if (result.errors.length > 0) {
        ts.sys.write(result.errors.join(ts.sys.newLine));
        ts.sys.exit(1);
        return;
    }

    var errors:string[] = [];
    result.modules.forEach(moduleConfig=> {
        let sortedFileNames = compiler.emitModule(moduleConfig, result.compilerOptions, errors);
        if (result.packerOptions.listSortedFiles) {
            ts.sys.write("sorted files of '" + moduleConfig.name + "' :" + ts.sys.newLine);
            ts.sys.write("    " + sortedFileNames.join(ts.sys.newLine + "    ") + ts.sys.newLine);
        }
    });
}


run(ts.sys.args);