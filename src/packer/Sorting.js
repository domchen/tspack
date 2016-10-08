"use strict";
var files;
function sortFiles(sourceFiles) {
    sourceFiles = sourceFiles.concat();
    files = sourceFiles;
    buildDependencyMap();
    files = null;
    return sourceFiles;
}
exports.sortFiles = sortFiles;
function buildDependencyMap() {
    for (var i = 0; i < files.length; i++) {
        var sourceFile = files[i];
    }
}
