declare namespace ts {
    /**
     * Returns a reference to the class object of the class specified by the name parameter.
     * @param name The name of a class.
     */
    function getDefinitionByName(name: string): any;
    /**
     * Return the fully qualified class name of an object
     * @param value The object for which a fully qualified class name is desired. Any JavaScript value may be passed to
     * this method including all available JavaScript types, object instances, primitive types such as number, and class objects.
     * @returns A string containing the fully qualified class name.
     */
    function getQualifiedClassName(value: any): string;
    /**
     * Returns the fully qualified class name of the base class of the object specified by the value parameter.
     * @param value The object for which a parent class is desired. Any JavaScript value may be passed to this method including
     * all available JavaScript types, object instances, primitive types such as number, and class objects.
     * @returns  A fully qualified base class name, or null if none exists.
     */
    function getQualifiedSuperclassName(value: any): string;
    /**
     * Indicates whether an object is a instance of the class or interface specified as the parameter.This method can indicate
     * whether an object is a instance of the specific interface even though the interface does not exist at JavaScript runtime.
     * @param instance the instance to be checked.
     * @param typeName the string value representing a specific class or interface.
     * @returns A value of true if the object is a instance of the class or interface specified as the parameter.
     * @example
     * <pre>
     *     var instance = new ts.Sprite();
     *     console.log(ts.is(instance,"ts.Sprite"))                  // true
     *     console.log(ts.is(instance,"ts.DisplayObjectContainer"))  // true, because ts.DisplayObjectContainer is the superclass of ts.Sprite.
     *     console.log(ts.is(instance,"ts.Bitmap"))                  // false, because ts.Bitmap is not the superclass of ts.Sprite.
     * </pre>
     */
    function is(instance: any, typeName: string): boolean;
}
declare var __global: any;
