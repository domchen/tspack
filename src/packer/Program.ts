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
import * as Sorting from "./Sorting";

const defaultFormatDiagnosticsHost:ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getNewLine: () => ts.sys.newLine,
    getCanonicalFileName: createGetCanonicalFileName(ts.sys.useCaseSensitiveFileNames)
};

function createGetCanonicalFileName(useCaseSensitivefileNames:boolean):(fileName:string) => string {
    return useCaseSensitivefileNames
        ? ((fileName) => fileName)
        : ((fileName) => fileName.toLowerCase());
}

function run(args:string[]):void {
    let searchPath = ts.sys.getCurrentDirectory();
    let configFileName = findConfigFile(searchPath);
    let result = ts.parseConfigFileTextToJson(configFileName, ts.sys.readFile(configFileName));
    const configObject = result.config;
    if (!configObject) {
        ts.sys.write(ts.formatDiagnostics([result.error], defaultFormatDiagnosticsHost));
        ts.sys.exit(1);
        return;
    }
    let baseDir = path.dirname(configFileName);
    let optionResult = ts.convertCompilerOptionsFromJson(configObject["compilerOptions"], baseDir, configFileName);
    if (optionResult.errors.length > 0) {
        ts.sys.write(ts.formatDiagnostics(optionResult.errors, defaultFormatDiagnosticsHost));
        ts.sys.exit(1);
        return;
    }
    let compilerOptions = optionResult.options;
    compilerOptions.module = ts.ModuleKind.None;
    let packerOptions = convertPackerOptionsFromJson(configObject["packerOptions"], baseDir);
    let modules:tspack.ModuleConfig[] = configObject["modules"];
    formatModules(modules, packerOptions, compilerOptions);
    sortOnDependency(modules);
    modules.forEach(moduleConfig=> {
        emitModule(moduleConfig, packerOptions, compilerOptions);
    });
    removeDeclarations(modules);
}

function getModuleFileName(moduleConfig:tspack.ModuleConfig, packerOptions:tspack.PackerOptions):string {
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

function findConfigFile(searchPath:string):string {
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

function convertPackerOptionsFromJson(json:any, baseDir:string):tspack.PackerOptions {
    if (!json) {
        json = {};
    }
    let options:tspack.PackerOptions = json;
    options.projectDir = baseDir;
    if (options.outDir) {
        options.outDir = path.join(baseDir, options.outDir);
    }
    return options;
}

function formatModules(moduleConfigs:tspack.ModuleConfig[], packerOptions:tspack.PackerOptions,
                       compilerOptions:ts.CompilerOptions):void {
    var tsdMap:{[key:string]:tspack.ModuleConfig} = {};
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
                    ts.sys.write("error : could not find the name of module dependency : " + dependencies[i] + ts.sys.newLine);
                    ts.sys.exit(1);
                }
                moduleConfig.dependentModules.push(config);
                config.hasSubModule = true;
            }
        }
    });
}

function isArray(value:any):value is any[] {
    return Array.isArray ? Array.isArray(value) : value instanceof Array;
}

function emitModule(moduleConfig:tspack.ModuleConfig, packerOptions:tspack.PackerOptions, compilerOptions:ts.CompilerOptions):void {
    compilerOptions.outFile = moduleConfig.outFile;
    compilerOptions.declaration = moduleConfig.declaration || !!moduleConfig.hasSubModule;
    let fileNames = getFileNames(moduleConfig, packerOptions.projectDir);
    let program = ts.createProgram(fileNames, compilerOptions);

    if (fileNames.length > 1) {
        let sortResult = Sorting.sortFiles(program.getSourceFiles(), program.getTypeChecker())
        if (sortResult.circularReferences.length > 0) {
            ts.sys.write("error: circular references in '" + moduleConfig.name + "' :" + ts.sys.newLine);
            ts.sys.write("    at " + sortResult.circularReferences.join(ts.sys.newLine + "    at ") +
                ts.sys.newLine + "    at ..." + ts.sys.newLine);
            ts.sys.exit(1);
            return;
        }
        // apply the sorting result.
        let sourceFiles = program.getSourceFiles();
        let rootFileNames = program.getRootFileNames();
        sourceFiles.length = 0;
        rootFileNames.length = 0;
        let sortedFileNames:string[] = [];
        sortResult.sortedFiles.forEach(sourceFile=> {
            sourceFiles.push(sourceFile);
            rootFileNames.push(sourceFile.fileName);
            if (!sourceFile.isDeclarationFile) {
                sortedFileNames.push(sourceFile.fileName);
            }
        });
        if (packerOptions.listSortedFiles) {
            console.log("sorted files of '" + moduleConfig.name + "' :");
            console.log("    " + sortedFileNames.join(ts.sys.newLine + "    ") + ts.sys.newLine);
        }

    }

    let emitResult = program.emit();
    let diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            ts.sys.write(ts.formatDiagnostics([diagnostic], defaultFormatDiagnosticsHost));
        });
        let exitCode = emitResult.emitSkipped ? 1 : 0;
        ts.sys.exit(exitCode);
    }
}

function getFileNames(moduleConfig:tspack.ModuleConfig, baseDir):string[] {
    if (moduleConfig.baseDir) {
        baseDir = path.join(baseDir, moduleConfig.baseDir);
    }
    let optionResult = ts.parseJsonConfigFileContent(moduleConfig, ts.sys, baseDir);
    if (optionResult.errors.length > 0) {
        ts.sys.write(ts.formatDiagnostics(optionResult.errors, defaultFormatDiagnosticsHost));
        ts.sys.exit(1);
        return;
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

function removeDeclarations(modules:tspack.ModuleConfig[]):void {
    modules.forEach(moduleConfig=> {
        if (!moduleConfig.declaration && moduleConfig.hasSubModule) {
            let fileName = moduleConfig.declarationFileName;
            if (ts.sys.fileExists(fileName)) {
                try {
                    fs.unlinkSync(fileName);
                }
                catch (e) {
                }
            }
        }
    })
}


function sortOnDependency(modules:tspack.ModuleConfig[]):void {
    let dependencyMap:{[key:string]:string[]} = {};
    for (let module of modules) {
        dependencyMap[module.name] = module.dependencies;
    }
    let moduleWeightMap:{[key:string]:number} = {};
    for (let module of modules) {
        let moduleName = module.name;
        let references = updateModuleWeight(moduleName, 0, moduleWeightMap, dependencyMap, [moduleName]);
        if (references) {
            ts.sys.write("error : circular references in module dependencies configuration :" + ts.sys.newLine);
            ts.sys.write("    at " + references.join(ts.sys.newLine + "    at ") +
                ts.sys.newLine + "    at ..." + ts.sys.newLine);
            ts.sys.exit(1);
            return;
        }
    }
    modules.sort(function (a:tspack.ModuleConfig, b:tspack.ModuleConfig):number {
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

run(ts.sys.args);