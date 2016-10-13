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
import * as utils from "./Utils";

export interface PackerOptions {
    outDir?:string;
    listSortedFiles?:boolean;
    /* @internal */
    projectDir?:string;
}

export interface ModuleConfig {
    name?:string;
    baseDir?:string;
    outFile?:string;
    declaration?:boolean;
    files?:string[];
    include?:string[];
    exclude?:string[];
    dependencies?:string[];
    /* @internal */
    declarationFileName?:string;
    /* @internal */
    dependentModules?:ModuleConfig[];
    /* @internal */
    fileNames?:string[];
}

export interface OptionsResult {
    compilerOptions?:ts.CompilerOptions;
    packerOptions?:PackerOptions;
    modules?:ModuleConfig[];
    errors?:string[];
}

export function findConfigFile(searchPath:string):string {
    while (true) {
        let fileName = path.join(searchPath, "tspack.json");
        if (ts.sys.fileExists(fileName)) {
            return fileName;
        }
        let parentPath = path.dirname(searchPath);
        if (parentPath === searchPath) {
            break;
        }
        searchPath = parentPath;
    }
    return undefined;
}

export function parseOptionsFromJson(jsonOptions:any, basePath:string, configFileName?:string):OptionsResult {
    let result:OptionsResult = {};
    result.errors = [];
    let compilerResult = ts.convertCompilerOptionsFromJson(jsonOptions["compilerOptions"], basePath, configFileName);
    if (compilerResult.errors.length > 0) {
        result.errors.push(utils.formatDiagnostics(compilerResult.errors));
        return result;
    }
    let compilerOptions = compilerResult.options;
    compilerOptions.module = ts.ModuleKind.None;
    result.compilerOptions = compilerOptions;
    let packerOptions = convertPackerOptionsFromJson(jsonOptions["packerOptions"], basePath);
    result.packerOptions = packerOptions;
    let modules:ModuleConfig[] = jsonOptions["modules"];
    formatModules(modules, packerOptions, compilerOptions, result.errors);
    sortOnDependency(modules, result.errors);
    modules.forEach(moduleConfig=> {
        moduleConfig.fileNames = getFileNames(moduleConfig, packerOptions.projectDir, result.errors);
    });
    result.modules = modules;
    return result;
}

function getModuleFileName(moduleConfig:ModuleConfig, packerOptions:PackerOptions):string {
    if (moduleConfig.outFile) {
        let baseDir = packerOptions.projectDir;
        if (moduleConfig.baseDir) {
            baseDir = path.join(baseDir, moduleConfig.baseDir);
        }
        return path.join(baseDir, moduleConfig.outFile);
    }
    let outDir:string = packerOptions.outDir ? packerOptions.outDir : packerOptions.projectDir;
    return path.join(outDir, moduleConfig.name + ".js");
}


function convertPackerOptionsFromJson(json:any, baseDir:string):PackerOptions {
    if (!json) {
        json = {};
    }
    let options:PackerOptions = json;
    options.projectDir = baseDir;
    if (options.outDir) {
        options.outDir = path.join(baseDir, options.outDir);
    }
    return options;
}

function formatModules(moduleConfigs:ModuleConfig[], packerOptions:PackerOptions,
                       compilerOptions:ts.CompilerOptions, errors:string[]):void {
    let tsdMap:{[key:string]:ModuleConfig} = {};
    moduleConfigs.forEach(moduleConfig=> {
        if (moduleConfig.declaration === undefined) {
            moduleConfig.declaration = !!compilerOptions.declaration;
        }
        tsdMap[moduleConfig.name] = moduleConfig;
    });
    moduleConfigs.forEach(moduleConfig=> {
        let outFile = moduleConfig.outFile = getModuleFileName(moduleConfig, packerOptions);
        if (outFile.substr(outFile.length - 3).toLowerCase() == ".js") {
            outFile = outFile.substr(0, outFile.length - 3);
        }
        moduleConfig.declarationFileName = outFile + ".d.ts";
        if (isArray(moduleConfig.dependencies)) {
            let dependencies = moduleConfig.dependencies;
            moduleConfig.dependentModules = [];
            for (let i = 0; i < dependencies.length; i++) {
                let config = tsdMap[dependencies[i]];
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

function isArray(value:any):value is any[] {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}


function getFileNames(moduleConfig:ModuleConfig, baseDir:string, errors:string[]):string[] {
    if (moduleConfig.baseDir) {
        baseDir = path.join(baseDir, moduleConfig.baseDir);
    }
    let optionResult = ts.parseJsonConfigFileContent(moduleConfig, ts.sys, baseDir);
    if (optionResult.errors.length > 0) {
        errors.push(utils.formatDiagnostics(optionResult.errors));
        return [];
    }
    let fileNames = optionResult.fileNames;
    if (moduleConfig.dependentModules) {
        let declarations:string[] = [];
        moduleConfig.dependentModules.forEach(config=> {
            declarations.push(config.declarationFileName);
        });
        fileNames = declarations.concat(fileNames);
    }
    return fileNames;
}


function sortOnDependency(modules:ModuleConfig[], errors:string[]):void {
    let dependencyMap:{[key:string]:string[]} = {};
    for (let module of modules) {
        dependencyMap[module.name] = module.dependencies;
    }
    let moduleWeightMap:{[key:string]:number} = {};
    for (let module of modules) {
        let moduleName = module.name;
        let references = updateModuleWeight(moduleName, 0, moduleWeightMap, dependencyMap, [moduleName]);
        if (references) {
            let errorText = "error : circular references in module dependencies configuration :" + ts.sys.newLine;
            errorText += "    at " + references.join(ts.sys.newLine + "    at ") + ts.sys.newLine + "    at ...";
            errors.push(errorText);
            return;
        }
    }
    modules.sort(function (a:ModuleConfig, b:ModuleConfig):number {
        return moduleWeightMap[b.name] - moduleWeightMap[a.name];
    });
}

function updateModuleWeight(moduleName:string, weight:number, moduleWeightMap:any, dependencyMap:any, references:string[]):string[] {
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
    let list = dependencyMap[moduleName];
    if (!list) {
        return null;
    }
    for (let parentPath of list) {
        if (references.indexOf(parentPath) != -1) {
            references.push(parentPath);
            return references;
        }
        let result = updateModuleWeight(parentPath, weight + 1, moduleWeightMap, dependencyMap, references.concat(parentPath));
        if (result) {
            return result;
        }
    }
    return null;
}