"use strict";
var path = require("path");
var fs = require("fs");
var ts = require("typescript");
var Sorting = require("./Sorting");
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
    compilerOptions.module = ts.ModuleKind.None;
    var packerOptions = convertPackerOptionsFromJson(configObject["packerOptions"], baseDir);
    var modules = configObject["modules"];
    formatModules(modules, packerOptions, compilerOptions);
    sortOnDependency(modules);
    modules.forEach(function (moduleConfig) {
        emitModule(moduleConfig, packerOptions, compilerOptions);
    });
    removeDeclarations(modules);
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
function formatModules(moduleConfigs, packerOptions, compilerOptions) {
    var tsdMap = {};
    moduleConfigs.forEach(function (moduleConfig) {
        if (moduleConfig.declaration === undefined) {
            moduleConfig.declaration = !!compilerOptions.declaration;
        }
        tsdMap[moduleConfig.name] = moduleConfig;
    });
    moduleConfigs.forEach(function (moduleConfig) {
        var outFile = moduleConfig.outFile = getModuleFileName(moduleConfig, packerOptions);
        if (outFile.substr(outFile.length - 3).toLowerCase() == ".js") {
            outFile = outFile.substr(0, outFile.length - 3);
        }
        moduleConfig.declarationFileName = outFile + ".d.ts";
        if (isArray(moduleConfig.dependencies)) {
            var dependencies = moduleConfig.dependencies;
            moduleConfig.dependentModules = [];
            for (var i = 0; i < dependencies.length; i++) {
                var config = tsdMap[dependencies[i]];
                if (!config) {
                    ts.sys.write("error tspack.json: Could not find the name of dependency: " + dependencies[i] + ts.sys.newLine);
                    ts.sys.exit(1);
                }
                moduleConfig.dependentModules.push(config);
                config.hasSubModule = true;
            }
        }
    });
}
function isArray(value) {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}
function emitModule(moduleConfig, packerOptions, compilerOptions) {
    compilerOptions.outFile = moduleConfig.outFile;
    compilerOptions.declaration = moduleConfig.declaration || !!moduleConfig.hasSubModule;
    var fileNames = getFileNames(moduleConfig, packerOptions.projectDir);
    var program = ts.createProgram(fileNames, compilerOptions);
    if (fileNames.length > 1) {
        var sortResult = Sorting.sortFiles(program.getSourceFiles(), program.getTypeChecker());
        if (sortResult.circularReferences.length > 0) {
            ts.sys.write("error: circular reference at" + ts.sys.newLine);
            ts.sys.write("    " + sortResult.circularReferences.join(ts.sys.newLine + "    ") +
                ts.sys.newLine + "    ..." + ts.sys.newLine);
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
        });
        console.log("module " + moduleConfig.name + " :\n");
        console.log(rootFileNames_1.join("\n") + "\n");
    }
    var emitResult = program.emit();
    var diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(function (diagnostic) {
            ts.sys.write(ts.formatDiagnostics([diagnostic], defaultFormatDiagnosticsHost));
        });
        var exitCode = emitResult.emitSkipped ? 1 : 0;
        ts.sys.exit(exitCode);
    }
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
    if (moduleConfig.dependentModules) {
        var declarations_1 = [];
        moduleConfig.dependentModules.forEach(function (config) {
            declarations_1.push(config.declarationFileName);
        });
        fileNames = declarations_1.concat(fileNames);
    }
    return fileNames;
}
function removeDeclarations(modules) {
    modules.forEach(function (moduleConfig) {
        if (!moduleConfig.declaration && moduleConfig.hasSubModule) {
            var fileName = moduleConfig.declarationFileName;
            if (ts.sys.fileExists(fileName)) {
                try {
                    fs.unlinkSync(fileName);
                }
                catch (e) {
                }
            }
        }
    });
}
function sortOnDependency(modules) {
    var dependencyMap = {};
    for (var _i = 0, modules_1 = modules; _i < modules_1.length; _i++) {
        var module_1 = modules_1[_i];
        dependencyMap[module_1.name] = module_1.dependencies;
    }
    var moduleWeightMap = {};
    for (var _a = 0, modules_2 = modules; _a < modules_2.length; _a++) {
        var module_2 = modules_2[_a];
        var moduleName = module_2.name;
        var references = updateModuleWeight(moduleName, 0, moduleWeightMap, dependencyMap, [moduleName]);
        if (references) {
            ts.sys.write("error tspack.json : circular reference of module at" + ts.sys.newLine);
            ts.sys.write("    " + references.join(ts.sys.newLine + "    ") +
                ts.sys.newLine + "    ..." + ts.sys.newLine);
            ts.sys.exit(1);
            return;
        }
    }
    modules.sort(function (a, b) {
        return moduleWeightMap[b.name] - moduleWeightMap[a.name];
    });
}
function updateModuleWeight(moduleName, weight, moduleWeightMap, dependencyMap, references) {
    if (moduleWeightMap[moduleName] === undefined) {
        moduleWeightMap[moduleName] = weight;
    }
    else {
        if (moduleWeightMap[moduleName] < weight) {
            moduleWeightMap[moduleName] = weight;
        }
        else {
            return null;
        }
    }
    var list = dependencyMap[moduleName];
    if (!list) {
        return null;
    }
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
        var parentPath = list_1[_i];
        if (references.indexOf(parentPath) != -1) {
            references.push(parentPath);
            return references;
        }
        var result = updateModuleWeight(parentPath, weight + 1, moduleWeightMap, dependencyMap, references.concat(parentPath));
        if (result) {
            return result;
        }
    }
    return null;
}
run(ts.sys.args);
