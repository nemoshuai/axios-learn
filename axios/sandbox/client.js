/*
 * @Author: your name
 * @Date: 2022-01-18 14:22:21
 * @LastEditTime: 2022-01-27 22:07:04
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /axios/sandbox/client.js
 */
var axios = require('../index');

var URL = 'http://127.0.0.1:3000/api';
var BODY = {
  foo: 'bar',
  baz: 1234
};

function handleSuccess(data) { console.log(data); }
function handleFailure(data) { console.log('error', data); }

// GET
axios.get(URL, { params: BODY })
  .then(handleSuccess)
  .catch(handleFailure);

// POST
axios.post(URL, BODY)
  .then(handleSuccess)
  .catch(handleFailure);