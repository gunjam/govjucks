'use strict';

const { Obj } = require('./object');

function traverseAndCheck (obj, type, results) {
  if (obj instanceof type) {
    results.push(obj);
  }

  if (obj instanceof Node) {
    obj.findAll(type, results);
  }
}

class Node extends Obj {
  init (lineno, colno, ...args) {
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

  findAll (type, results) {
    results = results || [];

    if (this instanceof NodeList) {
      for (const child of this.children) {
        traverseAndCheck(child, type, results);
      }
    } else {
      for (const field of this.fields) {
        traverseAndCheck(this[field], type, results);
      }
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
  get typename () { return 'Value'; }
  get fields () {
    return ['value'];
  }
}

// Concrete nodes
class NodeList extends Node {
  get typename () { return 'NodeList'; }
  get fields () { return ['children']; }

  init (lineno, colno, nodes) {
    super.init(lineno, colno, nodes || []);
  }

  addChild (node) {
    this.children.push(node);
  }
}

const Root = NodeList.extend('Root');
const Literal = Value.extend('Literal');
const Symbol = Value.extend('Symbol');
const Group = NodeList.extend('Group');
const ArrayNode = NodeList.extend('Array');
const Pair = Node.extend('Pair', { fields: ['key', 'value'] });
const Dict = NodeList.extend('Dict');
const LookupVal = Node.extend('LookupVal', { fields: ['target', 'val'] });
const If = Node.extend('If', { fields: ['cond', 'body', 'else_'] });
const IfAsync = If.extend('IfAsync');
const InlineIf = Node.extend('InlineIf', { fields: ['cond', 'body', 'else_'] });
const For = Node.extend('For', { fields: ['arr', 'name', 'body', 'else_'] });
const AsyncEach = For.extend('AsyncEach');
const AsyncAll = For.extend('AsyncAll');
const Macro = Node.extend('Macro', { fields: ['name', 'args', 'body'] });
const Caller = Macro.extend('Caller');
const Import = Node.extend('Import', { fields: ['template', 'target', 'withContext'] });

class FromImport extends Node {
  get typename () { return 'FromImport'; }
  get fields () { return ['template', 'names', 'withContext']; }

  init (lineno, colno, template, names, withContext) {
    super.init(lineno, colno, template, names || new NodeList(), withContext);
  }
}

const FunCall = Node.extend('FunCall', { fields: ['name', 'args'] });
const Filter = FunCall.extend('Filter');
const FilterAsync = Filter.extend('FilterAsync', { fields: ['name', 'args', 'symbol'] });
const KeywordArgs = Dict.extend('KeywordArgs');
const Block = Node.extend('Block', { fields: ['name', 'body'] });
const Super = Node.extend('Super', { fields: ['blockName', 'symbol'] });
const TemplateRef = Node.extend('TemplateRef', { fields: ['template'] });
const Extends = TemplateRef.extend('Extends');
const Include = Node.extend('Include', { fields: ['template', 'ignoreMissing'] });
const Set = Node.extend('Set', { fields: ['targets', 'value'] });
const Switch = Node.extend('Switch', { fields: ['expr', 'cases', 'default'] });
const Case = Node.extend('Case', { fields: ['cond', 'body'] });
const Output = NodeList.extend('Output');
const Capture = Node.extend('Capture', { fields: ['body'] });
const TemplateData = Literal.extend('TemplateData');
const UnaryOp = Node.extend('UnaryOp', { fields: ['target'] });
const BinOp = Node.extend('BinOp', { fields: ['left', 'right'] });
const In = BinOp.extend('In');
const Is = BinOp.extend('Is');
const Or = BinOp.extend('Or');
const And = BinOp.extend('And');
const Not = UnaryOp.extend('Not');
const Add = BinOp.extend('Add');
const Concat = BinOp.extend('Concat');
const Sub = BinOp.extend('Sub');
const Mul = BinOp.extend('Mul');
const Div = BinOp.extend('Div');
const FloorDiv = BinOp.extend('FloorDiv');
const Mod = BinOp.extend('Mod');
const Pow = BinOp.extend('Pow');
const Neg = UnaryOp.extend('Neg');
const Pos = UnaryOp.extend('Pos');
const Compare = Node.extend('Compare', { fields: ['expr', 'ops'] });
const CompareOperand = Node.extend('CompareOperand', { fields: ['expr', 'type'] });
const CallExtension = Node.extend('CallExtension', {
  init (ext, prop, args, contentArgs) {
    this.parent();
    this.extName = ext.__name || ext;
    this.prop = prop;
    this.args = args || new NodeList();
    this.contentArgs = contentArgs || [];
    this.autoescape = ext.autoescape;
  },
  fields: ['extName', 'prop', 'args', 'contentArgs']
});
const CallExtensionAsync = CallExtension.extend('CallExtensionAsync');

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
