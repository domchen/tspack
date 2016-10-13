"use strict";
var path = require("path");
var ts = require("typescript-plus");
var utils = require("./Utils");
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
    return "";
}
exports.findConfigFile = findConfigFile;
function parseOptionsFromFile(configFileName) {
    var jsonResult = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName));
    var configObject = jsonResult.config;
    if (!configObject) {
        var result = {};
        result.errors = [utils.formatDiagnostics([jsonResult.error])];
        return result;
    }
    var baseDir = path.dirname(configFileName);
    return parseOptionsFromJson(configObject, baseDir, configFileName);
}
exports.parseOptionsFromFile = parseOptionsFromFile;
function parseOptionsFromJson(jsonOptions, basePath, configFileName) {
    var result = {};
    result.errors = [];
    var compilerResult = ts.convertCompilerOptionsFromJson(jsonOptions["compilerOptions"], basePath, configFileName);
    if (compilerResult.errors.length > 0) {
        result.errors.push(utils.formatDiagnostics(compilerResult.errors));
        return result;
    }
    var compilerOptions = compilerResult.options;
    compilerOptions.module = ts.ModuleKind.None;
    result.compilerOptions = compilerOptions;
    var packerOptions = convertPackerOptionsFromJson(jsonOptions["packerOptions"], basePath);
    result.packerOptions = packerOptions;
    var modules = jsonOptions["modules"];
    formatModules(modules, packerOptions, compilerOptions, result.errors);
    sortOnDependency(modules, result.errors);
    modules.forEach(function (moduleConfig) {
        moduleConfig.fileNames = getFileNames(moduleConfig, packerOptions.projectDir, result.errors);
    });
    result.modules = modules;
    return result;
}
exports.parseOptionsFromJson = parseOptionsFromJson;
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
function convertPackerOptionsFromJson(json, baseDir) {
    if (!json) {
        json = {};
    }
    var options = json;
    options.projectDir = baseDir;
    if (options.outDir) {
        options.outDir = path.join(baseDir, options.outDir);
    }
    return options;
}
function formatModules(moduleConfigs, packerOptions, compilerOptions, errors) {
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
                    errors.push("error : could not find the name of module dependency : " + dependencies[i]);
                    continue;
                }
                moduleConfig.dependentModules.push(config);
                config.declaration = true;
            }
        }
    });
}
function isArray(value) {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}
function getFileNames(moduleConfig, baseDir, errors) {
    if (moduleConfig.baseDir) {
        baseDir = path.join(baseDir, moduleConfig.baseDir);
    }
    var optionResult = ts.parseJsonConfigFileContent(moduleConfig, ts.sys, baseDir);
    if (optionResult.errors.length > 0) {
        errors.push(utils.formatDiagnostics(optionResult.errors));
        return [];
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
function sortOnDependency(modules, errors) {
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
            var errorText = "error : circular references in module dependencies configuration :" + ts.sys.newLine;
            errorText += "    at " + references.join(ts.sys.newLine + "    at ") + ts.sys.newLine + "    at ...";
            errors.push(errorText);
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
