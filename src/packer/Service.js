"use strict";
var fs = require("fs");
var ts = require("typescript-plus");
var chokidar = require("chokidar");
function watchModule(moduleConfig, compilerOptions) {
    var rootFileNames = moduleConfig.fileNames;
    var files = {};
    rootFileNames.forEach(function (fileName) {
        files[fileName] = { version: 0 };
    });
    var servicesHost = {
        getScriptFileNames: function () { return rootFileNames; },
        getScriptVersion: function (fileName) { return files[fileName] && files[fileName].version.toString(); },
        getScriptSnapshot: function (fileName) {
            if (!fs.existsSync(fileName)) {
                return undefined;
            }
            return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
        },
        getCurrentDirectory: function () { return process.cwd(); },
        getCompilationSettings: function () { return compilerOptions; },
        getDefaultLibFileName: function (options) { return ts.getDefaultLibFilePath(options); },
    };
    var services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
    rootFileNames.forEach(function (fileName) {
        emitFile(fileName);
        var watcher = chokidar.watch(fileName, {});
        watcher.on("change", function () {
            files[fileName].version++;
            emitFile(fileName);
        });
    });
    function emitFile(fileName) {
        var output = services.getEmitOutput(fileName);
        if (!output.emitSkipped) {
            console.log("Emitting " + fileName);
        }
        else {
            console.log("Emitting " + fileName + " failed");
            logErrors(fileName);
        }
        output.outputFiles.forEach(function (o) {
            fs.writeFileSync(o.name, o.text, "utf8");
        });
    }
    function logErrors(fileName) {
        var allDiagnostics = services.getCompilerOptionsDiagnostics()
            .concat(services.getSyntacticDiagnostics(fileName))
            .concat(services.getSemanticDiagnostics(fileName));
        allDiagnostics.forEach(function (diagnostic) {
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            if (diagnostic.file) {
                var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
                console.log("  Error " + diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message);
            }
            else {
                console.log("  Error: " + message);
            }
        });
    }
}
exports.watchModule = watchModule;
