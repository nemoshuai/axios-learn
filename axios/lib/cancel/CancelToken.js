'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  /**
   * cancelToken: new CancelToken(function(c) { cancel = c })
   */
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  // 调用了source.cancel时，执行监听函数
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel); // 执行adaptor中注册的监听函数事件
    }
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  // 完全不知道啥时候回走到 估计得看有什么用法
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      // 当前请求已经被取消了
      return;
    }

    /**
    * Cancel的实现非常简单，传递错误消息，重载toString, 格式输出消息，设置__CANCEL__为true
    * function Cancel(message) { this.message = message;}
    * Cancel.prototype.toString = function toString() {
    *     return 'Cancel' + (this.message ? ': ' + this.message : '');
    * };
    * Cancel.prototype.__CANCEL__ = true;
    */
    token.reason = new Cancel(message);
    resolvePromise(token.reason); // 这里的reason最终会抛到dispatchRequest中onAdapterRejection方法 传递给isCancel，抛出去取消请求错误，返回被reject的promise
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Subscribe to the cancel signal
 */
/**
 * listener = function(cancel) {
        if (req.aborted) return;
        req.abort();
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
    };
 */
CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * Unsubscribe from the cancel signal
 */

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c; // cancel(message)
  });
  return {
    token: token, // 传递给axios config的cancelToken字段
    cancel: cancel // 调用source.cancel 取消请求
  };
};

module.exports = CancelToken;


// 构造函数
// function CancelToken() {}
// // 取消请求被调用时抛出取消请求信息
// CancelToken.prototype.throwIfRequested = function() {}
// // 注册监听取消请求事件，保存到token._listener
// CancelToken.prototype.subscribe = function() {}
// // 卸载注册 即将事件从token._listener移除
// CancelToken.prototype.unsubscribe = function() {}
// // 返回包含token和取消方法cancel的对象
// CancelToken.source = function()
