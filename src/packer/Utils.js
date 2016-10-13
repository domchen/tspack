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
