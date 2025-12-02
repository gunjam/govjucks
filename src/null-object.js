'use strict';

const NullObject = function () {};
NullObject.prototype = Object.create(null);
NullObject.isNullObject = function (obj) {
  return obj instanceof NullObject;
};
module.exports = NullObject;
