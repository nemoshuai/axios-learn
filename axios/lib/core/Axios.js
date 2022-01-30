'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');
var validator = require('../helpers/validator');

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    // 拦截器构造函数，新建request/response拦截器实例
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(configOrUrl, config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  // 这一块代码是允许开发者 axios(url) 或者 axios({ url }) 调用
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  if (!config.url) {
    throw new Error('Provided config url is not valid');
  }

  // 合并配置，以config为主
  config = mergeConfig(this.defaults, config);

  // Set config.method
  // axios({ method: 'get' }) 或者 axios({ method: 'GET' }) 都OK，会统一处理成小写，且默认是get方法
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  // lib/helpers/validator.js
  // 校验选项合法性 是否废弃等
  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // 拦截器--start
  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    // 运行时检查，当runWhen(config)为false时，该拦截器不会执行
    /**
     * const onGetCal = config => config.method === 'get'
     * axios.interceptors.request.use(function (config) {
     *   config.headers.test = 'special get headers';
     *   return config;
     * }, null, { runWhen: onGetCall });
     */
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    // interceptor.synchronous默认为false, 
    /**
     * 默认异步执行，根据event loop放在微任务队列中，当主线程阻塞时，拦截器迟迟不能放进调用栈中执行
     * 通过传入额外参数设置{ synchronous: true }，同步执行拦截器代码即放到宏任务（类型为script），避免因为主线程阻塞而导致请求延迟
     * axios.interceptors.request.use(function (config) {
     *  config.headers.test = 'I am only a header!';
     *  return config;
     * }, null, { synchronous: true });
     */
    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous; // 拦截器本身必须也得是同步代码才能同步执行
    // 构造requestInterceptorChain = [interceptorN.fulfilled, interceptorN.rejected,..., interceptor1.fulfilled, interceptor1.rejected]
    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
     // 构造responseInterceptorChain = [interceptor1.fulfilled, interceptor1.rejected,..., interceptorN.fulfilled, interceptorN.rejected]
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });
   // 拦截器--end

  // 形成promise队列
  var promise;

  // 异步
  if (!synchronousRequestInterceptors) {
    // 构建[...requestInterceptorChain, dispatchRequest, ...responseInterceptorChain]
    // 保证了先执行请求拦截 再执行请求方法 最后再执行响应拦截
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    // 创建promise
    promise = Promise.resolve(config);
    while (chain.length) {
      // 串行调用，一个个的出队列
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }

  // 同步调用
  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  if (!config.url) {
    throw new Error('Provided config url is not valid');
  }
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
