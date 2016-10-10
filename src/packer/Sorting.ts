//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

import * as ts from "typescript";

let checker:ts.TypeChecker;
let files:ts.SourceFile[];
let dependencyMap:{[key:string]:string[]};

export function sortFiles(sourceFiles:ts.SourceFile[], typeChecker:ts.TypeChecker):ts.SourceFile[] {
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

function createMap():{[key:string]:string[]} {
    let obj:any = Object.create(null);
    obj.__v8__ = undefined;
    delete obj.__v8__;
    return obj;
}

function addDependency(file:string, dependent:string):void {
    if (file == dependent) {
        return;
    }
    let list = dependencyMap[file];
    if (!list) {
        list = dependencyMap[file] = [];
    }
    if (list.indexOf(dependent) == -1) {
        list.push(dependent);
    }
}

function buildDependencyMap():void {
    for (let i = 0; i < files.length; i++) {
        let sourceFile = files[i];
        if (sourceFile.isDeclarationFile) {
            continue;
        }
        visitFile(sourceFile);
    }
}

function visitFile(sourceFile:ts.SourceFile):void {
    let statements = sourceFile.statements;
    let length = statements.length;
    for (let i = 0; i < length; i++) {
        let statement = statements[i];
        if (statement.flags & ts.NodeFlags.Ambient) { // has the 'declare' keyword
            continue;
        }
        if (statement.kind === ts.SyntaxKind.ExpressionStatement) {
            let expression = <ts.ExpressionStatement>statement;
            checkExpression(expression.expression);
        } else if (statement.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
            checkImport(<ts.ImportEqualsDeclaration>statement);
        } else {
            visitStatement(statements[i]);
        }
    }
}

function visitStatement(statement:ts.Statement):void {
    switch (statement.kind) {
        case ts.SyntaxKind.ClassDeclaration:
            checkInheriting(<ts.ClassDeclaration>statement);
            checkStaticMember(<ts.ClassDeclaration>statement);
            break;
        case ts.SyntaxKind.VariableStatement:
            let variable = <ts.VariableStatement>statement;
            variable.declarationList.declarations.forEach(declaration=> {
                checkExpression(declaration.initializer);
            });
            break;
        case ts.SyntaxKind.ModuleDeclaration:
            visitModule(<ts.ModuleDeclaration>statement);
            break;
    }
}

function visitModule(node:ts.ModuleDeclaration):void {
    if (node.body.kind == ts.SyntaxKind.ModuleDeclaration) {
        visitModule(<ts.ModuleDeclaration>node.body);
        return;
    }
    let statements = (<ts.ModuleBlock>node.body).statements;
    let length = statements.length;
    for (let i = 0; i < length; i++) {
        let statement = statements[i];
        if (statement.flags & ts.NodeFlags.Ambient) { // has the 'declare' keyword
            continue;
        }
        visitStatement(statement);
    }
}

function checkImport(statement:ts.ImportEqualsDeclaration):void {
    let currentFileName = statement.getSourceFile().fileName;
    let importDeclaration = <ts.ImportEqualsDeclaration>statement;
    if (importDeclaration.moduleReference.kind == ts.SyntaxKind.QualifiedName) {
        let qualifiedName = <ts.QualifiedName>importDeclaration.moduleReference;
        let type = checker.getTypeAtLocation(qualifiedName);
        let declarations = type.symbol.getDeclarations();
        declarations.forEach(declaration=> {
            let file = declaration.getSourceFile();
            if (file.isDeclarationFile) {
                return;
            }
            addDependency(currentFileName, file.fileName);
        })
    }
}


function checkInheriting(node:ts.ClassDeclaration):void {
    if (!node.heritageClauses) {
        return;
    }
    let heritageClause:ts.HeritageClause = null;
    for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
            heritageClause = clause;
            break;
        }
    }
    if (!heritageClause) {
        return;
    }
    let superClasses = heritageClause.types;
    if (!superClasses) {
        return;
    }
    let currentFileName = node.getSourceFile().fileName;
    superClasses.forEach(superClass=> {
        let type = checker.getTypeAtLocation(superClass);
        let declarations = type.symbol.getDeclarations();
        declarations.forEach(declaration=> {
            let file = declaration.getSourceFile();
            if (file.isDeclarationFile) {
                return;
            }
            addDependency(currentFileName, file.fileName);
        })
    });
}

function checkStaticMember(node:ts.ClassDeclaration):void {
    let members = node.members;
    if (!members) {
        return;
    }
    for (let member of members) {
        if (!(member.flags & ts.NodeFlags.Static)) {
            continue;
        }
        switch (member.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
                let property = <ts.PropertyDeclaration>member;
                checkExpression(property.initializer);
                break;
        }
    }
}

function checkExpression(expression:ts.Expression):void {
    switch (expression.kind) {
        case ts.SyntaxKind.NewExpression:

            break;

    }

    // ArrayLiteralExpression
    // ObjectLiteralExpression
    // PropertyAccessExpression
    // ElementAccessExpression
    // CallExpression
    // NewExpression
    // TaggedTemplateExpression
    // TypeAssertionExpression
    // ParenthesizedExpression
    // FunctionExpression
    // ArrowFunction
    // DeleteExpression
    // TypeOfExpression
    // VoidExpression
    // AwaitExpression
    // PrefixUnaryExpression
    // PostfixUnaryExpression
    // BinaryExpression
    // ConditionalExpression
    // TemplateExpression
    // YieldExpression
    // SpreadElementExpression
    // ClassExpression
    // OmittedExpression
    // ExpressionWithTypeArguments
    // AsExpression
    // NonNullExpression
}