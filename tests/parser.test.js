'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const lib = require('../src/lib');
const nodes = require('../src/nodes');
const parser = require('../src/parser');

function _isAST (node1, node2) {
  // Compare ASTs
  // TODO: Clean this up (seriously, really)

  assert.equal(node1.typename, node2.typename);

  if (node2 instanceof nodes.NodeList) {
    const lit = ': num-children: ';
    const sig2 = (node2.typename + lit + node2.children.length);

    assert.ok(node1.children);
    const sig1 = (node1.typename + lit + node1.children.length);

    assert.equal(sig1, sig2);

    for (let n = 0, l = node2.children.length; n < l; n++) {
      _isAST(node1.children[n], node2.children[n]);
    }
  } else {
    node2.iterFields(function (value, field) {
      const ofield = node1[field];

      if (value instanceof nodes.Node) {
        _isAST(ofield, value);
      } else if (Array.isArray(ofield) && Array.isArray(value)) {
        assert.equal('num-children: ' + ofield.length, 'num-children: ' + value.length);

        lib.each(ofield, function (v, i) {
          if (ofield[i] instanceof nodes.Node) {
            _isAST(ofield[i], value[i]);
          } else if (ofield[i] !== null && value[i] !== null) {
            assert.equal(ofield[i], value[i]);
          }
        });
      } else if ((ofield !== null || value !== null) &&
        (ofield !== undefined || value !== undefined)) {
        if (ofield === null) {
          throw new Error(value + ' expected for "' + field +
            '", null found');
        }

        if (value === null) {
          throw new Error(ofield + ' expected to be null for "' +
            field + '"');
        }

        // We want good errors and tracebacks, so test on
        // whichever object exists
        if (!ofield) {
          assert.equal(value, ofield);
        } else if (ofield !== null && ofield instanceof RegExp) {
          // This conditional check for RegExp is needed because /a/ != /a/
          assert.equal(String(ofield), String(value));
        } else {
          assert.equal(ofield, value);
        }
      }
    });
  }
}

function isAST (node1, ast) {
  // Compare the ASTs, the second one is an AST literal so transform
  // it into a real one
  return _isAST(node1, toNodes(ast));
}

// We'll be doing a lot of AST comparisons, so this defines a kind
// of "AST literal" that you can specify with arrays. This
// transforms it into a real AST.
function toNodes (ast) {
  if (!(ast && Array.isArray(ast))) {
    return ast;
  }

  const Type = ast[0];
  // some nodes have fields (e.g. Compare.ops) which are plain arrays
  if (Type instanceof Array) {
    return lib.map(ast, toNodes);
  }
  const F = function () {};
  F.prototype = Type.prototype;

  const dummy = new F();

  if (dummy instanceof nodes.NodeList) {
    return new Type(0, 0, lib.map(ast.slice(1), toNodes));
  } else if (dummy instanceof nodes.CallExtension) {
    return new Type(ast[1], ast[2], ast[3] ? toNodes(ast[3]) : ast[3],
      Array.isArray(ast[4]) ? lib.map(ast[4], toNodes) : ast[4]);
  } else {
    return new Type(0, 0,
      toNodes(ast[1]),
      toNodes(ast[2]),
      toNodes(ast[3]),
      toNodes(ast[4]),
      toNodes(ast[5]));
  }
}

describe('parser', function () {
  it('should parse basic types', function () {
    isAST(parser.parse('{{ 1 }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, 1]]]);

    isAST(parser.parse('{{ 4.567 }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, 4.567]]]);

    isAST(parser.parse('{{ "foo" }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, 'foo']]]);

    isAST(parser.parse('{{ \'foo\' }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, 'foo']]]);

    isAST(parser.parse('{{ true }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, true]]]);

    isAST(parser.parse('{{ false }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, false]]]);

    isAST(parser.parse('{{ none }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, null]]]);

    isAST(parser.parse('{{ foo }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Symbol, 'foo']]]);

    isAST(parser.parse('{{ r/23/gi }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Literal, /23/gi]]]);
  });

  it('should parse aggregate types', function () {
    isAST(parser.parse('{{ [1,2,3] }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Array,
            [nodes.Literal, 1],
            [nodes.Literal, 2],
            [nodes.Literal, 3]]]]);

    isAST(parser.parse('{{ (1,2,3) }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Group,
            [nodes.Literal, 1],
            [nodes.Literal, 2],
            [nodes.Literal, 3]]]]);

    isAST(parser.parse('{{ {foo: 1, \'two\': 2} }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Dict,
            [nodes.Pair,
              [nodes.Symbol, 'foo'],
              [nodes.Literal, 1]],
            [nodes.Pair,
              [nodes.Literal, 'two'],
              [nodes.Literal, 2]]]]]);
  });

  it('should parse variables', function () {
    isAST(parser.parse('hello {{ foo }}, how are you'),
      [nodes.Root,
        [nodes.Output, [nodes.TemplateData, 'hello ']],
        [nodes.Output, [nodes.Symbol, 'foo']],
        [nodes.Output, [nodes.TemplateData, ', how are you']]]);
  });

  it('should parse operators', function () {
    isAST(parser.parse('{{ x == y }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Compare,
            [nodes.Symbol, 'x'],
            [[nodes.CompareOperand, [nodes.Symbol, 'y'], '==']]]]]);

    isAST(parser.parse('{{ x or y }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Or,
            [nodes.Symbol, 'x'],
            [nodes.Symbol, 'y']]]]);

    isAST(parser.parse('{{ x in y }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.In,
            [nodes.Symbol, 'x'],
            [nodes.Symbol, 'y']]]]);

    isAST(parser.parse('{{ x not in y }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Not,
            [nodes.In,
              [nodes.Symbol, 'x'],
              [nodes.Symbol, 'y']]]]]);

    isAST(parser.parse('{{ x is callable }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Is,
            [nodes.Symbol, 'x'],
            [nodes.Symbol, 'callable']]]]);

    isAST(parser.parse('{{ x is not callable }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Not,
            [nodes.Is,
              [nodes.Symbol, 'x'],
              [nodes.Symbol, 'callable']]]]]);
  });

  it('should parse tilde', function () {
    isAST(parser.parse('{{ 2 ~ 3 }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Concat,
            [nodes.Literal, 2],
            [nodes.Literal, 3]
          ]]]
    );
  });

  it('should parse operators with correct precedence', function () {
    isAST(parser.parse('{{ x in y and z }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.And,
            [nodes.In,
              [nodes.Symbol, 'x'],
              [nodes.Symbol, 'y']],
            [nodes.Symbol, 'z']]]]);

    isAST(parser.parse('{{ x not in y or z }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Or,
            [nodes.Not,
              [nodes.In,
                [nodes.Symbol, 'x'],
                [nodes.Symbol, 'y']]],
            [nodes.Symbol, 'z']]]]);

    isAST(parser.parse('{{ x or y and z }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Or,
            [nodes.Symbol, 'x'],
            [nodes.And,
              [nodes.Symbol, 'y'],
              [nodes.Symbol, 'z']]]]]);
  });

  it('should parse blocks', function () {
    let n = parser.parse('want some {% if hungry %}pizza{% else %}' +
      'water{% endif %}?');
    assert.equal(n.children[1].typename, 'If');

    n = parser.parse('{% block foo %}stuff{% endblock %}');
    assert.equal(n.children[0].typename, 'Block');

    n = parser.parse('{% block foo %}stuff{% endblock foo %}');
    assert.equal(n.children[0].typename, 'Block');

    n = parser.parse('{% extends "test.njk" %}stuff');
    assert.equal(n.children[0].typename, 'Extends');

    n = parser.parse('{% include "test.njk" %}');
    assert.equal(n.children[0].typename, 'Include');
  });

  it('should accept attributes and methods of static arrays, objects and primitives', function () {
    assert.doesNotThrow(function () {
      parser.parse('{{ ([1, 2, 3]).indexOf(1) }}');
    });

    assert.doesNotThrow(function () {
      parser.parse('{{ [1, 2, 3].length }}');
    });

    assert.doesNotThrow(function () {
      parser.parse('{{ "Some String".replace("S", "$") }}');
    });

    assert.doesNotThrow(function () {
      parser.parse('{{ ({ name : "Khalid" }).name }}');
    });

    assert.doesNotThrow(function () {
      parser.parse('{{ 1.618.toFixed(2) }}');
    });
  });

  it('should parse include tags', function () {
    let n = parser.parse('{% include "test.njk" %}');
    assert.equal(n.children[0].typename, 'Include');

    n = parser.parse('{% include "test.html"|replace("html","j2") %}');
    assert.equal(n.children[0].typename, 'Include');

    n = parser.parse('{% include ""|default("test.njk") %}');
    assert.equal(n.children[0].typename, 'Include');
  });

  it('should parse for loops', function () {
    isAST(parser.parse('{% for x in [1, 2] %}{{ x }}{% endfor %}'),
      [nodes.Root,
        [nodes.For,
          [nodes.Array,
            [nodes.Literal, 1],
            [nodes.Literal, 2]],
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.Symbol, 'x']]]]]);
  });

  it('should parse for loops with else', function () {
    isAST(parser.parse('{% for x in [] %}{{ x }}{% else %}empty{% endfor %}'),
      [nodes.Root,
        [nodes.For,
          [nodes.Array],
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.Symbol, 'x']]],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'empty']]]]]);
  });

  it('should parse filters', function () {
    isAST(parser.parse('{{ foo | bar }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Filter,
            [nodes.Symbol, 'bar'],
            [nodes.NodeList,
              [nodes.Symbol, 'foo']]]]]);

    isAST(parser.parse('{{ foo | bar | baz }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Filter,
            [nodes.Symbol, 'baz'],
            [nodes.NodeList,
              [nodes.Filter,
                [nodes.Symbol, 'bar'],
                [nodes.NodeList,
                  [nodes.Symbol, 'foo']]]]]]]);

    isAST(parser.parse('{{ foo | bar(3) }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.Filter,
            [nodes.Symbol, 'bar'],
            [nodes.NodeList,
              [nodes.Symbol, 'foo'],
              [nodes.Literal, 3]]]]]);
  });

  it('should parse macro definitions', function () {
    const ast = parser.parse('{% macro foo(bar, baz="foobar") %}' +
      'This is a macro' +
      '{% endmacro %}');
    isAST(ast,
      [nodes.Root,
        [nodes.Macro,
          [nodes.Symbol, 'foo'],
          [nodes.NodeList,
            [nodes.Symbol, 'bar'],
            [nodes.KeywordArgs,
              [nodes.Pair,
                [nodes.Symbol, 'baz'], [nodes.Literal, 'foobar']]]],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'This is a macro']]]]]);
  });

  it('should parse call blocks', function () {
    const ast = parser.parse('{% call foo("bar") %}' +
      'This is the caller' +
      '{% endcall %}');
    isAST(ast,
      [nodes.Root,
        [nodes.Output,
          [nodes.FunCall,
            [nodes.Symbol, 'foo'],
            [nodes.NodeList,
              [nodes.Literal, 'bar'],
              [nodes.KeywordArgs,
                [nodes.Pair,
                  [nodes.Symbol, 'caller'],
                  [nodes.Caller,
                    [nodes.Symbol, 'caller'],
                    [nodes.NodeList],
                    [nodes.NodeList,
                      [nodes.Output,
                        [nodes.TemplateData, 'This is the caller']]]]]]]]]]);
  });

  it('should parse call blocks with args', function () {
    const ast = parser.parse('{% call(i) foo("bar", baz="foobar") %}' +
      'This is {{ i }}' +
      '{% endcall %}');
    isAST(ast,
      [nodes.Root,
        [nodes.Output,
          [nodes.FunCall,
            [nodes.Symbol, 'foo'],
            [nodes.NodeList,
              [nodes.Literal, 'bar'],
              [nodes.KeywordArgs,
                [nodes.Pair,
                  [nodes.Symbol, 'baz'], [nodes.Literal, 'foobar']],
                [nodes.Pair,
                  [nodes.Symbol, 'caller'],
                  [nodes.Caller,
                    [nodes.Symbol, 'caller'],
                    [nodes.NodeList, [nodes.Symbol, 'i']],
                    [nodes.NodeList,
                      [nodes.Output,
                        [nodes.TemplateData, 'This is ']],
                      [nodes.Output,
                        [nodes.Symbol, 'i']]]]]]]]]]);
  });

  it('should parse raw', function () {
    isAST(parser.parse('{% raw %}hello {{ {% %} }}{% endraw %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'hello {{ {% %} }}']]]);
  });

  it('should parse raw with broken variables', function () {
    isAST(parser.parse('{% raw %}{{ x }{% endraw %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{{ x }']]]);
  });

  it('should parse raw with broken blocks', function () {
    isAST(parser.parse('{% raw %}{% if i_am_stupid }Still do your job well{% endraw %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{% if i_am_stupid }Still do your job well']]]);
  });

  it('should parse raw with pure text', function () {
    isAST(parser.parse('{% raw %}abc{% endraw %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'abc']]]);
  });

  it('should parse raw with raw blocks', function () {
    isAST(parser.parse('{% raw %}{% raw %}{{ x }{% endraw %}{% endraw %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{% raw %}{{ x }{% endraw %}']]]);
  });

  it('should parse raw with comment blocks', function () {
    isAST(parser.parse('{% raw %}{# test {% endraw %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{# test ']]]);
  });

  it('should parse multiple raw blocks', function () {
    isAST(parser.parse('{% raw %}{{ var }}{% endraw %}{{ var }}{% raw %}{{ var }}{% endraw %}'),
      [nodes.Root,
        [nodes.Output, [nodes.TemplateData, '{{ var }}']],
        [nodes.Output, [nodes.Symbol, 'var']],
        [nodes.Output, [nodes.TemplateData, '{{ var }}']]]);
  });

  it('should parse multiline multiple raw blocks', function () {
    isAST(parser.parse('\n{% raw %}{{ var }}{% endraw %}\n{{ var }}\n{% raw %}{{ var }}{% endraw %}\n'),
      [nodes.Root,
        [nodes.Output, [nodes.TemplateData, '\n']],
        [nodes.Output, [nodes.TemplateData, '{{ var }}']],
        [nodes.Output, [nodes.TemplateData, '\n']],
        [nodes.Output, [nodes.Symbol, 'var']],
        [nodes.Output, [nodes.TemplateData, '\n']],
        [nodes.Output, [nodes.TemplateData, '{{ var }}']],
        [nodes.Output, [nodes.TemplateData, '\n']]]);
  });

  it('should parse verbatim', function () {
    isAST(parser.parse('{% verbatim %}hello {{ {% %} }}{% endverbatim %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'hello {{ {% %} }}']]]);
  });

  it('should parse verbatim with broken variables', function () {
    isAST(parser.parse('{% verbatim %}{{ x }{% endverbatim %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{{ x }']]]);
  });

  it('should parse verbatim with broken blocks', function () {
    isAST(parser.parse('{% verbatim %}{% if i_am_stupid }Still do your job well{% endverbatim %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{% if i_am_stupid }Still do your job well']]]);
  });

  it('should parse verbatim with pure text', function () {
    isAST(parser.parse('{% verbatim %}abc{% endverbatim %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'abc']]]);
  });

  it('should parse verbatim with verbatim blocks', function () {
    isAST(parser.parse('{% verbatim %}{% verbatim %}{{ x }{% endverbatim %}{% endverbatim %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{% verbatim %}{{ x }{% endverbatim %}']]]);
  });

  it('should parse verbatim with comment blocks', function () {
    isAST(parser.parse('{% verbatim %}{# test {% endverbatim %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, '{# test ']]]);
  });

  it('should parse multiple verbatim blocks', function () {
    isAST(parser.parse('{% verbatim %}{{ var }}{% endverbatim %}{{ var }}{% verbatim %}{{ var }}{% endverbatim %}'),
      [nodes.Root,
        [nodes.Output, [nodes.TemplateData, '{{ var }}']],
        [nodes.Output, [nodes.Symbol, 'var']],
        [nodes.Output, [nodes.TemplateData, '{{ var }}']]]);
  });

  it('should parse multiline multiple verbatim blocks', function () {
    isAST(parser.parse('\n{% verbatim %}{{ var }}{% endverbatim %}\n{{ var }}\n{% verbatim %}{{ var }}{% endverbatim %}\n'),
      [nodes.Root,
        [nodes.Output, [nodes.TemplateData, '\n']],
        [nodes.Output, [nodes.TemplateData, '{{ var }}']],
        [nodes.Output, [nodes.TemplateData, '\n']],
        [nodes.Output, [nodes.Symbol, 'var']],
        [nodes.Output, [nodes.TemplateData, '\n']],
        [nodes.Output, [nodes.TemplateData, '{{ var }}']],
        [nodes.Output, [nodes.TemplateData, '\n']]]);
  });

  it('should parse switch statements', function () {
    const tpl = '{% switch foo %}{% case "bar" %}BAR{% case "baz" %}BAZ{% default %}NEITHER FOO NOR BAR{% endswitch %}';
    isAST(parser.parse(tpl),
      [nodes.Root,
        [nodes.Switch,
          [nodes.Symbol, 'foo'],
          [
            [nodes.Case,
              [nodes.Literal, 'bar'],
              [nodes.NodeList,
                [nodes.Output,
                  [nodes.TemplateData, 'BAR']]]],
            [nodes.Case,
              [nodes.Literal, 'baz'],
              [nodes.NodeList,
                [nodes.Output,
                  [nodes.TemplateData, 'BAZ']]]]],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'NEITHER FOO NOR BAR']]]]]);
  });

  it('should parse keyword and non-keyword arguments', function () {
    isAST(parser.parse('{{ foo("bar", falalalala, baz="foobar") }}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.FunCall,
            [nodes.Symbol, 'foo'],
            [nodes.NodeList,
              [nodes.Literal, 'bar'],
              [nodes.Symbol, 'falalalala'],
              [nodes.KeywordArgs,
                [nodes.Pair,
                  [nodes.Symbol, 'baz'],
                  [nodes.Literal, 'foobar']]]]]]]);
  });

  it('should parse imports', function () {
    isAST(parser.parse('{% import "foo/bar.njk" as baz %}'),
      [nodes.Root,
        [nodes.Import,
          [nodes.Literal, 'foo/bar.njk'],
          [nodes.Symbol, 'baz']]]);

    isAST(parser.parse('{% from "foo/bar.njk" import baz, foobar as foobarbaz %}'),
      [nodes.Root,
        [nodes.FromImport,
          [nodes.Literal, 'foo/bar.njk'],
          [nodes.NodeList,
            [nodes.Symbol, 'baz'],
            [nodes.Pair,
              [nodes.Symbol, 'foobar'],
              [nodes.Symbol, 'foobarbaz']]]]]);

    isAST(parser.parse('{% import "foo/bar.html"|replace("html", "j2") as baz %}'),
      [nodes.Root,
        [nodes.Import,
          [nodes.Filter,
            [nodes.Symbol, 'replace'],
            [nodes.NodeList,
              [nodes.Literal, 'foo/bar.html'],
              [nodes.Literal, 'html'],
              [nodes.Literal, 'j2']
            ]
          ],
          [nodes.Symbol, 'baz']]]);

    isAST(parser.parse('{% from ""|default("foo/bar.njk") import baz, foobar as foobarbaz %}'),
      [nodes.Root,
        [nodes.FromImport,
          [nodes.Filter,
            [nodes.Symbol, 'default'],
            [nodes.NodeList,
              [nodes.Literal, ''],
              [nodes.Literal, 'foo/bar.njk']
            ]
          ],
          [nodes.NodeList,
            [nodes.Symbol, 'baz'],
            [nodes.Pair,
              [nodes.Symbol, 'foobar'],
              [nodes.Symbol, 'foobarbaz']]]]]);
  });

  it('should parse whitespace control', function () {
    // Every start/end tag with "-" should trim the whitespace
    // before or after it

    isAST(parser.parse('{% if x %}\n  hi \n{% endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, '\n  hi \n']]]]]);

    isAST(parser.parse('{% if x -%}\n  hi \n{% endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'hi \n']]]]]);

    isAST(parser.parse('{% if x %}\n  hi \n{%- endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, '\n  hi']]]]]);

    isAST(parser.parse('{% if x -%}\n  hi \n{%- endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'hi']]]]]);

    isAST(parser.parse('poop  \n{%- if x -%}\n  hi \n{%- endif %}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'poop']],
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'hi']]]]]);

    isAST(parser.parse('hello \n{#- comment #}'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'hello']]]);

    isAST(parser.parse('{# comment -#} \n world'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'world']]]);

    isAST(parser.parse('hello \n{#- comment -#} \n world'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'hello']],
        [nodes.Output,
          [nodes.TemplateData, 'world']]]);

    isAST(parser.parse('hello \n{# - comment - #} \n world'),
      [nodes.Root,
        [nodes.Output,
          [nodes.TemplateData, 'hello \n']],
        [nodes.Output,
          [nodes.TemplateData, ' \n world']]]);

    // The from statement required a special case so make sure to
    // test it
    isAST(parser.parse('{% from x import y %}\n  hi \n'),
      [nodes.Root,
        [nodes.FromImport,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Symbol, 'y']]],
        [nodes.Output,
          [nodes.TemplateData, '\n  hi \n']]]);

    isAST(parser.parse('{% from x import y -%}\n  hi \n'),
      [nodes.Root,
        [nodes.FromImport,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Symbol, 'y']]],
        [nodes.Output,
          [nodes.TemplateData, 'hi \n']]]);

    isAST(parser.parse('{% if x -%}{{y}} {{z}}{% endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              [nodes.Symbol, 'y']],
            [nodes.Output,
              // the value of TemplateData should be ' ' instead of ''
              [nodes.TemplateData, ' ']],
            [nodes.Output,
              [nodes.Symbol, 'z']]]]]);

    isAST(parser.parse('{% if x -%}{% if y %} {{z}}{% endif %}{% endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.If,
              [nodes.Symbol, 'y'],
              [nodes.NodeList,
                [nodes.Output,
                  // the value of TemplateData should be ' ' instead of ''
                  [nodes.TemplateData, ' ']],
                [nodes.Output,
                  [nodes.Symbol, 'z']]
              ]]]]]);

    isAST(parser.parse('{% if x -%}{# comment #} {{z}}{% endif %}'),
      [nodes.Root,
        [nodes.If,
          [nodes.Symbol, 'x'],
          [nodes.NodeList,
            [nodes.Output,
              // the value of TemplateData should be ' ' instead of ''
              [nodes.TemplateData, ' ']],
            [nodes.Output,
              [nodes.Symbol, 'z']]]]]);
  });

  it('should throw errors', function () {
    assert.throws(function () {
      parser.parse('hello {{ foo');
    }, { message: /expected variable end/ });

    assert.throws(function () {
      parser.parse('hello {% if');
    }, { message: /expected expression/ });

    assert.throws(function () {
      parser.parse('hello {% if sdf zxc');
    }, { message: /expected block end/ });

    assert.throws(function () {
      parser.parse('{% include "foo %}');
    }, { message: /expected block end/ });

    assert.throws(function () {
      parser.parse('hello {% if sdf %} data');
    }, { message: /expected elif, else, or endif/ });

    assert.throws(function () {
      parser.parse('hello {% block sdf %} data');
    }, { message: /expected endblock/ });

    assert.throws(function () {
      parser.parse('hello {% block sdf %} data{% endblock foo %}');
    }, { message: /expected block end/ });

    assert.throws(function () {
      parser.parse('hello {% bar %} dsfsdf');
    }, { message: /unknown block tag/ });

    assert.throws(function () {
      parser.parse('{{ foo(bar baz) }}');
    }, { message: /expected comma after expression/ });

    assert.throws(function () {
      parser.parse('{% import "foo" %}');
    }, { message: /expected "as" keyword/ });

    assert.throws(function () {
      parser.parse('{% from "foo" %}');
    }, { message: /expected import/ });

    assert.throws(function () {
      parser.parse('{% from "foo" import bar baz %}');
    }, { message: /expected comma/ });

    assert.throws(function () {
      parser.parse('{% from "foo" import _bar %}');
    }, { message: /names starting with an underscore cannot be imported/ });
  });

  it('should parse custom tags', function () {
    function TestTagExtension () {
      this.tags = ['testtag'];

      /* normally this is automatically done by Environment */
      this._name = 'testtagExtension';

      this.parse = function (parser, nodes) {
        parser.peekToken();
        parser.advanceAfterBlockEnd();
        return new nodes.CallExtension(this, 'foo');
      };
    }

    function TestBlockTagExtension () {
      this.tags = ['testblocktag'];
      this._name = 'testblocktagExtension';

      this.parse = function (parser, nodes) {
        parser.peekToken();
        parser.advanceAfterBlockEnd();

        const content = parser.parseUntilBlocks('endtestblocktag');
        const tag = new nodes.CallExtension(this, 'bar', null, [1, content]);
        parser.advanceAfterBlockEnd();

        return tag;
      };
    }

    function TestArgsExtension () {
      this.tags = ['testargs'];
      this._name = 'testargsExtension';

      this.parse = function (parser, nodes) {
        const begun = parser.peekToken();
        let args = null;

        // Skip the name
        parser.nextToken();

        args = parser.parseSignature(true);
        parser.advanceAfterBlockEnd(begun.value);

        return new nodes.CallExtension(this, 'biz', args);
      };
    }

    const extensions = [new TestTagExtension(),
      new TestBlockTagExtension(),
      new TestArgsExtension()];

    isAST(parser.parse('{% testtag %}', extensions),
      [nodes.Root,
        [nodes.CallExtension, extensions[0], 'foo', undefined, undefined]]);

    isAST(parser.parse('{% testblocktag %}sdfd{% endtestblocktag %}', extensions),
      [nodes.Root,
        [nodes.CallExtension, extensions[1], 'bar', null,
          [1, [nodes.NodeList,
            [nodes.Output,
              [nodes.TemplateData, 'sdfd']]]]]]);

    isAST(parser.parse('{% testblocktag %}{{ 123 }}{% endtestblocktag %}', extensions),
      [nodes.Root,
        [nodes.CallExtension, extensions[1], 'bar', null,
          [1, [nodes.NodeList,
            [nodes.Output,
              [nodes.Literal, 123]]]]]]);

    isAST(parser.parse('{% testargs(123, "abc", foo="bar") %}', extensions),
      [nodes.Root,
        [nodes.CallExtension, extensions[2], 'biz',

          // The only arg is the list of run-time arguments
          // coming from the template
          [nodes.NodeList,
            [nodes.Literal, 123],
            [nodes.Literal, 'abc'],
            [nodes.KeywordArgs,
              [nodes.Pair,
                [nodes.Symbol, 'foo'],
                [nodes.Literal, 'bar']]]]]]);

    isAST(parser.parse('{% testargs %}', extensions),
      [nodes.Root,
        [nodes.CallExtension, extensions[2], 'biz', null]]);
  });
});
