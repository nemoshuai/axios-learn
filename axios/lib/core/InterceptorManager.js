'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = []; // 存储拦截函数
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    // 成功回调
    fulfilled: fulfilled,
    // 失败回调
    rejected: rejected,
    // 是否同步调用拦截器
    synchronous: options ? options.synchronous : false,
    // 返回布尔值判断是否不执行当前拦截器逻辑
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1; // 以下标作为拦截器ID，作为删除拦截器的参数
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  // 迭代所有注册的拦截器
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) { // 排除被remove的
      fn(h);
    }
  });
};

module.exports = InterceptorManager;
