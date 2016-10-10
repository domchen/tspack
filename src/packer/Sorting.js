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
    if (!type || type.flags & ts.TypeFlags.Interface) {
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
        if (member.kind == ts.SyntaxKind.PropertyDeclaration) {
            var property = member;
            checkExpression(property.initializer);
        }
    }
}
function checkExpression(expression) {
    switch (expression.kind) {
        case ts.SyntaxKind.NewExpression:
            checkNewExpression(expression);
            break;
        case ts.SyntaxKind.CallExpression:
            checkCallExpression(expression);
            break;
        case ts.SyntaxKind.Identifier:
        case ts.SyntaxKind.PropertyAccessExpression:
            checkDependencyAtLocation(expression);
            break;
        case ts.SyntaxKind.ArrayLiteralExpression:
            var arrayLiteral = expression;
            arrayLiteral.elements.forEach(checkExpression);
            break;
        case ts.SyntaxKind.TemplateExpression:
            var template = expression;
            template.templateSpans.forEach(function (span) {
                checkExpression(span.expression);
            });
            break;
        case ts.SyntaxKind.ParenthesizedExpression:
            var parenthesized = expression;
            checkExpression(parenthesized.expression);
            break;
        case ts.SyntaxKind.BinaryExpression:
            var binary = expression;
            checkExpression(binary.left);
            checkExpression(binary.right);
            break;
        case ts.SyntaxKind.PostfixUnaryExpression:
        case ts.SyntaxKind.PrefixUnaryExpression:
            checkExpression(expression.operand);
            break;
        case ts.SyntaxKind.DeleteExpression:
            checkExpression(expression.expression);
    }
}
function checkCallExpression(callExpression) {
    callExpression.arguments.forEach(function (argument) {
        checkExpression(argument);
    });
    var expression = callExpression.expression;
    switch (expression.kind) {
        case ts.SyntaxKind.FunctionExpression:
            var functionExpression = expression;
            checkFunctionBody(functionExpression.body);
            break;
        case ts.SyntaxKind.PropertyAccessExpression:
        case ts.SyntaxKind.Identifier:
            var type = checker.getTypeAtLocation(expression);
            if (!type || type.flags & ts.TypeFlags.Interface) {
                return;
            }
            var declaration = type.symbol.valueDeclaration;
            var sourceFile = declaration.getSourceFile();
            if (sourceFile.isDeclarationFile) {
                return;
            }
            addDependency(expression.getSourceFile().fileName, sourceFile.fileName);
            if (declaration.kind === ts.SyntaxKind.FunctionDeclaration ||
                declaration.kind === ts.SyntaxKind.MethodDeclaration) {
                checkFunctionBody(declaration.body);
            }
            break;
    }
}
function checkNewExpression(expression) {
    var type = checker.getTypeAtLocation(expression);
    if (!type || type.flags & ts.TypeFlags.Interface) {
        return;
    }
    var declaration = type.symbol.valueDeclaration;
    var sourceFile = declaration.getSourceFile();
    if (sourceFile.isDeclarationFile) {
        return;
    }
    addDependency(expression.getSourceFile().fileName, sourceFile.fileName);
    if (declaration.kind === ts.SyntaxKind.ClassDeclaration) {
        checkClassInstantiation(declaration);
    }
}
function checkClassInstantiation(node) {
    var members = node.members;
    if (!members) {
        return;
    }
    for (var _i = 0, members_2 = members; _i < members_2.length; _i++) {
        var member = members_2[_i];
        if (member.flags & ts.NodeFlags.Static) {
            continue;
        }
        if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
            var property = member;
            checkExpression(property.initializer);
        }
        else if (member.kind === ts.SyntaxKind.Constructor) {
            var constructor = member;
            checkFunctionBody(constructor.body);
        }
    }
}
function checkFunctionBody(body) {
    ts.forEachChild(body, visit);
    function visit(node) {
        if (node.kind === ts.SyntaxKind.VariableStatement) {
            var variable = node;
            variable.declarationList.declarations.forEach(function (declaration) {
                checkExpression(declaration.initializer);
            });
        }
        else if (node.kind === ts.SyntaxKind.ExpressionStatement) {
            var expression = node;
            checkExpression(expression.expression);
        }
        else {
            ts.forEachChild(node, visit);
        }
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
