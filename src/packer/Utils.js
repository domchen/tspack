"use strict";
var ts = require("typescript-plus");
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
function formatDiagnostics(diagnostics) {
    return ts.formatDiagnostics(diagnostics, defaultFormatDiagnosticsHost);
}
exports.formatDiagnostics = formatDiagnostics;
function getRootLength(path) {
    if (path.charAt(0) == "/") {
        if (path.charAt(1) != "/")
            return 1;
        var p1 = path.indexOf("/", 2);
        if (p1 < 0)
            return 2;
        var p2 = path.indexOf("/", p1 + 1);
        if (p2 < 0)
            return p1 + 1;
        return p2 + 1;
    }
    if (path.charAt(1) == ":") {
        if (path.charAt(2) == "/")
            return 3;
        return 2;
    }
    if (path.lastIndexOf("file:///", 0) === 0) {
        return "file:///".length;
    }
    var idx = path.indexOf("://");
    if (idx !== -1) {
        return idx + "://".length;
    }
    return 0;
}
var directorySeparator = "/";
function joinPath(path1, path2) {
    if (!(path1 && path1.length))
        return path2;
    if (!(path2 && path2.length))
        return path1;
    path1 = path1.split("\\").join(directorySeparator);
    path2 = path2.split("\\").join(directorySeparator);
    if (getRootLength(path2) !== 0)
        return path2;
    if (path1.charAt(path1.length - 1) === directorySeparator)
        return path1 + path2;
    return path1 + directorySeparator + path2;
}
exports.joinPath = joinPath;
