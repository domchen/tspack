"use strict";
var ts = require("typescript-plus");
var config = require("./Config");
var utils = require("./Utils");
function emitModule(moduleConfig, compilerOptions, errors) {
    var options = config.getCompilerOptions(moduleConfig, compilerOptions);
    var fileNames = moduleConfig.fileNames;
    var program = ts.createProgram(fileNames, options);
    var sortResult = ts.reorderSourceFiles(program);
    if (sortResult.circularReferences.length > 0) {
        var error = "";
        error += "error: circular references in '" + moduleConfig.name + "' :" + ts.sys.newLine;
        error += "    at " + sortResult.circularReferences.join(ts.sys.newLine + "    at ") + ts.sys.newLine + "    at ...";
        errors.push(error);
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
