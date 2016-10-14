"use strict";
var ts = require("typescript-plus");
var utils = require("./Utils");
function emitModule(moduleConfig, compilerOptions, errors) {
    if (moduleConfig.name) {
        compilerOptions.module = ts.ModuleKind.None;
        compilerOptions.outFile = moduleConfig.outFile;
        compilerOptions.declaration = moduleConfig.declaration;
    }
    var fileNames = moduleConfig.fileNames;
    var program = ts.createProgram(fileNames, compilerOptions);
    var sortResult = ts.reorderSourceFiles(program);
    if (sortResult.circularReferences.length > 0) {
        var error = "";
        error += "error: circular references in '" + moduleConfig.name + "' :" + ts.sys.newLine;
        error += "    at " + sortResult.circularReferences.join(ts.sys.newLine + "    at ") + ts.sys.newLine + "    at ...";
        return sortResult.sortedFileNames;
    }
    var emitResult = program.emit();
    var diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(function (diagnostic) {
            errors.push(utils.formatDiagnostics([diagnostic]));
        });
    }
    return sortResult.sortedFileNames;
}
exports.emitModule = emitModule;
