"use strict";
var ts = require("typescript");
var checker;
var files;
var dependencyMap;
var pathWeightMap;
function sortFiles(sourceFiles, typeChecker) {
    files = sourceFiles.concat();
    checker = typeChecker;
    buildDependencyMap();
    var result = sortOnDependency();
    files = null;
    checker = null;
    dependencyMap = null;
    return result;
}
exports.sortFiles = sortFiles;
function createMap() {
    var obj = Object.create(null);
    obj.__v8__ = undefined;
    delete obj.__v8__;
    return obj;
}
function addDependency(file, dependent) {
    if (file == dependent) {
        return;
    }
    var list = dependencyMap[file];
    if (!list) {
        list = dependencyMap[file] = [];
    }
    if (list.indexOf(dependent) == -1) {
        list.push(dependent);
    }
}
function buildDependencyMap() {
    dependencyMap = createMap();
    for (var i = 0; i < files.length; i++) {
        var sourceFile = files[i];
        if (sourceFile.isDeclarationFile) {
            continue;
        }
        visitFile(sourceFile);
    }
}
function visitFile(sourceFile) {
    var statements = sourceFile.statements;
    var length = statements.length;
    for (var i = 0; i < length; i++) {
        var statement = statements[i];
        if (statement.flags & ts.NodeFlags.Ambient) {
            continue;
        }
        if (statement.kind === ts.SyntaxKind.ExpressionStatement) {
            var expression = statement;
            checkExpression(expression.expression);
        }
        else if (statement.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
            var importDeclaration = statement;
            if (importDeclaration.moduleReference.kind == ts.SyntaxKind.QualifiedName) {
                var qualifiedName = importDeclaration.moduleReference;
                checkDependencyAtLocation(qualifiedName);
            }
        }
        else {
            visitStatement(statements[i]);
        }
    }
}
function visitStatement(statement) {
    switch (statement.kind) {
        case ts.SyntaxKind.ClassDeclaration:
            checkInheriting(statement);
            checkStaticMember(statement);
            break;
        case ts.SyntaxKind.VariableStatement:
            var variable = statement;
            variable.declarationList.declarations.forEach(function (declaration) {
                checkExpression(declaration.initializer);
            });
            break;
        case ts.SyntaxKind.ModuleDeclaration:
            visitModule(statement);
            break;
    }
}
function visitModule(node) {
    if (node.body.kind == ts.SyntaxKind.ModuleDeclaration) {
        visitModule(node.body);
        return;
    }
    var statements = node.body.statements;
    var length = statements.length;
    for (var i = 0; i < length; i++) {
        var statement = statements[i];
        if (statement.flags & ts.NodeFlags.Ambient) {
            continue;
        }
        visitStatement(statement);
    }
}
function checkDependencyAtLocation(node) {
    var type = checker.getTypeAtLocation(node);
    if (type.flags & ts.TypeFlags.Interface) {
        return;
    }
    var sourceFile = type.symbol.valueDeclaration.getSourceFile();
    if (sourceFile.isDeclarationFile) {
        return;
    }
    addDependency(node.getSourceFile().fileName, sourceFile.fileName);
}
function checkInheriting(node) {
    if (!node.heritageClauses) {
        return;
    }
    var heritageClause = null;
    for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
        var clause = _a[_i];
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            heritageClause = clause;
            break;
        }
    }
    if (!heritageClause) {
        return;
    }
    var superClasses = heritageClause.types;
    if (!superClasses) {
        return;
    }
    var currentFileName = node.getSourceFile().fileName;
    superClasses.forEach(function (superClass) {
        checkDependencyAtLocation(superClass);
    });
}
function checkStaticMember(node) {
    var members = node.members;
    if (!members) {
        return;
    }
    for (var _i = 0, members_1 = members; _i < members_1.length; _i++) {
        var member = members_1[_i];
        if (!(member.flags & ts.NodeFlags.Static)) {
            continue;
        }
        switch (member.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
                var property = member;
                checkExpression(property.initializer);
                break;
        }
    }
}
function checkExpression(expression) {
    switch (expression.kind) {
        case ts.SyntaxKind.NewExpression:
            var newExpression = expression;
            break;
    }
}
function sortOnDependency() {
    var result = {};
    result.sortedFiles = files;
    result.circularReferences = [];
    pathWeightMap = createMap();
    for (var i = 0; i < files.length; i++) {
        var sourceFile = files[i];
        if (sourceFile.isDeclarationFile) {
            continue;
        }
        var path = sourceFile.fileName;
        var references = updatePathWeight(path, 0, [path]);
        if (references) {
            result.circularReferences = references;
            break;
        }
    }
    if (result.circularReferences.length === 0) {
        files.sort(function (a, b) {
            return pathWeightMap[b.fileName] - pathWeightMap[a.fileName];
        });
    }
    pathWeightMap = null;
    return result;
}
function updatePathWeight(path, weight, references) {
    if (pathWeightMap[path] === undefined) {
        pathWeightMap[path] = weight;
    }
    else {
        if (pathWeightMap[path] < weight) {
            pathWeightMap[path] = weight;
        }
        else {
            return null;
        }
    }
    var list = dependencyMap[path];
    if (!list) {
        return null;
    }
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
        var parentPath = list_1[_i];
        if (references.indexOf(parentPath) != -1) {
            references.push(parentPath);
            return references;
        }
        var result = updatePathWeight(parentPath, weight + 1, references.concat(parentPath));
        if (result) {
            return result;
        }
    }
    return null;
}
