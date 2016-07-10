var __register = __register || function (d, t) {
    var p = d.prototype;
    p.__class__ = t[0];
    p.__types__ = p.__types__ ? t.concat(p.__types__) : t;
};
