/*
 * @Author: your name
 * @Date: 2022-01-18 14:22:21
 * @LastEditTime: 2022-01-27 22:21:39
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /axios/lib/axios.js
 */
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
// axios核心代码
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
// 默认配置
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 * 导出默认实例
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  // 返回一个wrap函数，绑定上下文，内部apply了request
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  // 给实例添加被wrap了的axios.prototype.get/delete/put/request等方法
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  // 复制 context: {defaults: {..}, interceptors: { request, response}} 到 instance 实例
  // 也就是为什么默认配置 axios.defaults 和拦截器  axios.interceptors 可以使用的原因
  // 其实是new Axios().defaults 和 new Axios().interceptors
  utils.extend(instance, context);

  // Factory for creating new instances
  // 合并默认配置和自定义配置 axios(config),工厂函数创建实例
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');
axios.VERSION = require('./env/data').version;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
