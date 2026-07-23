'use strict';

function traverseAndCheck (obj, type, results) {
  if (obj instanceof type) {
    results.push(obj);
  }

  if (obj instanceof Node) {
    obj.findAll(type, results);
  }
}

class Node {
  constructor (lineno, colno) {
    this.lineno = lineno;
    this.colno = colno;

    for (let i = 0, len = this.fields.length; i < len; i++) {
      const field = this.fields[i];

      // The first two args are line/col numbers, so offset by 2
      let val = arguments[i + 2];

      // Fields should never be undefined, but null. It makes
      // testing easier to normalize values.
      if (val === undefined) {
        val = null;
      }

      this[field] = val;
    }
  }

  get typename () {
    return this.constructor.name;
  }

  findAll (type, results = []) {
    for (const field of this.fields) {
      traverseAndCheck(this[field], type, results);
    }

    return results;
  }

  iterFields (func) {
    for (const field of this.fields) {
      func(this[field], field);
    }
  }
}

// Abstract nodes
class Value extends Node {
  get fields () {
    return ['value'];
  }
}

// Concrete nodes
class NodeList extends Node {
  constructor (lineno, colno, nodes) {
    super(lineno, colno, nodes ?? []);
  }

  get fields () { return ['children']; }

  addChild (node) {
    this.children.push(node);
  }

  findAll (type, results = []) {
    for (const child of this.children) {
      traverseAndCheck(child, type, results);
    }

    return results;
  }
}

class Root extends NodeList { }
class Literal extends Value { }
class Symbol extends Value { }
class Group extends NodeList { }
class ArrayNode extends NodeList { get typename () { return 'Array'; } }
class Pair extends Node { get fields () { return ['key', 'value']; } }
class Dict extends NodeList { }
class LookupVal extends Node { get fields () { return ['target', 'val']; } }
class If extends Node { get fields () { return ['cond', 'body', 'else_']; } }
class IfAsync extends If { }
class InlineIf extends Node { get fields () { return ['cond', 'body', 'else_']; } }
class For extends Node { get fields () { return ['arr', 'name', 'body', 'else_']; } }
class AsyncEach extends For { }
class AsyncAll extends For { }
class Macro extends Node { get fields () { return ['name', 'args', 'body']; } }
class Caller extends Macro { }
class Import extends Node { get fields () { return ['template', 'target', 'withContext']; } }

class FromImport extends Node {
  get typename () { return 'FromImport'; }
  get fields () { return ['template', 'names', 'withContext']; }

  constructor (lineno, colno, template, names, withContext) {
    super(lineno, colno, template, names ?? new NodeList(), withContext);
  }
}

class FunCall extends Node { get fields () { return ['name', 'args']; } }
class Filter extends FunCall { }
class FilterAsync extends Filter { get fields () { return ['name', 'args', 'symbol']; } }
class KeywordArgs extends Dict { }
class Block extends Node { get fields () { return ['name', 'body']; } }
class Super extends Node { get fields () { return ['blockName', 'symbol']; } }
class TemplateRef extends Node { get fields () { return ['template']; } }
class Extends extends TemplateRef { }
class Include extends Node { get fields () { return ['template', 'ignoreMissing']; } }
class Set extends Node { get fields () { return ['targets', 'value']; } }
class Switch extends Node { get fields () { return ['expr', 'cases', 'default']; } }
class Case extends Node { get fields () { return ['cond', 'body']; } }
class Output extends NodeList { }
class Capture extends Node { get fields () { return ['body']; } }
class TemplateData extends Literal { }
class UnaryOp extends Node { get fields () { return ['target']; } }
class BinOp extends Node { get fields () { return ['left', 'right']; } }
class In extends BinOp { }
class Is extends BinOp { }
class Or extends BinOp { }
class And extends BinOp { }
class Not extends UnaryOp { }
class Add extends BinOp { }
class Concat extends BinOp { }
class Sub extends BinOp { }
class Mul extends BinOp { }
class Div extends BinOp { }
class FloorDiv extends BinOp { }
class Mod extends BinOp { }
class Pow extends BinOp { }
class Neg extends UnaryOp { }
class Pos extends UnaryOp { }
class Compare extends Node { get fields () { return ['expr', 'ops']; } }
class CompareOperand extends Node { get fields () { return ['expr', 'type']; } }
class CallExtension extends Node {
  constructor (ext, prop, args, contentArgs) {
    super();

    this.extName = ext.__name || ext;
    this.prop = prop;
    this.args = args || new NodeList();
    this.contentArgs = contentArgs || [];
    this.autoescape = ext.autoescape;
  }

  get fields () { return ['extName', 'prop', 'args', 'contentArgs']; }
}
class CallExtensionAsync extends CallExtension { }

// This is hacky, but this is just a debugging function anyway
function print (str, indent, inline) {
  const lines = str.split('\n');

  for (let i = 0, len = lines.length; i < len; i++) {
    const line = lines[i];

    if (line && ((inline && i > 0) || !inline)) {
      process.stdout.write((' ').repeat(indent));
    }
    const nl = (i === lines.length - 1) ? '' : '\n';
    process.stdout.write(`${line}${nl}`);
  }
}

// Print the AST in a nicely formatted tree format for debuggin
function printNodes (node, indent) {
  indent = indent || 0;

  print(node.typename + ': ', indent);

  if (node instanceof NodeList) {
    print('\n');
    for (const n of node.children) {
      printNodes(n, indent + 2);
    }
  } else if (node instanceof CallExtension) {
    print(`${node.extName}.${node.prop}\n`);

    if (node.args) {
      printNodes(node.args, indent + 2);
    }

    if (node.contentArgs) {
      for (const n of node.contentArgs) {
        printNodes(n, indent + 2);
      }
    }
  } else {
    const nodes = [];
    let props = null;

    node.iterFields((val, fieldName) => {
      if (val instanceof Node) {
        nodes.push([fieldName, val]);
      } else {
        props = props || {};
        props[fieldName] = val;
      }
    });

    if (props) {
      print(JSON.stringify(props, null, 2) + '\n', null, true);
    } else {
      print('\n');
    }

    for (const [fieldName, n] of nodes) {
      print(`[${fieldName}] =>`, indent + 2);
      printNodes(n, indent + 4);
    }
  }
}

module.exports = {
  Node,
  Root,
  NodeList,
  Value,
  Literal,
  Symbol,
  Group,
  Array: ArrayNode,
  Pair,
  Dict,
  Output,
  Capture,
  TemplateData,
  If,
  IfAsync,
  InlineIf,
  For,
  AsyncEach,
  AsyncAll,
  Macro,
  Caller,
  Import,
  FromImport,
  FunCall,
  Filter,
  FilterAsync,
  KeywordArgs,
  Block,
  Super,
  Extends,
  Include,
  Set,
  Switch,
  Case,
  LookupVal,
  BinOp,
  In,
  Is,
  Or,
  And,
  Not,
  Add,
  Concat,
  Sub,
  Mul,
  Div,
  FloorDiv,
  Mod,
  Pow,
  Neg,
  Pos,
  Compare,
  CompareOperand,

  CallExtension,
  CallExtensionAsync,

  printNodes
};
