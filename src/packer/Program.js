"use strict";
var path = require("path");
var ts = require("typescript");
var defaultFormatDiagnosticsHost = {
    getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
    getNewLine: function () { return ts.sys.newLine; },
    getCanonicalFileName: createGetCanonicalFileName(ts.sys.useCaseSensitiveFileNames)
};
function createGetCanonicalFileName(useCaseSensitivefileNames) {
    return useCaseSensitivefileNames
        ? (function (fileName) { return fileName; })
        : (function (fileName) { return fileName.toLowerCase(); });
}
function run(args) {
    var searchPath = ts.sys.getCurrentDirectory();
    var configFileName = findConfigFile(searchPath);
    var result = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName));
    var configObject = result.config;
    if (!configObject) {
        ts.sys.write(ts.formatDiagnostics([result.error], defaultFormatDiagnosticsHost));
        ts.sys.exit(1);
        return;
    }
    var baseDir = path.dirname(configFileName);
    var optionResult = ts.convertCompilerOptionsFromJson(configObject["compilerOptions"], baseDir, configFileName);
    if (optionResult.errors.length > 0) {
        ts.sys.write(ts.formatDiagnostics(optionResult.errors, defaultFormatDiagnosticsHost));
        ts.sys.exit(1);
        return;
    }
    var compilerOptions = optionResult.options;
    compilerOptions.declaration = true;
    compilerOptions.module = ts.ModuleKind.None;
    var packerOptions = convertPackerOptionsFromJson(configObject["packerOptions"], baseDir);
    var modules = configObject["modules"];
    formatDependencies(modules, packerOptions);
    modules.forEach(function (moduleConfig) {
        compileModule(moduleConfig, packerOptions, compilerOptions);
    });
}
function getModuleFileName(moduleConfig, packerOptions) {
    if (moduleConfig.outFile) {
        var baseDir = packerOptions.projectDir;
        if (moduleConfig.baseDir) {
            baseDir = path.join(baseDir, moduleConfig.baseDir);
        }
        return path.join(baseDir, moduleConfig.outFile);
    }
    var outDir = packerOptions.outDir ? packerOptions.outDir : packerOptions.projectDir;
    return path.join(outDir, moduleConfig.name + ".js");
}
function findConfigFile(searchPath) {
    while (true) {
        var fileName = path.join(searchPath, "tspack.json");
        if (ts.sys.fileExists(fileName)) {
            return fileName;
        }
        var parentPath = path.dirname(searchPath);
        if (parentPath === searchPath) {
            break;
        }
        searchPath = parentPath;
    }
    return undefined;
}
function convertPackerOptionsFromJson(json, baseDir) {
    var options = {};
    options.projectDir = baseDir;
    if (!json) {
        return options;
    }
    if (json["outDir"]) {
        options.outDir = json["outDir"];
        options.outDir = path.join(baseDir, options.outDir);
    }
    return options;
}
function formatDependencies(moduleConfigs, packerOptions) {
    var tsdMap = {};
    moduleConfigs.forEach(function (moduleConfig) {
        var outFile = moduleConfig.outFile = getModuleFileName(moduleConfig, packerOptions);
        if (outFile.substr(outFile.length - 3).toLowerCase() == ".js") {
            outFile = outFile.substr(0, outFile.length - 3);
        }
        tsdMap[moduleConfig.name] = outFile + ".d.ts";
    });
    moduleConfigs.forEach(function (moduleConfig) {
        if (isArray(moduleConfig.dependencies)) {
            var dependencies = moduleConfig.dependencies;
            for (var i = 0; i < dependencies.length; i++) {
                var tsd = tsdMap[dependencies[i]];
                if (!tsd) {
                    ts.sys.write("error tspack.json: Could not find the name of dependency: " + dependencies[i] + ts.sys.newLine);
                    ts.sys.exit(1);
                }
                dependencies[i] = tsd;
            }
        }
        else {
            moduleConfig.dependencies = [];
        }
    });
}
function isArray(value) {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}
function compileModule(moduleConfig, packerOptions, compilerOptions) {
    compilerOptions.outFile = moduleConfig.outFile;
    var fileNames = getFileNames(moduleConfig, packerOptions.projectDir);
    var program = ts.createProgram(fileNames, compilerOptions);
    var emitResult = program.emit();
    var allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (allDiagnostics.length == 0) {
        return;
    }
    allDiagnostics.forEach(function (diagnostic) {
        ts.sys.write(ts.formatDiagnostics([diagnostic], defaultFormatDiagnosticsHost));
    });
    var exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log("Process exiting with code '" + exitCode + "'.");
    process.exit(exitCode);
}
function getFileNames(moduleConfig, baseDir) {
    if (moduleConfig.baseDir) {
        baseDir = path.join(baseDir, moduleConfig.baseDir);
    }
    var optionResult = ts.parseJsonConfigFileContent(moduleConfig, ts.sys, baseDir);
    if (optionResult.errors.length > 0) {
        ts.sys.write(ts.formatDiagnostics(optionResult.errors, defaultFormatDiagnosticsHost));
        ts.sys.exit(1);
        return;
    }
    var fileNames = optionResult.fileNames;
    if (moduleConfig.dependencies) {
        fileNames = fileNames.concat(moduleConfig.dependencies);
    }
    return fileNames;
}
run(ts.sys.args);
