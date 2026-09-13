'use strict';

const STATE_PLAINTEXT = 1;
const STATE_WHITESPACE = 2;
const STATE_HTML = 3;
const LEFT_CHEVRON = 0x3C;  // '<'
const RIGHT_CHEVRON = 0x3E; // '>'
const DASH = 0x2D;          // '-'
const DOUBLE_QUOTE = 0x22;  // '"'
const SINGLE_QUOTE = 0x27;  // "'"
const EXCLAMATION = 0x21;   // '!'
const SPACE = 0x20;         // ' '
const TAB = 0x09;           // '\t'
const NEW_LINE = 0x0A;      // '\n'
const RETURN = 0x0D;        // '\r'
const SPACE_FLAG = 1;
const NEW_LINE_FLAG = 2;
const WHITE_SPACE = [
  '',
  '',
  ' ',
  '\n',
  '\n\n',
];

/**
 * Strip tags from a string of HTML.
 * @param {string} html
 * @param {boolean} preserveLinebreaks
 * @returns {string} tag stripped text
 */
module.exports = function striptags (html, preserveLinebreaks) {
  let length = html.length;
  let spaceCount = 0;
  let inSpaceChar = SPACE_FLAG;
  let inQuoteChar = 0;
  let output = '';
  let newLineChar = SPACE_FLAG;
  let newLineLimit = 1;
  let code = 0;
  let idx = 0;

  if (length === 0) {
    return '';
  }
  if (preserveLinebreaks) {
    newLineChar = NEW_LINE_FLAG;
    newLineLimit = 2;
  }

  while (idx !== length) {
    code = html.charCodeAt(idx);
    if (code !== SPACE && code !== NEW_LINE && code !== RETURN && code !== TAB) {
      break;
    }
    idx++;
  }

  let textStart = idx;
  let state = STATE_PLAINTEXT;
  if (code === LEFT_CHEVRON) {
    state = STATE_HTML;
    idx++;
  }

  while (idx !== length) {
    code = html.charCodeAt(length - 1);
    if (code !== SPACE && code !== NEW_LINE && code !== RETURN && code !== TAB) {
      break;
    }
    length--;
  }

  /* eslint-disable no-labels */
  mainScan: while (idx !== length) {
    if (state === STATE_PLAINTEXT) {
      while (idx !== length) {
        switch (html.charCodeAt(idx)) {
          case LEFT_CHEVRON:
            output += html.substring(textStart, idx);
            state = STATE_HTML;
            idx++;
            continue mainScan;
          case SPACE:
          case TAB:
            output += html.substring(textStart, idx);
            state = STATE_WHITESPACE;
            spaceCount = 1;
            idx++;
            continue mainScan;
          case NEW_LINE:
          case RETURN:
            output += html.substring(textStart, idx);
            state = STATE_WHITESPACE;
            spaceCount = 1;
            inSpaceChar = newLineChar;
            idx++;
            continue mainScan;
          default:
            idx++;
        }
      }
      break mainScan;
    }
    if (state === STATE_WHITESPACE) {
      while (idx !== length) {
        switch (html.charCodeAt(idx)) {
          case SPACE:
          case TAB:
            if (spaceCount === 0) spaceCount = 1;
            break;
          case NEW_LINE:
          case RETURN:
            if (spaceCount !== newLineLimit) {
              if (inSpaceChar !== newLineChar) spaceCount = 0;
              spaceCount++;
              inSpaceChar = newLineChar;
            }
            break;
          case LEFT_CHEVRON:
            state = STATE_HTML;
            idx++;
            continue mainScan;
          default:
            if (spaceCount !== 0 && output.length !== 0) {
              output += WHITE_SPACE[inSpaceChar + spaceCount];
              inSpaceChar = SPACE_FLAG;
            }
            spaceCount = 0;
            state = STATE_PLAINTEXT;
            textStart = idx;
            idx++;
            continue mainScan;
        }
        idx++;
      }
      break mainScan;
    }
    // state === STATE_HTML
    code = html.charCodeAt(idx);

    // Are we in a comment
    if (code === EXCLAMATION &&
      html.charCodeAt(idx + 1) === DASH &&
      html.charCodeAt(idx + 2) === DASH) {
      idx += 5;
      while (idx !== length) {
        if (html.charCodeAt(idx) === RIGHT_CHEVRON &&
          html.charCodeAt(idx - 1) === DASH &&
          html.charCodeAt(idx - 2) === DASH) {
          textStart = idx++;
          state = STATE_WHITESPACE;
          continue mainScan;
        }
        idx++;
      }
      break mainScan;
    }

    // First char in tag is a space so not a valid tag, treat as plaintext
    if (code === SPACE || code === NEW_LINE || code === RETURN || code === TAB) {
      if (spaceCount !== 0) output += WHITE_SPACE[inSpaceChar + spaceCount];
      state = STATE_WHITESPACE;
      output += '<';
      spaceCount = 1;
      inSpaceChar = code === SPACE || code === TAB ? SPACE_FLAG : newLineChar;
      idx++;
      continue mainScan;
    }

    while (idx !== length) {
      code = html.charCodeAt(idx);
      switch (code) {
        case RIGHT_CHEVRON:
          if (inQuoteChar === 0) {
            state = STATE_WHITESPACE;
            textStart = idx++;
            continue mainScan;
          }
          break;
        case DOUBLE_QUOTE:
        case SINGLE_QUOTE:
          if (code === inQuoteChar) {
            inQuoteChar = 0;
          } else {
            inQuoteChar ||= code;
          }
          break;
      }
      idx++;
    }
  }

  if (textStart !== length - 1) {
    output += html.substring(textStart, length);
  }

  return output;
};
