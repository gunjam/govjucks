'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const lib = require('../src/lib');
const lexer = require('../src/lexer');

function _hasTokens (ws, tokens, types) {
  let i;
  let type;
  let tok;
  for (i = 0; i < types.length; i++) {
    type = types[i];
    tok = tokens.nextToken();

    if (!ws) {
      while (tok && tok.type === lexer.TOKEN_WHITESPACE) {
        tok = tokens.nextToken();
      }
    }

    if (lib.isArray(type)) {
      assert.equal(tok.type, type[0]);
      assert.equal(tok.value, type[1]);
    } else if (lib.isObject(type)) {
      assert.equal(tok.type, type.type);
      if (type.value != null) {
        assert.equal(tok.value, type.value);
      }
      if (type.lineno != null) {
        assert.equal(tok.lineno, type.lineno);
      }
      if (type.colno != null) {
        assert.equal(tok.colno, type.colno);
      }
    } else {
      assert.equal(tok.type, type);
    }
  }
}

function hasTokens (tokens /* , types */) {
  return _hasTokens(false, tokens, lib.toArray(arguments).slice(1));
}

function hasTokensWithWS (tokens /* , types */) {
  return _hasTokens(true, tokens, lib.toArray(arguments).slice(1));
}

describe('lexer', () => {
  let tok;
  let tmpl;
  let tokens;

  it('should parse template data', () => {
    tok = lexer.lex('3').nextToken();
    assert.equal(tok.type, lexer.TOKEN_DATA);
    assert.equal(tok.value, '3');

    tmpl = 'foo bar bizzle 3 [1,2] !@#$%^&*()<>?:"{}|';
    tok = lexer.lex(tmpl).nextToken();
    assert.equal(tok.type, lexer.TOKEN_DATA);
    assert.equal(tok.value, tmpl);
  });

  it('should keep track of whitespace', () => {
    tokens = lexer.lex('data {% 1 2\n   3  %} data');
    hasTokensWithWS(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_BLOCK_START,
      [lexer.TOKEN_WHITESPACE, ' '],
      lexer.TOKEN_INT,
      [lexer.TOKEN_WHITESPACE, ' '],
      lexer.TOKEN_INT,
      [lexer.TOKEN_WHITESPACE, '\n   '],
      lexer.TOKEN_INT,
      [lexer.TOKEN_WHITESPACE, '  '],
      lexer.TOKEN_BLOCK_END,
      lexer.TOKEN_DATA);
  });

  it('should trim blocks', () => {
    tokens = lexer.lex('  {% if true %}\n    foo\n  {% endif %}\n', {
      trimBlocks: true
    });
    hasTokens(tokens,
      [lexer.TOKEN_DATA, '  '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BOOLEAN,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, '    foo\n  '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END);
  });

  it('should trim windows-style CRLF line endings after blocks', () => {
    tokens = lexer.lex('  {% if true %}\r\n    foo\r\n  {% endif %}\r\n', {
      trimBlocks: true
    });
    hasTokens(tokens,
      [lexer.TOKEN_DATA, '  '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BOOLEAN,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, '    foo\r\n  '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END);
  });

  it('should not trim CR after blocks', () => {
    tokens = lexer.lex('  {% if true %}\r    foo\r\n  {% endif %}\r', {
      trimBlocks: true
    });
    hasTokens(tokens,
      [lexer.TOKEN_DATA, '  '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BOOLEAN,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, '\r    foo\r\n  '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, '\r']);
  });

  it('should lstrip and trim blocks', () => {
    tokens = lexer.lex('test\n {% if true %}\n  foo\n {% endif %}\n</div>', {
      lstripBlocks: true,
      trimBlocks: true
    });
    hasTokens(tokens,
      [lexer.TOKEN_DATA, 'test\n'],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BOOLEAN,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, '  foo\n'],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, '</div>']);
  });

  it('should lstrip and not collapse whitespace between blocks', () => {
    tokens = lexer.lex('   {% t %} {% t %}', {
      lstripBlocks: true
    });
    hasTokens(tokens,
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END,
      [lexer.TOKEN_DATA, ' '],
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END);
  });

  it('should parse variable start and end', () => {
    tokens = lexer.lex('data {{ foo }} bar bizzle');
    hasTokens(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_VARIABLE_END,
      lexer.TOKEN_DATA);
  });

  it('should treat the non-breaking space as valid whitespace', () => {
    tokens = lexer.lex('{{\u00A0foo }}');
    tok = tokens.nextToken();
    tok = tokens.nextToken();
    tok = tokens.nextToken();
    assert.equal(tok.type, lexer.TOKEN_SYMBOL);
    assert.equal(tok.value, 'foo');
  });

  it('should parse block start and end', () => {
    tokens = lexer.lex('data {% foo %} bar bizzle');
    hasTokens(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_BLOCK_END,
      lexer.TOKEN_DATA);
  });

  it('should parse basic types', () => {
    tokens = lexer.lex('{{ 3 4.5 true false none foo "hello" \'boo\' r/regex/ }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_INT,
      lexer.TOKEN_FLOAT,
      lexer.TOKEN_BOOLEAN,
      lexer.TOKEN_BOOLEAN,
      lexer.TOKEN_NONE,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_STRING,
      lexer.TOKEN_STRING,
      lexer.TOKEN_REGEX,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse function calls', () => {
    tokens = lexer.lex('{{ foo(bar) }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      [lexer.TOKEN_SYMBOL, 'foo'],
      lexer.TOKEN_LEFT_PAREN,
      [lexer.TOKEN_SYMBOL, 'bar'],
      lexer.TOKEN_RIGHT_PAREN,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse groups', () => {
    tokens = lexer.lex('{{ (1, 2, 3) }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_LEFT_PAREN,
      lexer.TOKEN_INT,
      lexer.TOKEN_COMMA,
      lexer.TOKEN_INT,
      lexer.TOKEN_COMMA,
      lexer.TOKEN_INT,
      lexer.TOKEN_RIGHT_PAREN,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse arrays', () => {
    tokens = lexer.lex('{{ [1, 2, 3] }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_LEFT_BRACKET,
      lexer.TOKEN_INT,
      lexer.TOKEN_COMMA,
      lexer.TOKEN_INT,
      lexer.TOKEN_COMMA,
      lexer.TOKEN_INT,
      lexer.TOKEN_RIGHT_BRACKET,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse dicts', () => {
    tokens = lexer.lex('{{ {one:1, "two":2} }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_LEFT_CURLY,
      [lexer.TOKEN_SYMBOL, 'one'],
      lexer.TOKEN_COLON,
      [lexer.TOKEN_INT, '1'],
      lexer.TOKEN_COMMA,
      [lexer.TOKEN_STRING, 'two'],
      lexer.TOKEN_COLON,
      [lexer.TOKEN_INT, '2'],
      lexer.TOKEN_RIGHT_CURLY,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse blocks without whitespace', () => {
    tokens = lexer.lex('data{{hello}}{%if%}data');
    hasTokens(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_VARIABLE_START,
      [lexer.TOKEN_SYMBOL, 'hello'],
      lexer.TOKEN_VARIABLE_END,
      lexer.TOKEN_BLOCK_START,
      [lexer.TOKEN_SYMBOL, 'if'],
      lexer.TOKEN_BLOCK_END,
      lexer.TOKEN_DATA);
  });

  it('should parse filters', () => {
    hasTokens(lexer.lex('{{ foo|bar }}'),
      lexer.TOKEN_VARIABLE_START,
      [lexer.TOKEN_SYMBOL, 'foo'],
      lexer.TOKEN_PIPE,
      [lexer.TOKEN_SYMBOL, 'bar'],
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse operators', () => {
    hasTokens(lexer.lex('{{ 3+3-3*3/3 }}'),
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_VARIABLE_END);

    hasTokens(lexer.lex('{{ 3**4//5 }}'),
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_VARIABLE_END);

    hasTokens(lexer.lex('{{ 3 != 4 == 5 <= 6 >= 7 < 8 > 9 }}'),
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_OPERATOR,
      lexer.TOKEN_INT,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should parse comments', () => {
    tokens = lexer.lex('data data {# comment #} data');
    hasTokens(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_COMMENT,
      lexer.TOKEN_DATA);
  });

  it('should allow changing the variable start and end', () => {
    tokens = lexer.lex('data {= var =}', {
      tags: {
        variableStart: '{=',
        variableEnd: '=}'
      }
    });
    hasTokens(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should allow changing the block start and end', () => {
    tokens = lexer.lex('{= =}', {
      tags: {
        blockStart: '{=',
        blockEnd: '=}'
      }
    });
    hasTokens(tokens,
      lexer.TOKEN_BLOCK_START,
      lexer.TOKEN_BLOCK_END);
  });

  it('should allow changing the variable start and end', () => {
    tokens = lexer.lex('data {= var =}', {
      tags: {
        variableStart: '{=',
        variableEnd: '=}'
      }
    });
    hasTokens(tokens,
      lexer.TOKEN_DATA,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should allow changing the comment start and end', () => {
    tokens = lexer.lex('<!-- A comment! -->', {
      tags: {
        commentStart: '<!--',
        commentEnd: '-->'
      }
    });
    hasTokens(tokens,
      lexer.TOKEN_COMMENT);
  });

  /**
    * Test that this bug is fixed: https://github.com/gunjam/govjucks/issues/235
    */
  it('should have individual lexer tag settings for each environment', () => {
    tokens = lexer.lex('{=', {
      tags: {
        variableStart: '{='
      }
    });
    hasTokens(tokens, lexer.TOKEN_VARIABLE_START);

    tokens = lexer.lex('{{');
    hasTokens(tokens, lexer.TOKEN_VARIABLE_START);

    tokens = lexer.lex('{{', {
      tags: {
        variableStart: '<<<'
      }
    });
    hasTokens(tokens, lexer.TOKEN_DATA);

    tokens = lexer.lex('{{');
    hasTokens(tokens, lexer.TOKEN_VARIABLE_START);
  });

  it('should parse regular expressions', () => {
    tokens = lexer.lex('{{ r/basic regex [a-z]/ }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_REGEX,
      lexer.TOKEN_VARIABLE_END);

    // A more complex regex with escaped slashes.
    tokens = lexer.lex('{{ r/{a*b} \\/regex! [0-9]\\// }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_REGEX,
      lexer.TOKEN_VARIABLE_END);

    // This one has flags.
    tokens = lexer.lex('{{ r/^x/gim }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_REGEX,
      lexer.TOKEN_VARIABLE_END);

    // This one has a valid flag then an invalid flag.
    tokens = lexer.lex('{{ r/x$/iv }}');
    hasTokens(tokens,
      lexer.TOKEN_VARIABLE_START,
      lexer.TOKEN_REGEX,
      lexer.TOKEN_SYMBOL,
      lexer.TOKEN_VARIABLE_END);
  });

  it('should keep track of token positions', () => {
    hasTokens(lexer.lex('{{ 3 != 4 == 5 <= 6 >= 7 < 8 > 9 }}'),
      {
        type: lexer.TOKEN_VARIABLE_START,
        lineno: 0,
        colno: 0,
      },
      {
        type: lexer.TOKEN_INT,
        value: '3',
        lineno: 0,
        colno: 3,
      },
      {
        type: lexer.TOKEN_OPERATOR,
        value: '!=',
        lineno: 0,
        colno: 5,
      },
      {
        type: lexer.TOKEN_INT,
        value: '4',
        lineno: 0,
        colno: 8,
      },
      {
        type: lexer.TOKEN_OPERATOR,
        value: '==',
        lineno: 0,
        colno: 10,
      },
      {
        type: lexer.TOKEN_INT,
        value: '5',
        lineno: 0,
        colno: 13,
      },
      {
        type: lexer.TOKEN_OPERATOR,
        value: '<=',
        lineno: 0,
        colno: 15,
      },
      {
        type: lexer.TOKEN_INT,
        value: '6',
        lineno: 0,
        colno: 18,
      },
      {
        type: lexer.TOKEN_OPERATOR,
        lineno: 0,
        colno: 20,
        value: '>=',
      },
      {
        type: lexer.TOKEN_INT,
        lineno: 0,
        colno: 23,
        value: '7',
      },
      {
        type: lexer.TOKEN_OPERATOR,
        value: '<',
        lineno: 0,
        colno: 25,
      },
      {
        type: lexer.TOKEN_INT,
        value: '8',
        lineno: 0,
        colno: 27,
      },
      {
        type: lexer.TOKEN_OPERATOR,
        value: '>',
        lineno: 0,
        colno: 29,
      },
      {
        type: lexer.TOKEN_INT,
        value: '9',
        lineno: 0,
        colno: 31,
      },
      {
        type: lexer.TOKEN_VARIABLE_END,
        lineno: 0,
        colno: 33,
      });

    hasTokens(lexer.lex('{% if something %}{{ value }}{% else %}{{ otherValue }}{% endif %}'),
      {
        type: lexer.TOKEN_BLOCK_START,
        lineno: 0,
        colno: 0,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'if',
        lineno: 0,
        colno: 3,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'something',
        lineno: 0,
        colno: 6,
      },
      {
        type: lexer.TOKEN_BLOCK_END,
        lineno: 0,
        colno: 16,
      },
      {
        type: lexer.TOKEN_VARIABLE_START,
        lineno: 0,
        colno: 18,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'value',
        lineno: 0,
        colno: 21,
      },
      {
        type: lexer.TOKEN_VARIABLE_END,
        lineno: 0,
        colno: 27,
      },
      {
        type: lexer.TOKEN_BLOCK_START,
        lineno: 0,
        colno: 29,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'else',
        lineno: 0,
        colno: 32,
      },
      {
        type: lexer.TOKEN_BLOCK_END,
        lineno: 0,
        colno: 37,
      },
      {
        type: lexer.TOKEN_VARIABLE_START,
        lineno: 0,
        colno: 39,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'otherValue',
        lineno: 0,
        colno: 42,
      },
      {
        type: lexer.TOKEN_VARIABLE_END,
        lineno: 0,
        colno: 53,
      },
      {
        type: lexer.TOKEN_BLOCK_START,
        lineno: 0,
        colno: 55,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'endif',
        lineno: 0,
        colno: 58,
      },
      {
        type: lexer.TOKEN_BLOCK_END,
        lineno: 0,
        colno: 64,
      });

    hasTokens(lexer.lex('{% if something %}\n{{ value }}\n{% else %}\n{{ otherValue }}\n{% endif %}'),
      {
        type: lexer.TOKEN_BLOCK_START,
        lineno: 0,
        colno: 0,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'if',
        lineno: 0,
        colno: 3,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'something',
        lineno: 0,
        colno: 6,
      },
      {
        type: lexer.TOKEN_BLOCK_END,
        lineno: 0,
        colno: 16,
      },
      {
        type: lexer.TOKEN_DATA,
        value: '\n',
      },
      {
        type: lexer.TOKEN_VARIABLE_START,
        lineno: 1,
        colno: 0,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'value',
        lineno: 1,
        colno: 3,
      },
      {
        type: lexer.TOKEN_VARIABLE_END,
        lineno: 1,
        colno: 9,
      },
      {
        type: lexer.TOKEN_DATA,
        value: '\n',
      },
      {
        type: lexer.TOKEN_BLOCK_START,
        lineno: 2,
        colno: 0,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'else',
        lineno: 2,
        colno: 3,
      },
      {
        type: lexer.TOKEN_BLOCK_END,
        lineno: 2,
        colno: 8,
      },
      {
        type: lexer.TOKEN_DATA,
        value: '\n',
      },
      {
        type: lexer.TOKEN_VARIABLE_START,
        lineno: 3,
        colno: 0,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'otherValue',
        lineno: 3,
        colno: 3,
      },
      {
        type: lexer.TOKEN_VARIABLE_END,
        lineno: 3,
        colno: 14,
      },
      {
        type: lexer.TOKEN_DATA,
        value: '\n',
      },
      {
        type: lexer.TOKEN_BLOCK_START,
        lineno: 4,
        colno: 0,
      },
      {
        type: lexer.TOKEN_SYMBOL,
        value: 'endif',
        lineno: 4,
        colno: 3,
      },
      {
        type: lexer.TOKEN_BLOCK_END,
        lineno: 4,
        colno: 9,
      });
  });
});
