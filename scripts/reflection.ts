//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) ElvenJS.com
//
//  All rights reserved.
//
//  MIT license
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


namespace ts {

    /**
     * @private
     */
    let getDefinitionByNameCache = {};

    /**
     * @language en_US
     * Returns a reference to the class object of the class specified by the name parameter.
     * @param name The name of a class.
     */
    /**
     * @language zh_CN
     * 返回 name 参数指定的类的类对象引用。
     * @param name 类的名称。
     */
    export function getDefinitionByName(name:string):any {
        if (!name)
            return null;
        let definition = getDefinitionByNameCache[name];
        if (definition) {
            return definition;
        }
        let paths = name.split(".");
        let length = paths.length;
        definition = __global;
        for (let i = 0; i < length; i++) {
            let path = paths[i];
            definition = definition[path];
            if (!definition) {
                return null;
            }
        }
        getDefinitionByNameCache[name] = definition;
        return definition;
    }

    /**
     * @language en_US
     * Return the fully qualified class name of an object
     * @param value The object for which a fully qualified class name is desired. Any JavaScript value may be passed to
     * this method including all available JavaScript types, object instances, primitive types such as number, and class objects.
     * @returns A string containing the fully qualified class name.
     */
    /**
     * @language zh_CN
     * 返回对象的完全限定类名。
     * @param value 需要完全限定类名称的对象，可以将任何 JavaScript 值传递给此方法，包括所有可用的 JavaScript 类型、对象实例、原始类型
     * （如number)和类对象
     * @returns 包含完全限定类名称的字符串。
     */
    export function getQualifiedClassName(value:any):string {
        let type = typeof value;
        if (!value || (type != "object" && !value.prototype)) {
            return type;
        }
        let prototype:any = value.prototype ? value.prototype : Object.getPrototypeOf(value);
        if (prototype.hasOwnProperty("__class__")) {
            return prototype["__class__"];
        }
        let constructorString:string = prototype.constructor.toString().trim();
        let index:number = constructorString.indexOf("(");
        let className:string = constructorString.substring(9, index);
        Object.defineProperty(prototype, "__class__", {
            value: className,
            enumerable: false,
            writable: true
        });
        return className;
    }

    /** @language en_US
     * Returns the fully qualified class name of the base class of the object specified by the value parameter.
     * @param value The object for which a parent class is desired. Any JavaScript value may be passed to this method including
     * all available JavaScript types, object instances, primitive types such as number, and class objects.
     * @returns  A fully qualified base class name, or null if none exists.
     */
    /**
     * @language zh_CN
     * 返回 value 参数指定的对象的基类的完全限定类名。
     * @param value 需要取得父类的对象，可以将任何 JavaScript 值传递给此方法，包括所有可用的 JavaScript 类型、对象实例、原始类型（如number）和类对象
     * @returns 完全限定的基类名称，或 null（如果不存在基类名称）。
     */
    export function getQualifiedSuperclassName(value:any):string {
        if (!value || (typeof value != "object" && !value.prototype)) {
            return null;
        }
        let prototype:any = value.prototype ? value.prototype : Object.getPrototypeOf(value);
        let superProto = Object.getPrototypeOf(prototype);
        if (!superProto) {
            return null;
        }
        let superClass = getQualifiedClassName(superProto.constructor);
        if (!superClass) {
            return null;
        }
        return superClass;
    }

    /**
     * @language en_US
     * Indicates whether an object is a instance of the class or interface specified as the parameter.This method can indicate
     * whether an object is a instance of the specific interface even though the interface does not exist at JavaScript runtime.
     * @param instance the instance to be checked.
     * @param typeName the string value representing a specific class or interface.
     * @returns A value of true if the object is a instance of the class or interface specified as the parameter.
     * @example
     * <pre>
     *     var instance = new ts.Sprite();
     *     console.log(ts.is(instance,"ts.Sprite"))  //true
     *     console.log(ts.is(instance,"ts.DisplayObjectContainer"))  //true,because ts.DisplayObjectContainer is the superclass of ts.Sprite.
     *     console.log(ts.is(instance,"ts.Bitmap"))  //false,because ts.Bitmap is not the superclass of ts.Sprite.
     * </pre>
     * @see ts.registerClass()
     */
    /**
     * @language zh_CN
     * 检查指定对象是否为指定接口或类或其子类的实例。尽管JavaScript在运行时并不存在接口，此方法仍然可以判断对象是否为指定接口名对应的实例。
     * @param instance 要判断的实例。
     * @param typeName 类或接口的完全名称.
     * @returns 返回true表示当前对象是指定类或接口的实例。
     * @example
     * <pre>
     *     var instance = new ts.Sprite();
     *     console.log(ts.is(instance,"ts.Sprite"))  //true
     *     console.log(ts.is(instance,"ts.DisplayObjectContainer"))  //true，因为ts.DisplayObjectContainer是ts.Sprite的父类。
     *     console.log(ts.is(instance,"ts.Bitmap"))  //false，因为ts.Bitmap不是ts.Sprite的父类。
     * </pre>
     * @see ts.registerClass()
     */
    export function is(instance:any, typeName:string):boolean {
        if (!instance || typeof instance != "object") {
            return false;
        }
        let prototype:any = Object.getPrototypeOf(instance);
        let types = prototype ? prototype.__types__ : null;
        if (!types) {
            return false;
        }
        return (types.indexOf(typeName) !== -1);
    }
}

var __global = __global || this;
