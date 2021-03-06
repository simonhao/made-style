/**
 * test
 * @author: SimonHao
 * @date:   2015-11-17 11:19:20
 */

'use strict';

var fs = require('fs');

var filename = __dirname + '/main.css';
var str      = fs.readFileSync(filename, 'utf-8');
var made     = require('../index.js');

var options = {
  filename: filename,
  basedir: __dirname,
  external: ['base', 'prefix']
};

var func = {
  url: function(args){

    return 'url(back.png)';
  }
};

console.log(made.compile(str, options, func));