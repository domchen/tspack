"use strict";
var path = require("path");
var ts = require("typescript-plus");
var sorting = require("./Sorting");
var config = require("./Config");
var utils = require("./Utils");
function run(args) {
    var searchPath = ts.sys.getCurrentDirectory();
    var configFileName = config.findConfigFile(searchPath);
    var jsonResult = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName));
    var configObject = jsonResult.config;
    if (!configObject) {
        ts.sys.write(utils.formatDiagnostics([jsonResult.error]));
        ts.sys.exit(1);
        return;
    }
    var baseDir = path.dirname(configFileName);
    var result = config.parseOptionsFromJson(configObject, baseDir, configFileName);
    if (result.errors.length > 0) {
        ts.sys.write(result.errors.join(ts.sys.newLine));
        ts.sys.exit(1);
        return;
    }
    result.modules.forEach(function (moduleConfig) {
        emitModule(moduleConfig, result.packerOptions, result.compilerOptions);
    });
}
function emitModule(moduleConfig, packerOptions, compilerOptions) {
    compilerOptions.outFile = moduleConfig.outFile;
    compilerOptions.declaration = moduleConfig.declaration;
    var fileNames = moduleConfig.fileNames;
    var program = ts.createProgram(fileNames, compilerOptions);
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
        var sortedFileNames_1 = [];
        sortResult.sortedFiles.forEach(function (sourceFile) {
            sourceFiles_1.push(sourceFile);
            rootFileNames_1.push(sourceFile.fileName);
            if (!sourceFile.isDeclarationFile) {
                sortedFileNames_1.push(sourceFile.fileName);
            }
        });
        if (packerOptions.listSortedFiles) {
            console.log("sorted files of '" + moduleConfig.name + "' :");
            console.log("    " + sortedFileNames_1.join(ts.sys.newLine + "    ") + ts.sys.newLine);
        }
    }
    var emitResult = program.emit();
    var diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(function (diagnostic) {
            ts.sys.write(utils.formatDiagnostics([diagnostic]));
        });
        var exitCode = emitResult.emitSkipped ? 1 : 0;
        ts.sys.exit(exitCode);
    }
}
run(ts.sys.args);
