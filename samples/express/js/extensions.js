function RemoteExtension () {
  this.tags = ['remote'];

  this.parse = function (parser, nodes, lexer) {
    // get the tag token
    const tok = parser.nextToken();

    // parse the args and move after the block end. passing true
    // as the second arg is required if there are no parentheses
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);

    // parse the body and move after block end
    const body = parser.parseUntilBlocks('error', 'endtruncate');
    let errorBody = null;

    if (parser.skipSymbol('error')) {
      parser.skip(lexer.TOKEN_BLOCK_END);
      errorBody = parser.parseUntilBlocks('endremote');
    }

    parser.advanceAfterBlockEnd();

    return new nodes.CallExtension(this, 'run', args, [body, errorBody]);
  };

  this.run = function (context, url, body, errorBody) {
    const id = 'el' + Math.floor(Math.random() * 10000);
    const ret = new govjucks.runtime.SafeString('<div id="' + id + '">' + body() + '</div>');
    const ajax = new XMLHttpRequest();

    ajax.onreadystatechange = function () {
      if (ajax.readyState == 4) {
        if (ajax.status == 200) {
          document.getElementById(id).innerHTML = ajax.responseText;
        } else {
          document.getElementById(id).innerHTML = errorBody();
        }
      }
    };

    ajax.open('GET', url, true);
    ajax.send();

    return ret;
  };
}
