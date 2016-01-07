/**
 * Made-Style Runtime
 * @author: SimonHao
 * @date:   2015-12-06 11:33:59
 */

'use strict';

var func_list = {};

exports.set = function(func){
  func_list = func || {};
};

exports.func = function(name, args, options){
  if(name in func_list){
    return func_list[name](args, options);
  }else{
    return name + '(' + args.join(',') + ')';
  }
};

exports.class_name = function(prefix, name){
  if(prefix){
    return '.' + prefix + '-' + name;
  }else{
    return '.' + name;
  }
};

exports.parent = function(parent_list, selector_list){
  var result_list = [];

  if(parent_list.length){
    selector_list.forEach(function(selector){
      parent_list.forEach(function(parent){
        if(selector[0] === '&'){
          result_list.push(parent + selector.substring(1));
        }else{
          result_list.push(parent + ' ' + selector);
        }
      });
    });
  }else{
    selector_list.forEach(function(selector){
      if(selector[0] === '&'){
        result_list.push(selector.substring(1));
      }else{
        result_list.push(selector);
      }
    });
  }

  return result_list;
};

exports.ident = function(variable, ident){
  if(variable && typeof variable !== 'function'){
    return variable;
  }else{
    return ident;
  }
};

exports.declaration = function(mixin, mixin_name, property_name, value_list, made_buf, made_parent, call_stack){
  if((typeof mixin === 'function') && call_stack.indexOf(mixin_name) < 0){
    mixin(value_list, made_parent, call_stack);
  }else{
    made_buf.push('\n  ' + property_name + ' : ');
    made_buf.push(value_list.join(' '));
    made_buf.push(';');
  }
};






