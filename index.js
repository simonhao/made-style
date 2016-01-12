/**
 * Made-Style
 * @author: SimonHao
 * @date:   2015-11-17 11:19:33
 */

'use strict';

var Parser   = require('made-style-parser');
var Compiler = require('./lib/compiler');
var Runtime  = require('./lib/runtime');
var fs       = require('fs');
var extend   = require('extend');
var mid      = require('made-id');
var path     = require('path');

/**
 * 公共设置
 * @param {String} basedir  根目录
 * @param {String} entry    默认入口文件
 * @param {String} filename 文件名
 * @param {Araary} external 外部依赖
 */

exports.compile_ast = function(ast, options, func){
  var external_list = options.external || [];
  var options = extend({
    basedir: process.cwd(),
    filename: '',
    entry: 'style.css',
    ext: '.css'
  }, options);

  var external = {};

  external_list.forEach(function(external_id){
    var module_path;

    if(path.isAbsolute(external_id)){
      module_path = external_id
    }else{
      module_path = mid.path(external_id, options)
    }

    if(module_path){
      external[module_path] = true;
    }
  });

  var compiler = new Compiler(ast, {
    basedir: options.basedir,
    filename: options.filename,
    entry: options.entry,
    ext: options.ext,
    external: external
  });

  var result = 'var __made_buf = [];\n'
    + 'var __made_parent = [];\n'
    + 'var __made_prefix = "";\n'
    + 'var __made_call_statck = [];\n'
    + compiler.compile()
    + ';\nreturn __made_buf.join("");';

  var runner = new Function('__made', result);
  var runtime = Object.create(Runtime);

  runtime.set(func);

  return runner(runtime);

  /*return compiler.compile();*/
};

exports.compile = function(str, options, func){
  var ast = new Parser(str, options.filename).parse();

  return exports.compile_ast(ast, options, func);
};

exports.compile_file = function(filename, options, func){
  if(!fs.existsSync(filename)){
    console.error('Compile file "', filename, '" not exists');
    return;
  }

  var options = extend({}, options, {
    filename: filename
  });

  var str = fs.readFileSync(filename, 'utf-8');

  return exports.compile(str, options, func);
};