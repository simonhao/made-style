/**
 * Made-Style Compiler
 * @author: SimonHao
 * @date:   2015-11-23 10:11:22
 */

'use strict';

var Parser = require('made-style-parser');
var mid    = require('made-id');
var fs     = require('fs');
var extend = require('extend');

function Compiler(ast, options){
  var self = this;

  this.options = extend({
    entry: 'style.css',
    ext: '.css',
    basedir: process.cwd()
  }, options);

  this.filename = this.options.filename;
  this.external = this.options.external || {};

  this.ast = ast;
  this.sid = this.filename && mid.sid(this.filename, this.options);

  this.buf = [];
  this.last_text_buf = [];
}

Compiler.prototype = {
  constructor: Compiler,
  compile: function(){
    this.visit(this.ast);

    return this.buf.join('\n');
  },
  buffer_text: function(str){
    this.last_text_buf.push(str);
  },
  buffer_code: function(exp){
    this.clear_text_buf();
    this.buf.push(exp);
  },
  buffer_code_last: function(exp){
    this.buf.push(this.buf.pop() + exp);
  },
  clear_text_buf: function(){
    var text;

    if(this.last_text_buf.length){
      text = this.last_text_buf.join('');
      this.last_text_buf = [];

      if(text !== ''){
        this.buf.push('__made_buf.push(' + JSON.stringify(text) + ');');
      }
    }
  },
  format_ident: function(ident){
    return ident.replace(/-/g, '_');
  },
  check_ident: function(ident){
    var ident_str = JSON.stringify(ident);
    var ident_var = this.format_ident(ident);
    return '(typeof ' + ident_var + ' === "undefined" ? null : ' + ident_var + ')';
  },
  check_mixin: function(name){
    var name_str = JSON.stringify(name);
    var name_var = this.format_ident(name);

    return '(typeof ' + name_var + ' === "function" ? ' + name_var + ' : null)';
  },
  visit: function(node, param){
    var visitor = 'visit_' + node.type;

    if(visitor in this){
      this[visitor](node, param);
    }else{
      console.error('Unknow Type:', node.type);
    }
  },
  visit_nodes: function(nodes, param){
    var self = this;

    if(Array.isArray(nodes) && nodes.length){
      nodes.forEach(function(node){
        self.visit(node, param);
      });
    }
  },
  visit_nodes_join: function(nodes, join, param){
    if(!Array.isArray(nodes) || !nodes.length) return;

    for(var i = 0; i < (nodes.length - 1); i++){
      this.visit(nodes[i], param);
      this.buffer_code_last(join);
    }

    this.visit(nodes[i], param);
  },
  visit_text_join: function(nodes, join, param){
    if(!Array.isArray(nodes) || !nodes.length) return;

    for(var i = 0; i < (nodes.length - 1); i++){
      this.visit(nodes[i], param);
      this.buffer_text(join);
    }

    this.visit(nodes[i], param);
  },
  visit_nodes_is: function(nodes, type, param){
    var self = this;

    if(Array.isArray(nodes) && nodes.length){
      nodes.forEach(function(node){
        if(node.type === type){
          self.visit(node, param);
        }
      });
    }
  },
  visit_nodes_not: function(nodes, type, param){
    var self = this;

    if(Array.isArray(nodes) && nodes.length){
      nodes.forEach(function(node){
        if(node.type !== type){
          self.visit(node, param);
        }
      });
    }
  },
  visit_stylesheet: function(node){
    this.visit_nodes(node.rule);
    this.clear_text_buf();
  },
  visit_comment: function(node){
    this.buffer_text('/*' + node.val + '*/');
  },
  visit_declaration: function(node, declaration_set){
    var ident_name = this.format_ident(node.name);

    if(declaration_set){
      this.buffer_code('__made.declaration(');
      this.buffer_code_last(this.check_mixin(node.name));
      this.buffer_code_last(',' + JSON.stringify(ident_name));
      this.buffer_code_last(',' + JSON.stringify(node.name));
      this.buffer_code_last(',[');
      this.visit_nodes_join(node.list, ',');
      this.buffer_code_last('], __made_buf, __made_parent, __made_call_statck);');
    }else{
      this.buffer_code('var ' + ident_name + ' = ');
      this.buffer_code_last('[');
      this.visit_nodes_join(node.list, ',')
      this.buffer_code_last('].join(" ");');
    }

  },
  visit_property_item: function(node){
    this.visit_nodes_join(node.item, '+');
  },
  visit_ident: function(node){
    this.buffer_code_last('__made.ident(' + this.check_ident(node.val) + ',' + JSON.stringify(node.val) + ')');
  },
  visit_literal: function(node){
    this.buffer_code_last(JSON.stringify(node.val));
  },
  visit_string: function(node){
    this.buffer_code_last(JSON.stringify('"' + node.val + '"'));
  },
  visit_function: function(node){
    this.buffer_code_last('__made.func(');
    this.buffer_code_last(JSON.stringify(node.name));
    this.buffer_code_last(',[');
    this.visit_nodes_join(node.params, ',');
    this.buffer_code_last('],');
    this.buffer_code_last(JSON.stringify({
      basedir: this.options.basedir,
      filename: this.options.filename,
      entry: this.options.entry,
      ext: this.options.ext
    }));
    this.buffer_code_last(')');
  },
  visit_mixin: function(node){
    var mixin_name = this.format_ident(node.name);
    var mixin_params = node.params || [];
    this.buffer_code('function ' + mixin_name + '(__made_args, __made_parent, __made_call_statck){');

    this.buffer_code('var __made_call_statck = __made_call_statck ? __made_call_statck.slice(0) : [];');
    this.buffer_code('__made_call_statck.push(' + JSON.stringify(mixin_name) + ');');

    var param;
    for(var i = 0; i < mixin_params.length; i++){
      param = mixin_params[i];

      if(param.type === 'reset'){
        this.buffer_code('var ' + this.format_ident(param.name) + ' = ' + '__made_args.slice(' + i + ').join(" ");');
      }else if(param.type === 'ident'){
        this.buffer_code('var ' + this.format_ident(param.val) + ' = ' + '__made_args[' + i + '];');
      }
    }

    this.visit_nodes_not(node.nodes, 'declaration_set', true);
    this.visit_nodes_is(node.nodes, 'declaration_set');
    this.buffer_code('}');
  },
  visit_root: function(node){
    this.buffer_code('(function(){');
    this.buffer_code('var __made_prefix = ' + JSON.stringify(this.sid) + ';');
    this.visit_nodes(node.nodes);
    this.buffer_code('})();');
  },
  visit_declaration_set: function(node){
    if(!Array.isArray(node.nodes) || !node.nodes.length) return;

    this.buffer_code('(function(__made_parent){');
    this.buffer_code('var __selector_list = [');
    this.visit_nodes_join(node.selector, ',');
    this.buffer_code_last('];');
    this.buffer_code('var __made_parent = __made.parent(__made_parent, __selector_list);');
    this.buffer_text('\n');
    this.buffer_code('__made_buf.push(__made_parent.join(",\\n"));');
    this.buffer_text('{');
    this.visit_nodes_not(node.nodes, 'declaration_set', true);
    this.buffer_text('\n}');
    this.visit_nodes_is(node.nodes, 'declaration_set');
    this.buffer_code('})(__made_parent);');
  },
  visit_complex_selector: function(node){
    var self = this;

    self.buffer_code_last('"');
    node.list.forEach(function(selector){
      if(selector.type === 'literal'){
        self.buffer_code_last(selector.val);
      }else{
        self.visit(selector);
      }
    });
    self.buffer_code_last('"');
  },
  visit_compound_selector: function(node){
    this.visit_nodes(node.list);
  },
  visit_class_selector: function(node){
    this.buffer_code_last('"+(__made.class_name(__made_prefix, ' + JSON.stringify(node.val) + '))+"');
  },
  visit_type_selector: function(node){
    this.buffer_code_last(node.val);
  },
  visit_universal_selector: function(node){
    this.buffer_code_last('*');
  },
  visit_pseudo_class_selector: function(node){
    var self = this;

    this.buffer_code_last(':');
    if(node.name.type === 'ident'){
      this.buffer_code_last(node.name.val);
    }else if(node.name.type === 'function'){
      this.buffer_code_last(node.name.name + '(');
      node.name.params.forEach(function(param){
        self.buffer_code_last(param.val);
      });
      this.buffer_code_last(')');
    }
  },
  visit_pseudo_element_selector: function(node){
    this.buffer_code_last(':');
    this.visit_pseudo_class_selector(node);
  },
  visit_id_selector: function(node){
    this.buffer_code_last(node.val);
  },
  visit_attrib_selector: function(node){
    this.buffer_code_last('[' + node.name);

    if(node.val){
      this.buffer_code_last('=');

      if(node.val.type === 'string'){
        this.buffer_code_last('\\"' + node.val.val + '\\"');
      }else if(node.val.type === 'ident'){
        this.buffer_code_last(node.val.val);
      }
    }

    this.buffer_code_last(']');
  },
  visit_parent_selector: function(node){
    this.buffer_code_last('&');
  },
  visit_media: function(node){
    this.buffer_text('\n@media ');
    this.visit_text_join(node.query, ',\n');
    this.buffer_text('{');
    this.visit_nodes(node.rule);
    this.buffer_text('\n}');
  },
  visit_media_query: function(node){
    this.visit_text_join(node.val, ' ');
  },
  visit_media_type: function(node){
    this.buffer_text(node.val);
  },
  visit_not: function(node){
    this.buffer_text(node.val);
  },
  visit_only: function(node){
    this.buffer_text(node.val);
  },
  visit_and: function(node){
    this.buffer_text(node.val);
  },
  visit_media_condition: function(node){
    this.buffer_text('(');
    this.buffer_text(node.name);

    if(node.val){
      this.buffer_text(':');
      this.buffer_code('__made_buf.push([')
      this.visit(node.val);
      this.buffer_code_last('].join(" "));');
    }

    this.buffer_text(')');
  },
  visit_media_condition_range: function(node){

    this.buffer_text('(');
    this.buffer_code('__made_buf.push([');

    this.visit_nodes_join(node.val, ',');

    this.buffer_code('].join(""));');
    this.buffer_text(')');
  },
  visit_keyframes: function(node){
    this.buffer_text('\n@keyframes ' + node.name + '{');
    this.visit_nodes(node.rule);
    this.buffer_text('\n}');
  },
  visit_keyframe: function(node){
    this.buffer_text('\n ' + node.selector + '{');
    this.visit_nodes(node.rule, true);
    this.buffer_text('\n }');
  },
  visit_at_rule: function(node){
    this.buffer_text('\n' + node.name + '{');
    this.visit_nodes(node.rule, true);
    this.buffer_text('\n}');
  },
  visit_import: function(node){
    var filename = mid.path(node.id, {
      filename: this.filename,
      basedir: this.options.basedir,
      entry: this.options.entry,
      ext: this.options.ext
    });

    var str, ast;

    if(filename){
      if(node.once && filename in this.external ) return;

      str = fs.readFileSync(filename, 'utf-8');
      ast = new Parser(str, filename).parse();

      this.buffer_code(new Compiler(ast, extend({}, this.options, {
        filename: filename
      })).compile());

    }else{
      console.error('Not find module "', node.id, '" from file "', this.filename, '"');
    }
  }
};

module.exports = Compiler;

































