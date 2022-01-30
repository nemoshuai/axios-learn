/*
 * @Author: nemo
 * @Date: 2022-01-29 14:23:07
 * @LastEditTime: 2022-01-29 14:30:35
 * @LastEditors: nemo
 * @Description: interceptor demo
 * @FilePath: /axios-learn/axios/examples/interceptor/server.js
 */
'use strict';
var list = [
  {
    id: '1',
    name: 'cartoon'
  },
  {
    id: '2',
    name: 'movie'
  },
  {
    id: '3',
    name: 'variety'
  },
  {
    id: '4',
    name: 'teleplay'
  }
];

module.exports = function interceptor(req, res) {
  res.writeHead(200, {
    'Context-Type': 'application/json'
  });
  res.write(JSON.stringify(list));
  res.end();
};
