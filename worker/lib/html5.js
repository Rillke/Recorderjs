/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Tristan Cavelier <t.cavelier@free.fr>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*jslint indent: 2, nomen: true, sloppy: true */
/*global setTimeout */

////////////////////////////////////////////////////////////
// https://github.com/TristanCavelier/notesntools/blob/\
// master/javascript/stringToUtf8Bytes.js
/**
 * Converts a string into a Utf8 raw string (0 <= char <= 255)
 *
 * @param  {String} input String to convert
 * @return {String} Utf8 byte string
 */
function stringToUtf8ByteString(input) {
  /*jslint bitwise: true */
  var output = "", i, x, y, l = input.length;

  for (i = 0; i < l; i += 1) {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < l ? input.charCodeAt(i + 1) : 0;
    if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i += 1;
    }

    /* Encode output as utf-8 */
    if (x <= 0x7F) {
      output += String.fromCharCode(x);
    } else if (x <= 0x7FF) {
      output += String.fromCharCode(
        0xC0 | ((x >>> 6) & 0x1F),
        0x80 | (x & 0x3F)
      );
    } else if (x <= 0xFFFF) {
      output += String.fromCharCode(
        0xE0 | ((x >>> 12) & 0x0F),
        0x80 | ((x >>> 6) & 0x3F),
        0x80 | (x & 0x3F)
      );
    } else if (x <= 0x1FFFFF) {
      output += String.fromCharCode(
        0xF0 | ((x >>> 18) & 0x07),
        0x80 | ((x >>> 12) & 0x3F),
        0x80 | ((x >>> 6) & 0x3F),
        0x80 | (x & 0x3F)
      );
    }
  }
  return output;
}

/**
 * Converts a Utf8 raw string (0 <= char <= 255) into a real string
 *
 * @param  {String} input Utf8 encoded Bytes to convert
 * @return {String} Real string
 */
function utf8ByteStringToString(input) {
  /*jslint bitwise: true */
  var output = "", i, x, l = input.length;

  for (i = 0; i < l; i += 1) {
    x = input.charCodeAt(i);
    if ((x & 0xF0) === 0xF0) {
      i += 1;
      x = ((x & 0x07) << 18) | (
        i < l ? (input.charCodeAt(i) & 0x3F) << 12 : 0
      );
      i += 1;
      x = x | (
        i < l ? (input.charCodeAt(i) & 0x3F) << 6 : 0
      );
      i += 1;
      x = x | (
        i < l ? input.charCodeAt(i) & 0x3F : 0
      );
      if (0x10000 <= x && x <= 0x10FFFF) {
        output += String.fromCharCode(
          (((x - 0x10000) >>> 10) & 0x03FF) | 0xD800,
          (x & 0x03FF) | 0xDC00
        );
      } else {
        output += String.fromCharCode(x);
      }
    } else if ((x & 0xE0) === 0xE0) {
      i += 1;
      x = ((x & 0x0F) << 12) | (
        i < l ? (input.charCodeAt(i) & 0x3F) << 6 : 0
      );
      i += 1;
      output += String.fromCharCode(x | (
        i < l ? input.charCodeAt(i) & 0x3F : 0
      ));
    } else if ((x & 0xC0) === 0xC0) {
      i += 1;
      output += String.fromCharCode(((x & 0x1F) << 6) | (
        i < l ? input.charCodeAt(i) & 0x3F : 0
      ));
    } else {
      output += String.fromCharCode(x);
    }
  }
  return output;
}

////////////////////////////////////////////////////////////

function ord(chr) {
  return chr.charCodeAt(0);
}

////////////////////////////////////////////////////////////
// https://github.com/TristanCavelier/notesntools/blob/\
// master/javascript/emitter.js

FileReader.prototype.addEventListener = function (eventName, callback) {
  // Check parameters
  if (typeof callback !== "function") {
    return;
  }

  // assign callback to event
  this._events = this._events || {};
  this._events[eventName] = this._events[eventName] || [];
  this._events[eventName].push(callback);
};

////////////////////////////////////////////////////////////

// https://github.com/ttaubert/node-arraybuffer-slice
// (c) 2014 Tim Taubert <tim@timtaubert.de>
// arraybuffer-slice may be freely distributed under the MIT license.

(function (undefined) {
  "use strict";

  function clamp(val, length) {
    val = (val|0) || 0;

    if (val < 0) {
      return Math.max(val + length, 0);
    }

    return Math.min(val, length);
  }

  if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (from, to) {
      var length = this.byteLength;
      var begin = clamp(from, length);
      var end = length;

      if (to !== undefined) {
        end = clamp(to, length);
      }

      if (begin > end) {
        return new ArrayBuffer(0);
      }

      var num = end - begin;
      var target = new ArrayBuffer(num);
      var targetArray = new Uint8Array(target);

      var sourceArray = new Uint8Array(this, begin, num);
      targetArray.set(sourceArray);

      return target;
    };
  }
})();
