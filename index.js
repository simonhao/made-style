/**
 * Made-Style
 * @author: SimonHao
 * @date:   2015-11-17 11:19:33
 */

'use strict';

var Parser   = require('made-style-parser').parser;
var Compiler = require('./lib/compiler');
var Runtime  = require('./lib/runtime');
var fs       = require('fs');
var extend   = require('extend');

/**
 * 公共设置
 * @param {String} basedir  根目录
 * @param {String} entry    默认入口文件
 * @param {String} filename 文件名
 * @param {Araary} external 外部依赖
 */

exports.compile_ast = function(ast, options, func){
  var compiler = new Compiler(ast, options);

  var result = 'var __made_buf = [];\n'
    + 'var __made_parent = [];\n'
    + 'var __made_prefix = "";\n'
    + compiler.compile()
    + ';\nreturn __made_buf.join("");';

  var runner = new Function('__made', result);
  var runtime = Object.create(Runtime);

  runtime.set(func);

  return runner(runtime);
};

exports.compile = function(str, options, func){
  var ast = Parser.parse(str);

  return exports.compile_ast(ast, options, func);
};

exports.compile_file = function(filename, options, func){
  var options = extend({}, options, {
    filename: filename
  });

  var str = fs.readFileSync(filename, 'utf-8');

  return exports.compile(str, options, func);
};