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
    entry: 'style.styl',
    ext: '.styl'
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
        this.buf.push('__made_buf.push("' + text + '");');
      }
    }
  },
  visit: function(node){
    var visitor = 'visit_' + node.type;

    if(visitor in this){
      this[visitor](node);
    }else{
      console.error('Unknow Type:', node.type);
    }
  },
  visit_nodes: function(nodes){
    var self = this;

    if(Array.isArray(nodes) && nodes.length){
      nodes.forEach(function(node){
        self.visit(node);
      });
    }
  },
  visit_nodes_is: function(nodes, type){
    var self = this;

    if(Array.isArray(nodes) && nodes.length){
      nodes.forEach(function(node){
        if(node.type === type){
          self.visit(node);
        }
      });
    }
  },
  visit_nodes_not: function(nodes, type){
    var self = this;

    if(Array.isArray(nodes) && nodes.length){
      nodes.forEach(function(node){
        if(node.type !== type){
          self.visit(node);
        }
      });
    }
  },
  visit_stylesheet: function(node){
    this.visit_nodes(node.rule);
    this.clear_text_buf();
  },
  visit_declaration_set: function(node){
    if(node.rule){
      this.buffer_code('(function(__made_parent){');
      this.buffer_code('var __selector_list = [];');
      this.visit(node.selector);
      this.buffer_code('var __made_parent = __made.parent(__made_parent, __selector_list, __made_prefix);');
      this.buffer_code('__made_buf.push(__made.selector(__made_parent));');
      this.buffer_code('__made_buf.push("{");');
      this.visit_nodes_is(node.rule, 'declaration');
      this.buffer_code('__made_buf.push("\\n}\\n");');
      this.visit_nodes_not(node.rule, 'declaration');
      this.buffer_code('})(__made_parent);');
    }
  },
  visit_selector_list: function(node){
    this.visit_nodes(node.nodes);
  },
  visit_selector: function(node){
    this.buffer_code('__selector_list.push(' + JSON.stringify(node.val) + ');');
  },
  visit_declaration: function(node){
    this.buffer_code('__made_buf.push(__made.declaration(["' + node.property + '",((typeof ' + node.property.replace(/-/g,'_') + ' === "undefined")?undefined:' + node.property.replace(/-/g,'_') + ')],');
    this.visit(node.val);
    this.buffer_code_last(', __made_parent));');
  },
  visit_value:function(node){
    this.buffer_code_last('[')

    for(var i = 0; i < (node.expr.length-1); i++){
      this.visit(node.expr[i]);
      this.buffer_code_last(',');
    }
    this.visit(node.expr[node.expr.length-1]);
    this.buffer_code_last(']');
  },
  visit_expr: function(node){
    for(var i = 0; i < (node.term.length-1); i++){
      if(node.term[i].type){
        this.visit(node.term[i]);
      }else{
        this.buffer_code_last('"' + node.term[i] + '"');
      }
      this.buffer_code_last('+');
    }

    if(node.term[node.term.length-1].type){
      this.visit(node.term[node.term.length-1]);
    }else{
      this.buffer_code_last('"' + node.term[node.term.length-1] + '"');
    }
  },
  visit_ident: function(node){
    this.buffer_code_last('__made.ident(((typeof ' + node.name.replace(/-/g,'_') + ' === "undefined")?undefined:' + node.name.replace(/-/g,'_') + '),"' + node.name + '")');
  },
  visit_function: function(node){
    this.buffer_code_last('__made.func("' + node.name + '",');
    this.visit(node.args);
    this.buffer_code_last(', ' + JSON.stringify(this.options) + ')');
  },
  visit_root: function(node){
    this.buffer_code('(function(){');
    this.buffer_code('var __made_prefix = "' + this.sid + '-";');
    this.visit_nodes_not(node.rule, 'declaration');
    this.buffer_code('})();');
  },
  visit_variable: function(node){
    this.buffer_code('var ' + node.name.replace(/-/g,'_') + '= ');
    this.visit(node.val);
    this.buffer_code_last('.join(" ");');
  },
  visit_mixin: function(node){
    var self = this;

    this.buffer_code('function ' + node.name.replace(/-/g,'_') + '(__made_args, __made_parent){');

    for(var i = 0; i < node.param.length; i++){
      if(node.param[i].type === 'reset_param'){
        this.buffer_code('var ' + node.param[i].name + ' = __made_args.slice(' + i + ').join(" ");');
      }else{
        this.buffer_code('var ' + node.param[i] +' = __made_args[' + i + '];');
      }
    }

    node.rule.forEach(function(rule){
      if(rule.type === 'declaration'){
        if(rule.property === node.name){
          self.buffer_code('__made_buf.push("\\n' + rule.property + ':"+');
          self.visit(rule.val);
          self.buffer_code_last('.join(" ") + ";");');
        }else{
          self.visit(rule);
        }
      }
    });

    this.buffer_code('}');
  },
  visit_import: function(node){
    var filename = mid.path(node.id, this.options);

    if(node.once){
      if(filename in this.external){
        return;
      }else{
        this.external[filename] = true;
      }
    }

    var str = fs.readFileSync(filename, 'utf-8');

    var options = extend({}, this.options, {
      filename: filename,
      external: this.external
    });
    var ast = new Parser(str, filename).parse();
    var compiler = new Compiler(ast, options);

    this.buffer_code(compiler.compile());
  },
  visit_comment: function(node){
    this.buffer_code('__made_buf.push("\\n" + ' + JSON.stringify('/*' + node.val + '*/') + ' + "\\n");');
  },
  visit_at_rule: function(node){
    this.buffer_code('__made_buf.push(' + JSON.stringify(node.name) + ');');
    this.buffer_code('__made_buf.push("{");');
    this.visit_nodes(node.rule);
    this.buffer_code('__made_buf.push("\\n}");');
  },
  visit_keyframes: function(node){
    this.buffer_code('__made_buf.push("@keyframes " +' + JSON.stringify(node.name) + ');')
    this.buffer_code('__made_buf.push("{\\n");');
    this.visit(node.rule);
    this.buffer_code('__made_buf.push("\\n}\\n");');
  },
  visit_keyframe_list: function(node){
    this.visit_nodes(node.nodes);
  },
  visit_keyframe: function(node){
    this.buffer_code('__made_buf.push("' + node.selector + '")');
    this.buffer_code('__made_buf.push("{");');
    this.visit(node.rule);
    this.buffer_code('__made_buf.push("\\n}\\n");');
  },
  visit_declaration_list: function(node){
    this.visit_nodes(node.nodes);
  },
  visit_media: function(node){
    this.buffer_code('__made_buf.push("@media ");');
    this.buffer_code('__made_buf.push(' + JSON.stringify(node.query.join(',')) + ');');
    this.buffer_code('__made_buf.push("{");');
    this.visit_nodes(node.rule);
    this.buffer_code('__made_buf.push("\\n}\\n");');
  }
};

module.exports = Compiler;

































