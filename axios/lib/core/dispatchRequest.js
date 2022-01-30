'use strict';

var utils = require('./../utils');
// 转换数据
var transformData = require('./transformData');
// 取消
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var Cancel = require('../cancel/Cancel');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  // 使用cancelToken方式取消请求 v0.22.0版本 deprecated, 不建议新项目使用
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  // 使用signal方式取消请求
  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  // 取消请求的判断和处理
  throwIfCancellationRequested(config);

  // 处理参数和默认参数
  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  /**
   * transformData(data, header, fns)
   * fns: 函数（统一处理为数组）/函数数组, 以data, headers作为参数，返回处理后的data
   * data = fn3(fn2(fn1(fn0(data))))
   * module.exports = function transformData(data, headers, fns) {
   *  utils.forEach(fns, function transform(fn) {
   *     data = fn(data, headers);
   *  });
   *
   *   return data;
   * };
   */
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  // 使用对应环境的adapter 浏览器的用xhr node环境使用adapter, 也允许用户配置自定义adapter
  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    // 如果请求被取消则抛出
    throwIfCancellationRequested(config);

    // Transform response data
    // 处理返回数据
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    /**
     * isCancel = value => !!(value && value.__CANCEL__)
     */
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      // 若请求不是被取消的，返回请求被reject的信息
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });

};
