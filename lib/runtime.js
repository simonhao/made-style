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

exports.func = function(name, args){
  if(name in func_list){
    return func_list[name](args);
  }else{
    return name + '(' + args.join(' ') + ')';
  }
};

exports.parent = function(parent_list, selector_list, prefix){
  var result = [];

  function deal_selector(selector, parent, prefix){
    var complex_selector = '';

    if(selector[0] === '&'){
      complex_selector = parent + selector.substring(1);
    }else if(selector[0] === '.'){
      complex_selector = (parent?(parent + ' '):'') + '.' + prefix + selector.substring(1);
    }else{
      complex_selector = (parent?(parent + ' '):'') + selector;
    }

    return complex_selector;
  };

  if(parent_list.length){
    parent_list.forEach(function(parent){
      selector_list.forEach(function(selector){
        result.push(deal_selector(selector, parent, prefix));
      });
    });
  }else{
    selector_list.forEach(function(selector){
      result.push(deal_selector(selector, '', prefix));
    });
  }

  return result;
};

exports.selector = function(selector_list){
  return selector_list.join(',\n');
};

exports.ident = function(variable, ident){
  if(variable && typeof variable !== 'function'){
    return variable;
  }else{
    return ident;
  }
};

exports.declaration = function(property, value, parent){
  var result = '\n';

  if(typeof property[1] === 'function'){
    property[1](value, parent);
  }else{
    result += property[0] + ':' + value.join(' ') + ';';
  }

  return result;
};






