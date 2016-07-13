//////////////////////////////////////////////////////////////////////////////////////
//
//  The MIT License (MIT)
//
//  Copyright (c) 2016-present, ElvenJS.com.
//  All rights reserved.
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
     * Start loading a json file.
     */
    function loadJSON(url:string, callback:(data:any)=>void):void {
        let xhr = window["XMLHttpRequest"] ? new XMLHttpRequest() :
            new ActiveXObject('Microsoft.XMLHTTP');
        xhr.open('get', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                let status = xhr.status;
                if (status == 200) {
                    let data = JSON.parse(xhr.responseText);
                    callback(data);
                }
            }
        };
        xhr.send();
    }
    /**
     * Start loading all scripts in the list.
     */
    function loadAll(list:string[], callback:()=>void) {
        let loadNext = ()=> {
            let url = list.shift();
            loadScript(url, () => {
                if (list.length > 0) {
                    loadNext();
                }
                else {
                    callback && callback();
                }
            })
        };
        loadNext();
    }
    /**
     * Start loading one script.
     */
    function loadScript(src:string, callback:()=>void):void {
        let node = document.createElement('script');
        node.type = "text/javascript";
        node.async = true;
        node.charset = 'utf-8';
        node.addEventListener('load', function () {
            node.parentNode.removeChild(node);
            this.removeEventListener('load', arguments.callee, false);
            callback();
        }, false);
        node.src = src;
        document.body.appendChild(node);
    }
    /**
     * @language en_US
     * Start loading the manifest.json file and all script files in it.
     * @param url The path of the manifest.json file.
     * @param callback The function to be called when load is complete.
     */
    /**
     * @language zh_CN
     * 开始加载manifest.json文件以及它内部记录的脚本文件列表。
     * @param url manifest.json的文件路径。
     * @param callback 当加载完成时的回调函数。
     */
    export function loadManifest(url:string, callback?:()=>void):void {
        loadJSON(url, (data:any)=> {
            url = url.split("\\").join("/");
            let index = url.lastIndexOf("/");
            let files:string[] = data.files;
            if (index != -1) {
                let baseURL = url.substring(0, index + 1);
                for (let i = 0; i < files.length; i++) {
                    files[i] = baseURL + files[i];
                }
            }
            loadAll(files, callback);
        })
    }
}

//check the data-manifest property in script node, and load it automatically if find one.
let scripts = document.getElementsByTagName('script');
for (let i = 0, l = scripts.length; i < l; i++) {
    let node = scripts[i];
    let url = node.getAttribute('data-manifest');
    if (url) {
        ts.loadManifest(url);
    }
}