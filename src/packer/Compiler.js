"use strict";
var ts = require("typescript-plus");
var sorting = require("./Sorting");
var utils = require("./Utils");
function emitModule(moduleConfig, compilerOptions, errors) {
    compilerOptions.outFile = moduleConfig.outFile;
    compilerOptions.declaration = moduleConfig.declaration;
    var fileNames = moduleConfig.fileNames;
    var program = ts.createProgram(fileNames, compilerOptions);
    var sortedFileNames = [];
    if (fileNames.length > 1) {
        var sortResult = sorting.sortFiles(program.getSourceFiles(), program.getTypeChecker());
        if (sortResult.circularReferences.length > 0) {
            ts.sys.write("error: circular references in '" + moduleConfig.name + "' :" + ts.sys.newLine);
            ts.sys.write("    at " + sortResult.circularReferences.join(ts.sys.newLine + "    at ") +
                ts.sys.newLine + "    at ..." + ts.sys.newLine);
            ts.sys.exit(1);
            return;
        }
        var sourceFiles_1 = program.getSourceFiles();
        var rootFileNames_1 = program.getRootFileNames();
        sourceFiles_1.length = 0;
        rootFileNames_1.length = 0;
        sortResult.sortedFiles.forEach(function (sourceFile) {
            sourceFiles_1.push(sourceFile);
            rootFileNames_1.push(sourceFile.fileName);
            if (!sourceFile.isDeclarationFile) {
                sortedFileNames.push(sourceFile.fileName);
            }
        });
    }
    else if (fileNames.length == 1) {
        var sourceFile = program.getSourceFile(fileNames[0]);
        if (!sourceFile.isDeclarationFile) {
            sortedFileNames.push(sourceFile.fileName);
        }
    }
    var emitResult = program.emit();
    var diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(function (diagnostic) {
            errors.push(utils.formatDiagnostics([diagnostic]));
        });
    }
    return sortedFileNames;
}
exports.emitModule = emitModule;
