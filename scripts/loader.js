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
var ts;
(function (ts) {
    /**
     * Start loading a json file.
     */
    function loadJSON(url, callback) {
        var xhr = window["XMLHttpRequest"] ? new XMLHttpRequest() :
            new ActiveXObject('Microsoft.XMLHTTP');
        xhr.open('get', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                var status_1 = xhr.status;
                if (status_1 == 200) {
                    var data = JSON.parse(xhr.responseText);
                    callback(data);
                }
            }
        };
        xhr.send();
    }
    /**
     * Start loading all scripts in the list.
     */
    function loadAll(list, callback) {
        var loadNext = function () {
            var url = list.shift();
            loadScript(url, function () {
                if (list.length > 0) {
                    loadNext();
                }
                else {
                    callback && callback();
                }
            });
        };
        loadNext();
    }
    /**
     * Start loading one script.
     */
    function loadScript(src, callback) {
        var node = document.createElement('script');
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
    function loadManifest(url, callback) {
        loadJSON(url, function (data) {
            url = url.split("\\").join("/");
            var index = url.lastIndexOf("/");
            var files = data.files;
            if (index != -1) {
                var baseURL = url.substring(0, index + 1);
                for (var i = 0; i < files.length; i++) {
                    files[i] = baseURL + files[i];
                }
            }
            loadAll(files, callback);
        });
    }
    ts.loadManifest = loadManifest;
})(ts || (ts = {}));
//check the data-manifest property in script node, and load it automatically if find one.
var scripts = document.getElementsByTagName('script');
for (var i = 0, l = scripts.length; i < l; i++) {
    var node = scripts[i];
    var url = node.getAttribute('data-manifest');
    if (url) {
        ts.loadManifest(url);
    }
}
