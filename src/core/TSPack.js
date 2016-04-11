var tsp;
(function (tsp) {
    var TSPack = (function () {
        function TSPack() {
            this.msg = "it works!";
        }
        TSPack.prototype.trace = function () {
            console.log(this.msg);
        };
        return TSPack;
    })();
    tsp.TSPack = TSPack;
})(tsp || (tsp = {}));
