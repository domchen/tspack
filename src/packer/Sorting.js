"use strict";
var ts = require("typescript");
var checker;
var files;
var dependencyMap;
function sortFiles(sourceFiles, typeChecker) {
    sourceFiles = sourceFiles.concat();
    files = sourceFiles;
    checker = typeChecker;
    dependencyMap = createMap();
    buildDependencyMap();
    files = null;
    checker = null;
    dependencyMap = null;
    return sourceFiles;
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
            checkImport(statement);
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
function checkImport(statement) {
    var currentFileName = statement.getSourceFile().fileName;
    var importDeclaration = statement;
    if (importDeclaration.moduleReference.kind == ts.SyntaxKind.QualifiedName) {
        var qualifiedName = importDeclaration.moduleReference;
        var type = checker.getTypeAtLocation(qualifiedName);
        var declarations = type.symbol.getDeclarations();
        declarations.forEach(function (declaration) {
            var file = declaration.getSourceFile();
            if (file.isDeclarationFile) {
                return;
            }
            addDependency(currentFileName, file.fileName);
        });
    }
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
        var type = checker.getTypeAtLocation(superClass);
        var declarations = type.symbol.getDeclarations();
        declarations.forEach(function (declaration) {
            var file = declaration.getSourceFile();
            if (file.isDeclarationFile) {
                return;
            }
            addDependency(currentFileName, file.fileName);
        });
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
            break;
    }
}
