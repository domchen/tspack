"use strict";
var ts = require("typescript-plus");
var config = require("./Config");
var compiler = require("./Compiler");
function run(args) {
    var searchPath = ts.sys.getCurrentDirectory();
    var configFileName = config.findConfigFile(searchPath);
    if (!configFileName) {
        return;
    }
    var result = config.parseOptionsFromFile(configFileName);
    if (result.errors.length > 0) {
        ts.sys.write(result.errors.join(ts.sys.newLine));
        ts.sys.exit(1);
        return;
    }
    var errors = [];
    result.modules.forEach(function (moduleConfig) {
        var sortedFileNames = compiler.emitModule(moduleConfig, result.compilerOptions, errors);
        if (result.packerOptions.listSortedFiles) {
            ts.sys.write("sorted files of '" + moduleConfig.name + "' :" + ts.sys.newLine);
            ts.sys.write("    " + sortedFileNames.join(ts.sys.newLine + "    ") + ts.sys.newLine);
        }
    });
}
run(ts.sys.args);
