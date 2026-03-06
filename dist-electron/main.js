"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const electron = require("electron");
const path$2 = require("node:path");
const fs$5 = require("node:fs");
const os = require("node:os");
const child_process = require("child_process");
const fs$4 = require("fs");
const path$1 = require("path");
const require$$1 = require("tty");
const require$$1$1 = require("util");
const require$$0 = require("os");
const require$$0$1 = require("buffer");
const require$$6 = require("stream");
const require$$1$2 = require("zlib");
const require$$4 = require("events");
const crypto = require("crypto");
const initSqlJs = require("sql.js");
const node_crypto = require("node:crypto");
const APP_NAME = "CyLobsterAI";
const DB_FILENAME = "cylobsterai.sqlite";
/*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT */
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common$1 = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common$1.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common$1.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common$1.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common$1.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common$1.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common$1.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common$1.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common$1.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? " " : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common$1.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common$1.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common$1.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common$1.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common$1.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common$1.repeat("\n", emptyLines);
      }
    } else {
      state.result += common$1.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common$1.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1, QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common$1.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common$1.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common$1.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var Type = type;
var Schema = schema;
var FAILSAFE_SCHEMA = failsafe;
var JSON_SCHEMA = json;
var CORE_SCHEMA = core;
var DEFAULT_SCHEMA = _default;
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var YAMLException = exception;
var types = {
  binary,
  float,
  map,
  null: _null,
  pairs,
  set,
  timestamp,
  bool,
  int,
  merge,
  omap,
  seq,
  str
};
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");
var jsYaml = {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
};
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type2 = typeof val;
    if (type2 === "string" && val.length > 0) {
      return parse(val);
    } else if (type2 === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str2) {
    str2 = String(str2);
    if (str2.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str2
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type2 = (match[2] || "ms").toLowerCase();
    switch (type2) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self2, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend3;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend3(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module2, exports$1) {
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load2;
    exports$1.useColors = useColors;
    exports$1.storage = localstorage();
    exports$1.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports$1.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports$1.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports$1.storage.setItem("debug", namespaces);
        } else {
          exports$1.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load2() {
      let r;
      try {
        r = exports$1.storage.getItem("debug") || exports$1.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = requireCommon()(exports$1);
    const { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os2 = require$$0;
  const tty = require$$1;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let flagForceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    flagForceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    flagForceColor = 1;
  }
  function envForceColor() {
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        return 1;
      }
      if (env.FORCE_COLOR === "false") {
        return 0;
      }
      return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
    const noFlagForceColor = envForceColor();
    if (noFlagForceColor !== void 0) {
      flagForceColor = noFlagForceColor;
    }
    const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
    if (forceColor === 0) {
      return 0;
    }
    if (sniffFlags) {
      if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
        return 3;
      }
      if (hasFlag2("color=256")) {
        return 2;
      }
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os2.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream2, options = {}) {
    const level = supportsColor(stream2, {
      streamIsTTY: stream2 && stream2.isTTY,
      ...options
    });
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: getSupportLevel({ isTTY: tty.isatty(1) }),
    stderr: getSupportLevel({ isTTY: tty.isatty(2) })
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module2, exports$1) {
    const tty = require$$1;
    const util2 = require$$1$1;
    exports$1.init = init;
    exports$1.log = log;
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load2;
    exports$1.useColors = useColors;
    exports$1.destroy = util2.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports$1.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports$1.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports$1.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports$1.inspectOpts ? Boolean(exports$1.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports$1.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util2.formatWithOptions(exports$1.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load2() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports$1.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports$1.inspectOpts[keys[i]];
      }
    }
    module2.exports = requireCommon()(exports$1);
    const { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map((str2) => str2.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src.exports = requireBrowser();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
var getStream$2 = { exports: {} };
var once$3 = { exports: {} };
var wrappy_1 = wrappy$1;
function wrappy$1(fn, cb) {
  if (fn && cb) return wrappy$1(fn)(cb);
  if (typeof fn !== "function")
    throw new TypeError("need wrapper function");
  Object.keys(fn).forEach(function(k) {
    wrapper[k] = fn[k];
  });
  return wrapper;
  function wrapper() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    var ret = fn.apply(this, args);
    var cb2 = args[args.length - 1];
    if (typeof ret === "function" && ret !== cb2) {
      Object.keys(cb2).forEach(function(k) {
        ret[k] = cb2[k];
      });
    }
    return ret;
  }
}
var wrappy = wrappy_1;
once$3.exports = wrappy(once$2);
once$3.exports.strict = wrappy(onceStrict);
once$2.proto = once$2(function() {
  Object.defineProperty(Function.prototype, "once", {
    value: function() {
      return once$2(this);
    },
    configurable: true
  });
  Object.defineProperty(Function.prototype, "onceStrict", {
    value: function() {
      return onceStrict(this);
    },
    configurable: true
  });
});
function once$2(fn) {
  var f = function() {
    if (f.called) return f.value;
    f.called = true;
    return f.value = fn.apply(this, arguments);
  };
  f.called = false;
  return f;
}
function onceStrict(fn) {
  var f = function() {
    if (f.called)
      throw new Error(f.onceError);
    f.called = true;
    return f.value = fn.apply(this, arguments);
  };
  var name = fn.name || "Function wrapped with `once`";
  f.onceError = name + " shouldn't be called more than once";
  f.called = false;
  return f;
}
var onceExports = once$3.exports;
var once$1 = onceExports;
var noop$1 = function() {
};
var qnt = commonjsGlobal.Bare ? queueMicrotask : process.nextTick.bind(process);
var isRequest$1 = function(stream2) {
  return stream2.setHeader && typeof stream2.abort === "function";
};
var isChildProcess = function(stream2) {
  return stream2.stdio && Array.isArray(stream2.stdio) && stream2.stdio.length === 3;
};
var eos$1 = function(stream2, opts, callback) {
  if (typeof opts === "function") return eos$1(stream2, null, opts);
  if (!opts) opts = {};
  callback = once$1(callback || noop$1);
  var ws = stream2._writableState;
  var rs = stream2._readableState;
  var readable = opts.readable || opts.readable !== false && stream2.readable;
  var writable = opts.writable || opts.writable !== false && stream2.writable;
  var cancelled = false;
  var onlegacyfinish = function() {
    if (!stream2.writable) onfinish();
  };
  var onfinish = function() {
    writable = false;
    if (!readable) callback.call(stream2);
  };
  var onend = function() {
    readable = false;
    if (!writable) callback.call(stream2);
  };
  var onexit = function(exitCode) {
    callback.call(stream2, exitCode ? new Error("exited with error code: " + exitCode) : null);
  };
  var onerror = function(err) {
    callback.call(stream2, err);
  };
  var onclose = function() {
    qnt(onclosenexttick);
  };
  var onclosenexttick = function() {
    if (cancelled) return;
    if (readable && !(rs && (rs.ended && !rs.destroyed))) return callback.call(stream2, new Error("premature close"));
    if (writable && !(ws && (ws.ended && !ws.destroyed))) return callback.call(stream2, new Error("premature close"));
  };
  var onrequest = function() {
    stream2.req.on("finish", onfinish);
  };
  if (isRequest$1(stream2)) {
    stream2.on("complete", onfinish);
    stream2.on("abort", onclose);
    if (stream2.req) onrequest();
    else stream2.on("request", onrequest);
  } else if (writable && !ws) {
    stream2.on("end", onlegacyfinish);
    stream2.on("close", onlegacyfinish);
  }
  if (isChildProcess(stream2)) stream2.on("exit", onexit);
  stream2.on("end", onend);
  stream2.on("finish", onfinish);
  if (opts.error !== false) stream2.on("error", onerror);
  stream2.on("close", onclose);
  return function() {
    cancelled = true;
    stream2.removeListener("complete", onfinish);
    stream2.removeListener("abort", onclose);
    stream2.removeListener("request", onrequest);
    if (stream2.req) stream2.req.removeListener("finish", onfinish);
    stream2.removeListener("end", onlegacyfinish);
    stream2.removeListener("close", onlegacyfinish);
    stream2.removeListener("finish", onfinish);
    stream2.removeListener("exit", onexit);
    stream2.removeListener("end", onend);
    stream2.removeListener("error", onerror);
    stream2.removeListener("close", onclose);
  };
};
var endOfStream = eos$1;
var once = onceExports;
var eos = endOfStream;
var fs$3;
try {
  fs$3 = require("fs");
} catch (e) {
}
var noop = function() {
};
var ancient = typeof process === "undefined" ? false : /^v?\.0/.test(process.version);
var isFn = function(fn) {
  return typeof fn === "function";
};
var isFS = function(stream2) {
  if (!ancient) return false;
  if (!fs$3) return false;
  return (stream2 instanceof (fs$3.ReadStream || noop) || stream2 instanceof (fs$3.WriteStream || noop)) && isFn(stream2.close);
};
var isRequest = function(stream2) {
  return stream2.setHeader && isFn(stream2.abort);
};
var destroyer = function(stream2, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream2.on("close", function() {
    closed = true;
  });
  eos(stream2, { readable: reading, writable: writing }, function(err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function(err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true;
    if (isFS(stream2)) return stream2.close(noop);
    if (isRequest(stream2)) return stream2.abort();
    if (isFn(stream2.destroy)) return stream2.destroy();
    callback(err || new Error("stream was destroyed"));
  };
};
var call = function(fn) {
  fn();
};
var pipe = function(from, to) {
  return from.pipe(to);
};
var pump$1 = function() {
  var streams = Array.prototype.slice.call(arguments);
  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop;
  if (Array.isArray(streams[0])) streams = streams[0];
  if (streams.length < 2) throw new Error("pump requires two streams per minimum");
  var error;
  var destroys = streams.map(function(stream2, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream2, reading, writing, function(err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
};
var pump_1 = pump$1;
const { PassThrough: PassThroughStream } = require$$6;
var bufferStream$1 = (options) => {
  options = { ...options };
  const { array } = options;
  let { encoding } = options;
  const isBuffer = encoding === "buffer";
  let objectMode = false;
  if (array) {
    objectMode = !(encoding || isBuffer);
  } else {
    encoding = encoding || "utf8";
  }
  if (isBuffer) {
    encoding = null;
  }
  const stream2 = new PassThroughStream({ objectMode });
  if (encoding) {
    stream2.setEncoding(encoding);
  }
  let length = 0;
  const chunks = [];
  stream2.on("data", (chunk) => {
    chunks.push(chunk);
    if (objectMode) {
      length = chunks.length;
    } else {
      length += chunk.length;
    }
  });
  stream2.getBufferedValue = () => {
    if (array) {
      return chunks;
    }
    return isBuffer ? Buffer.concat(chunks, length) : chunks.join("");
  };
  stream2.getBufferedLength = () => length;
  return stream2;
};
const { constants: BufferConstants } = require$$0$1;
const pump = pump_1;
const bufferStream = bufferStream$1;
class MaxBufferError extends Error {
  constructor() {
    super("maxBuffer exceeded");
    this.name = "MaxBufferError";
  }
}
async function getStream$1(inputStream, options) {
  if (!inputStream) {
    return Promise.reject(new Error("Expected a stream"));
  }
  options = {
    maxBuffer: Infinity,
    ...options
  };
  const { maxBuffer } = options;
  let stream2;
  await new Promise((resolve, reject) => {
    const rejectPromise = (error) => {
      if (error && stream2.getBufferedLength() <= BufferConstants.MAX_LENGTH) {
        error.bufferedData = stream2.getBufferedValue();
      }
      reject(error);
    };
    stream2 = pump(inputStream, bufferStream(options), (error) => {
      if (error) {
        rejectPromise(error);
        return;
      }
      resolve();
    });
    stream2.on("data", () => {
      if (stream2.getBufferedLength() > maxBuffer) {
        rejectPromise(new MaxBufferError());
      }
    });
  });
  return stream2.getBufferedValue();
}
getStream$2.exports = getStream$1;
getStream$2.exports.default = getStream$1;
getStream$2.exports.buffer = (stream2, options) => getStream$1(stream2, { ...options, encoding: "buffer" });
getStream$2.exports.array = (stream2, options) => getStream$1(stream2, { ...options, array: true });
getStream$2.exports.MaxBufferError = MaxBufferError;
var getStreamExports = getStream$2.exports;
var yauzl$1 = {};
var fdSlicer = {};
var pend = Pend$1;
function Pend$1() {
  this.pending = 0;
  this.max = Infinity;
  this.listeners = [];
  this.waiting = [];
  this.error = null;
}
Pend$1.prototype.go = function(fn) {
  if (this.pending < this.max) {
    pendGo(this, fn);
  } else {
    this.waiting.push(fn);
  }
};
Pend$1.prototype.wait = function(cb) {
  if (this.pending === 0) {
    cb(this.error);
  } else {
    this.listeners.push(cb);
  }
};
Pend$1.prototype.hold = function() {
  return pendHold(this);
};
function pendHold(self2) {
  self2.pending += 1;
  var called = false;
  return onCb;
  function onCb(err) {
    if (called) throw new Error("callback called twice");
    called = true;
    self2.error = self2.error || err;
    self2.pending -= 1;
    if (self2.waiting.length > 0 && self2.pending < self2.max) {
      pendGo(self2, self2.waiting.shift());
    } else if (self2.pending === 0) {
      var listeners = self2.listeners;
      self2.listeners = [];
      listeners.forEach(cbListener);
    }
  }
  function cbListener(listener) {
    listener(self2.error);
  }
}
function pendGo(self2, fn) {
  fn(pendHold(self2));
}
var fs$2 = fs$4;
var util$1 = require$$1$1;
var stream$1 = require$$6;
var Readable = stream$1.Readable;
var Writable$1 = stream$1.Writable;
var PassThrough$1 = stream$1.PassThrough;
var Pend = pend;
var EventEmitter$1 = require$$4.EventEmitter;
fdSlicer.createFromBuffer = createFromBuffer;
fdSlicer.createFromFd = createFromFd;
fdSlicer.BufferSlicer = BufferSlicer;
fdSlicer.FdSlicer = FdSlicer;
util$1.inherits(FdSlicer, EventEmitter$1);
function FdSlicer(fd, options) {
  options = options || {};
  EventEmitter$1.call(this);
  this.fd = fd;
  this.pend = new Pend();
  this.pend.max = 1;
  this.refCount = 0;
  this.autoClose = !!options.autoClose;
}
FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var self2 = this;
  self2.pend.go(function(cb) {
    fs$2.read(self2.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
      cb();
      callback(err, bytesRead, buffer2);
    });
  });
};
FdSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  var self2 = this;
  self2.pend.go(function(cb) {
    fs$2.write(self2.fd, buffer, offset, length, position, function(err, written, buffer2) {
      cb();
      callback(err, written, buffer2);
    });
  });
};
FdSlicer.prototype.createReadStream = function(options) {
  return new ReadStream(this, options);
};
FdSlicer.prototype.createWriteStream = function(options) {
  return new WriteStream(this, options);
};
FdSlicer.prototype.ref = function() {
  this.refCount += 1;
};
FdSlicer.prototype.unref = function() {
  var self2 = this;
  self2.refCount -= 1;
  if (self2.refCount > 0) return;
  if (self2.refCount < 0) throw new Error("invalid unref");
  if (self2.autoClose) {
    fs$2.close(self2.fd, onCloseDone);
  }
  function onCloseDone(err) {
    if (err) {
      self2.emit("error", err);
    } else {
      self2.emit("close");
    }
  }
};
util$1.inherits(ReadStream, Readable);
function ReadStream(context, options) {
  options = options || {};
  Readable.call(this, options);
  this.context = context;
  this.context.ref();
  this.start = options.start || 0;
  this.endOffset = options.end;
  this.pos = this.start;
  this.destroyed = false;
}
ReadStream.prototype._read = function(n) {
  var self2 = this;
  if (self2.destroyed) return;
  var toRead = Math.min(self2._readableState.highWaterMark, n);
  if (self2.endOffset != null) {
    toRead = Math.min(toRead, self2.endOffset - self2.pos);
  }
  if (toRead <= 0) {
    self2.destroyed = true;
    self2.push(null);
    self2.context.unref();
    return;
  }
  self2.context.pend.go(function(cb) {
    if (self2.destroyed) return cb();
    var buffer = new Buffer(toRead);
    fs$2.read(self2.context.fd, buffer, 0, toRead, self2.pos, function(err, bytesRead) {
      if (err) {
        self2.destroy(err);
      } else if (bytesRead === 0) {
        self2.destroyed = true;
        self2.push(null);
        self2.context.unref();
      } else {
        self2.pos += bytesRead;
        self2.push(buffer.slice(0, bytesRead));
      }
      cb();
    });
  });
};
ReadStream.prototype.destroy = function(err) {
  if (this.destroyed) return;
  err = err || new Error("stream destroyed");
  this.destroyed = true;
  this.emit("error", err);
  this.context.unref();
};
util$1.inherits(WriteStream, Writable$1);
function WriteStream(context, options) {
  options = options || {};
  Writable$1.call(this, options);
  this.context = context;
  this.context.ref();
  this.start = options.start || 0;
  this.endOffset = options.end == null ? Infinity : +options.end;
  this.bytesWritten = 0;
  this.pos = this.start;
  this.destroyed = false;
  this.on("finish", this.destroy.bind(this));
}
WriteStream.prototype._write = function(buffer, encoding, callback) {
  var self2 = this;
  if (self2.destroyed) return;
  if (self2.pos + buffer.length > self2.endOffset) {
    var err = new Error("maximum file length exceeded");
    err.code = "ETOOBIG";
    self2.destroy();
    callback(err);
    return;
  }
  self2.context.pend.go(function(cb) {
    if (self2.destroyed) return cb();
    fs$2.write(self2.context.fd, buffer, 0, buffer.length, self2.pos, function(err2, bytes) {
      if (err2) {
        self2.destroy();
        cb();
        callback(err2);
      } else {
        self2.bytesWritten += bytes;
        self2.pos += bytes;
        self2.emit("progress");
        cb();
        callback();
      }
    });
  });
};
WriteStream.prototype.destroy = function() {
  if (this.destroyed) return;
  this.destroyed = true;
  this.context.unref();
};
util$1.inherits(BufferSlicer, EventEmitter$1);
function BufferSlicer(buffer, options) {
  EventEmitter$1.call(this);
  options = options || {};
  this.refCount = 0;
  this.buffer = buffer;
  this.maxChunkSize = options.maxChunkSize || Number.MAX_SAFE_INTEGER;
}
BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var end = position + length;
  var delta = end - this.buffer.length;
  var written = delta > 0 ? delta : length;
  this.buffer.copy(buffer, offset, position, end);
  setImmediate(function() {
    callback(null, written);
  });
};
BufferSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  buffer.copy(this.buffer, position, offset, offset + length);
  setImmediate(function() {
    callback(null, length, buffer);
  });
};
BufferSlicer.prototype.createReadStream = function(options) {
  options = options || {};
  var readStream = new PassThrough$1(options);
  readStream.destroyed = false;
  readStream.start = options.start || 0;
  readStream.endOffset = options.end;
  readStream.pos = readStream.endOffset || this.buffer.length;
  var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
  var offset = 0;
  while (true) {
    var nextOffset = offset + this.maxChunkSize;
    if (nextOffset >= entireSlice.length) {
      if (offset < entireSlice.length) {
        readStream.write(entireSlice.slice(offset, entireSlice.length));
      }
      break;
    }
    readStream.write(entireSlice.slice(offset, nextOffset));
    offset = nextOffset;
  }
  readStream.end();
  readStream.destroy = function() {
    readStream.destroyed = true;
  };
  return readStream;
};
BufferSlicer.prototype.createWriteStream = function(options) {
  var bufferSlicer = this;
  options = options || {};
  var writeStream = new Writable$1(options);
  writeStream.start = options.start || 0;
  writeStream.endOffset = options.end == null ? this.buffer.length : +options.end;
  writeStream.bytesWritten = 0;
  writeStream.pos = writeStream.start;
  writeStream.destroyed = false;
  writeStream._write = function(buffer, encoding, callback) {
    if (writeStream.destroyed) return;
    var end = writeStream.pos + buffer.length;
    if (end > writeStream.endOffset) {
      var err = new Error("maximum file length exceeded");
      err.code = "ETOOBIG";
      writeStream.destroyed = true;
      callback(err);
      return;
    }
    buffer.copy(bufferSlicer.buffer, writeStream.pos, 0, buffer.length);
    writeStream.bytesWritten += buffer.length;
    writeStream.pos = end;
    writeStream.emit("progress");
    callback();
  };
  writeStream.destroy = function() {
    writeStream.destroyed = true;
  };
  return writeStream;
};
BufferSlicer.prototype.ref = function() {
  this.refCount += 1;
};
BufferSlicer.prototype.unref = function() {
  this.refCount -= 1;
  if (this.refCount < 0) {
    throw new Error("invalid unref");
  }
};
function createFromBuffer(buffer, options) {
  return new BufferSlicer(buffer, options);
}
function createFromFd(fd, options) {
  return new FdSlicer(fd, options);
}
var Buffer$1 = require$$0$1.Buffer;
var CRC_TABLE = [
  0,
  1996959894,
  3993919788,
  2567524794,
  124634137,
  1886057615,
  3915621685,
  2657392035,
  249268274,
  2044508324,
  3772115230,
  2547177864,
  162941995,
  2125561021,
  3887607047,
  2428444049,
  498536548,
  1789927666,
  4089016648,
  2227061214,
  450548861,
  1843258603,
  4107580753,
  2211677639,
  325883990,
  1684777152,
  4251122042,
  2321926636,
  335633487,
  1661365465,
  4195302755,
  2366115317,
  997073096,
  1281953886,
  3579855332,
  2724688242,
  1006888145,
  1258607687,
  3524101629,
  2768942443,
  901097722,
  1119000684,
  3686517206,
  2898065728,
  853044451,
  1172266101,
  3705015759,
  2882616665,
  651767980,
  1373503546,
  3369554304,
  3218104598,
  565507253,
  1454621731,
  3485111705,
  3099436303,
  671266974,
  1594198024,
  3322730930,
  2970347812,
  795835527,
  1483230225,
  3244367275,
  3060149565,
  1994146192,
  31158534,
  2563907772,
  4023717930,
  1907459465,
  112637215,
  2680153253,
  3904427059,
  2013776290,
  251722036,
  2517215374,
  3775830040,
  2137656763,
  141376813,
  2439277719,
  3865271297,
  1802195444,
  476864866,
  2238001368,
  4066508878,
  1812370925,
  453092731,
  2181625025,
  4111451223,
  1706088902,
  314042704,
  2344532202,
  4240017532,
  1658658271,
  366619977,
  2362670323,
  4224994405,
  1303535960,
  984961486,
  2747007092,
  3569037538,
  1256170817,
  1037604311,
  2765210733,
  3554079995,
  1131014506,
  879679996,
  2909243462,
  3663771856,
  1141124467,
  855842277,
  2852801631,
  3708648649,
  1342533948,
  654459306,
  3188396048,
  3373015174,
  1466479909,
  544179635,
  3110523913,
  3462522015,
  1591671054,
  702138776,
  2966460450,
  3352799412,
  1504918807,
  783551873,
  3082640443,
  3233442989,
  3988292384,
  2596254646,
  62317068,
  1957810842,
  3939845945,
  2647816111,
  81470997,
  1943803523,
  3814918930,
  2489596804,
  225274430,
  2053790376,
  3826175755,
  2466906013,
  167816743,
  2097651377,
  4027552580,
  2265490386,
  503444072,
  1762050814,
  4150417245,
  2154129355,
  426522225,
  1852507879,
  4275313526,
  2312317920,
  282753626,
  1742555852,
  4189708143,
  2394877945,
  397917763,
  1622183637,
  3604390888,
  2714866558,
  953729732,
  1340076626,
  3518719985,
  2797360999,
  1068828381,
  1219638859,
  3624741850,
  2936675148,
  906185462,
  1090812512,
  3747672003,
  2825379669,
  829329135,
  1181335161,
  3412177804,
  3160834842,
  628085408,
  1382605366,
  3423369109,
  3138078467,
  570562233,
  1426400815,
  3317316542,
  2998733608,
  733239954,
  1555261956,
  3268935591,
  3050360625,
  752459403,
  1541320221,
  2607071920,
  3965973030,
  1969922972,
  40735498,
  2617837225,
  3943577151,
  1913087877,
  83908371,
  2512341634,
  3803740692,
  2075208622,
  213261112,
  2463272603,
  3855990285,
  2094854071,
  198958881,
  2262029012,
  4057260610,
  1759359992,
  534414190,
  2176718541,
  4139329115,
  1873836001,
  414664567,
  2282248934,
  4279200368,
  1711684554,
  285281116,
  2405801727,
  4167216745,
  1634467795,
  376229701,
  2685067896,
  3608007406,
  1308918612,
  956543938,
  2808555105,
  3495958263,
  1231636301,
  1047427035,
  2932959818,
  3654703836,
  1088359270,
  936918e3,
  2847714899,
  3736837829,
  1202900863,
  817233897,
  3183342108,
  3401237130,
  1404277552,
  615818150,
  3134207493,
  3453421203,
  1423857449,
  601450431,
  3009837614,
  3294710456,
  1567103746,
  711928724,
  3020668471,
  3272380065,
  1510334235,
  755167117
];
if (typeof Int32Array !== "undefined") {
  CRC_TABLE = new Int32Array(CRC_TABLE);
}
function ensureBuffer(input) {
  if (Buffer$1.isBuffer(input)) {
    return input;
  }
  var hasNewBufferAPI = typeof Buffer$1.alloc === "function" && typeof Buffer$1.from === "function";
  if (typeof input === "number") {
    return hasNewBufferAPI ? Buffer$1.alloc(input) : new Buffer$1(input);
  } else if (typeof input === "string") {
    return hasNewBufferAPI ? Buffer$1.from(input) : new Buffer$1(input);
  } else {
    throw new Error("input must be buffer, number, or string, received " + typeof input);
  }
}
function bufferizeInt(num) {
  var tmp = ensureBuffer(4);
  tmp.writeInt32BE(num, 0);
  return tmp;
}
function _crc32(buf, previous) {
  buf = ensureBuffer(buf);
  if (Buffer$1.isBuffer(previous)) {
    previous = previous.readUInt32BE(0);
  }
  var crc = ~~previous ^ -1;
  for (var n = 0; n < buf.length; n++) {
    crc = CRC_TABLE[(crc ^ buf[n]) & 255] ^ crc >>> 8;
  }
  return crc ^ -1;
}
function crc32$1() {
  return bufferizeInt(_crc32.apply(null, arguments));
}
crc32$1.signed = function() {
  return _crc32.apply(null, arguments);
};
crc32$1.unsigned = function() {
  return _crc32.apply(null, arguments) >>> 0;
};
var bufferCrc32 = crc32$1;
var fs$1 = fs$4;
var zlib = require$$1$2;
var fd_slicer = fdSlicer;
var crc32 = bufferCrc32;
var util = require$$1$1;
var EventEmitter = require$$4.EventEmitter;
var Transform = require$$6.Transform;
var PassThrough = require$$6.PassThrough;
var Writable = require$$6.Writable;
yauzl$1.open = open;
yauzl$1.fromFd = fromFd;
yauzl$1.fromBuffer = fromBuffer;
yauzl$1.fromRandomAccessReader = fromRandomAccessReader;
yauzl$1.dosDateTimeToDate = dosDateTimeToDate;
yauzl$1.validateFileName = validateFileName;
yauzl$1.ZipFile = ZipFile;
yauzl$1.Entry = Entry;
yauzl$1.RandomAccessReader = RandomAccessReader;
function open(path2, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = null;
  }
  if (options == null) options = {};
  if (options.autoClose == null) options.autoClose = true;
  if (options.lazyEntries == null) options.lazyEntries = false;
  if (options.decodeStrings == null) options.decodeStrings = true;
  if (options.validateEntrySizes == null) options.validateEntrySizes = true;
  if (options.strictFileNames == null) options.strictFileNames = false;
  if (callback == null) callback = defaultCallback;
  fs$1.open(path2, "r", function(err, fd) {
    if (err) return callback(err);
    fromFd(fd, options, function(err2, zipfile) {
      if (err2) fs$1.close(fd, defaultCallback);
      callback(err2, zipfile);
    });
  });
}
function fromFd(fd, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = null;
  }
  if (options == null) options = {};
  if (options.autoClose == null) options.autoClose = false;
  if (options.lazyEntries == null) options.lazyEntries = false;
  if (options.decodeStrings == null) options.decodeStrings = true;
  if (options.validateEntrySizes == null) options.validateEntrySizes = true;
  if (options.strictFileNames == null) options.strictFileNames = false;
  if (callback == null) callback = defaultCallback;
  fs$1.fstat(fd, function(err, stats) {
    if (err) return callback(err);
    var reader = fd_slicer.createFromFd(fd, { autoClose: true });
    fromRandomAccessReader(reader, stats.size, options, callback);
  });
}
function fromBuffer(buffer, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = null;
  }
  if (options == null) options = {};
  options.autoClose = false;
  if (options.lazyEntries == null) options.lazyEntries = false;
  if (options.decodeStrings == null) options.decodeStrings = true;
  if (options.validateEntrySizes == null) options.validateEntrySizes = true;
  if (options.strictFileNames == null) options.strictFileNames = false;
  var reader = fd_slicer.createFromBuffer(buffer, { maxChunkSize: 65536 });
  fromRandomAccessReader(reader, buffer.length, options, callback);
}
function fromRandomAccessReader(reader, totalSize, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = null;
  }
  if (options == null) options = {};
  if (options.autoClose == null) options.autoClose = true;
  if (options.lazyEntries == null) options.lazyEntries = false;
  if (options.decodeStrings == null) options.decodeStrings = true;
  var decodeStrings = !!options.decodeStrings;
  if (options.validateEntrySizes == null) options.validateEntrySizes = true;
  if (options.strictFileNames == null) options.strictFileNames = false;
  if (callback == null) callback = defaultCallback;
  if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
  if (totalSize > Number.MAX_SAFE_INTEGER) {
    throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
  }
  reader.ref();
  var eocdrWithoutCommentSize = 22;
  var maxCommentSize = 65535;
  var bufferSize = Math.min(eocdrWithoutCommentSize + maxCommentSize, totalSize);
  var buffer = newBuffer(bufferSize);
  var bufferReadStart = totalSize - buffer.length;
  readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function(err) {
    if (err) return callback(err);
    for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
      if (buffer.readUInt32LE(i) !== 101010256) continue;
      var eocdrBuffer = buffer.slice(i);
      var diskNumber = eocdrBuffer.readUInt16LE(4);
      if (diskNumber !== 0) {
        return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
      }
      var entryCount = eocdrBuffer.readUInt16LE(10);
      var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
      var commentLength = eocdrBuffer.readUInt16LE(20);
      var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
      if (commentLength !== expectedCommentLength) {
        return callback(new Error("invalid comment length. expected: " + expectedCommentLength + ". found: " + commentLength));
      }
      var comment = decodeStrings ? decodeBuffer(eocdrBuffer, 22, eocdrBuffer.length, false) : eocdrBuffer.slice(22);
      if (!(entryCount === 65535 || centralDirectoryOffset === 4294967295)) {
        return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
      }
      var zip64EocdlBuffer = newBuffer(20);
      var zip64EocdlOffset = bufferReadStart + i - zip64EocdlBuffer.length;
      readAndAssertNoEof(reader, zip64EocdlBuffer, 0, zip64EocdlBuffer.length, zip64EocdlOffset, function(err2) {
        if (err2) return callback(err2);
        if (zip64EocdlBuffer.readUInt32LE(0) !== 117853008) {
          return callback(new Error("invalid zip64 end of central directory locator signature"));
        }
        var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
        var zip64EocdrBuffer = newBuffer(56);
        readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function(err3) {
          if (err3) return callback(err3);
          if (zip64EocdrBuffer.readUInt32LE(0) !== 101075792) {
            return callback(new Error("invalid zip64 end of central directory record signature"));
          }
          entryCount = readUInt64LE(zip64EocdrBuffer, 32);
          centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
          return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
        });
      });
      return;
    }
    callback(new Error("end of central directory record signature not found"));
  });
}
util.inherits(ZipFile, EventEmitter);
function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
  var self2 = this;
  EventEmitter.call(self2);
  self2.reader = reader;
  self2.reader.on("error", function(err) {
    emitError(self2, err);
  });
  self2.reader.once("close", function() {
    self2.emit("close");
  });
  self2.readEntryCursor = centralDirectoryOffset;
  self2.fileSize = fileSize;
  self2.entryCount = entryCount;
  self2.comment = comment;
  self2.entriesRead = 0;
  self2.autoClose = !!autoClose;
  self2.lazyEntries = !!lazyEntries;
  self2.decodeStrings = !!decodeStrings;
  self2.validateEntrySizes = !!validateEntrySizes;
  self2.strictFileNames = !!strictFileNames;
  self2.isOpen = true;
  self2.emittedError = false;
  if (!self2.lazyEntries) self2._readEntry();
}
ZipFile.prototype.close = function() {
  if (!this.isOpen) return;
  this.isOpen = false;
  this.reader.unref();
};
function emitErrorAndAutoClose(self2, err) {
  if (self2.autoClose) self2.close();
  emitError(self2, err);
}
function emitError(self2, err) {
  if (self2.emittedError) return;
  self2.emittedError = true;
  self2.emit("error", err);
}
ZipFile.prototype.readEntry = function() {
  if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
  this._readEntry();
};
ZipFile.prototype._readEntry = function() {
  var self2 = this;
  if (self2.entryCount === self2.entriesRead) {
    setImmediate(function() {
      if (self2.autoClose) self2.close();
      if (self2.emittedError) return;
      self2.emit("end");
    });
    return;
  }
  if (self2.emittedError) return;
  var buffer = newBuffer(46);
  readAndAssertNoEof(self2.reader, buffer, 0, buffer.length, self2.readEntryCursor, function(err) {
    if (err) return emitErrorAndAutoClose(self2, err);
    if (self2.emittedError) return;
    var entry = new Entry();
    var signature = buffer.readUInt32LE(0);
    if (signature !== 33639248) return emitErrorAndAutoClose(self2, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
    entry.versionMadeBy = buffer.readUInt16LE(4);
    entry.versionNeededToExtract = buffer.readUInt16LE(6);
    entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
    entry.compressionMethod = buffer.readUInt16LE(10);
    entry.lastModFileTime = buffer.readUInt16LE(12);
    entry.lastModFileDate = buffer.readUInt16LE(14);
    entry.crc32 = buffer.readUInt32LE(16);
    entry.compressedSize = buffer.readUInt32LE(20);
    entry.uncompressedSize = buffer.readUInt32LE(24);
    entry.fileNameLength = buffer.readUInt16LE(28);
    entry.extraFieldLength = buffer.readUInt16LE(30);
    entry.fileCommentLength = buffer.readUInt16LE(32);
    entry.internalFileAttributes = buffer.readUInt16LE(36);
    entry.externalFileAttributes = buffer.readUInt32LE(38);
    entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);
    if (entry.generalPurposeBitFlag & 64) return emitErrorAndAutoClose(self2, new Error("strong encryption is not supported"));
    self2.readEntryCursor += 46;
    buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
    readAndAssertNoEof(self2.reader, buffer, 0, buffer.length, self2.readEntryCursor, function(err2) {
      if (err2) return emitErrorAndAutoClose(self2, err2);
      if (self2.emittedError) return;
      var isUtf8 = (entry.generalPurposeBitFlag & 2048) !== 0;
      entry.fileName = self2.decodeStrings ? decodeBuffer(buffer, 0, entry.fileNameLength, isUtf8) : buffer.slice(0, entry.fileNameLength);
      var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
      var extraFieldBuffer = buffer.slice(entry.fileNameLength, fileCommentStart);
      entry.extraFields = [];
      var i = 0;
      while (i < extraFieldBuffer.length - 3) {
        var headerId = extraFieldBuffer.readUInt16LE(i + 0);
        var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
        var dataStart = i + 4;
        var dataEnd = dataStart + dataSize;
        if (dataEnd > extraFieldBuffer.length) return emitErrorAndAutoClose(self2, new Error("extra field length exceeds extra field buffer size"));
        var dataBuffer = newBuffer(dataSize);
        extraFieldBuffer.copy(dataBuffer, 0, dataStart, dataEnd);
        entry.extraFields.push({
          id: headerId,
          data: dataBuffer
        });
        i = dataEnd;
      }
      entry.fileComment = self2.decodeStrings ? decodeBuffer(buffer, fileCommentStart, fileCommentStart + entry.fileCommentLength, isUtf8) : buffer.slice(fileCommentStart, fileCommentStart + entry.fileCommentLength);
      entry.comment = entry.fileComment;
      self2.readEntryCursor += buffer.length;
      self2.entriesRead += 1;
      if (entry.uncompressedSize === 4294967295 || entry.compressedSize === 4294967295 || entry.relativeOffsetOfLocalHeader === 4294967295) {
        var zip64EiefBuffer = null;
        for (var i = 0; i < entry.extraFields.length; i++) {
          var extraField = entry.extraFields[i];
          if (extraField.id === 1) {
            zip64EiefBuffer = extraField.data;
            break;
          }
        }
        if (zip64EiefBuffer == null) {
          return emitErrorAndAutoClose(self2, new Error("expected zip64 extended information extra field"));
        }
        var index = 0;
        if (entry.uncompressedSize === 4294967295) {
          if (index + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self2, new Error("zip64 extended information extra field does not include uncompressed size"));
          }
          entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
          index += 8;
        }
        if (entry.compressedSize === 4294967295) {
          if (index + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self2, new Error("zip64 extended information extra field does not include compressed size"));
          }
          entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
          index += 8;
        }
        if (entry.relativeOffsetOfLocalHeader === 4294967295) {
          if (index + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self2, new Error("zip64 extended information extra field does not include relative header offset"));
          }
          entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
          index += 8;
        }
      }
      if (self2.decodeStrings) {
        for (var i = 0; i < entry.extraFields.length; i++) {
          var extraField = entry.extraFields[i];
          if (extraField.id === 28789) {
            if (extraField.data.length < 6) {
              continue;
            }
            if (extraField.data.readUInt8(0) !== 1) {
              continue;
            }
            var oldNameCrc32 = extraField.data.readUInt32LE(1);
            if (crc32.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
              continue;
            }
            entry.fileName = decodeBuffer(extraField.data, 5, extraField.data.length, true);
            break;
          }
        }
      }
      if (self2.validateEntrySizes && entry.compressionMethod === 0) {
        var expectedCompressedSize = entry.uncompressedSize;
        if (entry.isEncrypted()) {
          expectedCompressedSize += 12;
        }
        if (entry.compressedSize !== expectedCompressedSize) {
          var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
          return emitErrorAndAutoClose(self2, new Error(msg));
        }
      }
      if (self2.decodeStrings) {
        if (!self2.strictFileNames) {
          entry.fileName = entry.fileName.replace(/\\/g, "/");
        }
        var errorMessage = validateFileName(entry.fileName, self2.validateFileNameOptions);
        if (errorMessage != null) return emitErrorAndAutoClose(self2, new Error(errorMessage));
      }
      self2.emit("entry", entry);
      if (!self2.lazyEntries) self2._readEntry();
    });
  });
};
ZipFile.prototype.openReadStream = function(entry, options, callback) {
  var self2 = this;
  var relativeStart = 0;
  var relativeEnd = entry.compressedSize;
  if (callback == null) {
    callback = options;
    options = {};
  } else {
    if (options.decrypt != null) {
      if (!entry.isEncrypted()) {
        throw new Error("options.decrypt can only be specified for encrypted entries");
      }
      if (options.decrypt !== false) throw new Error("invalid options.decrypt value: " + options.decrypt);
      if (entry.isCompressed()) {
        if (options.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false");
      }
    }
    if (options.decompress != null) {
      if (!entry.isCompressed()) {
        throw new Error("options.decompress can only be specified for compressed entries");
      }
      if (!(options.decompress === false || options.decompress === true)) {
        throw new Error("invalid options.decompress value: " + options.decompress);
      }
    }
    if (options.start != null || options.end != null) {
      if (entry.isCompressed() && options.decompress !== false) {
        throw new Error("start/end range not allowed for compressed entry without options.decompress === false");
      }
      if (entry.isEncrypted() && options.decrypt !== false) {
        throw new Error("start/end range not allowed for encrypted entry without options.decrypt === false");
      }
    }
    if (options.start != null) {
      relativeStart = options.start;
      if (relativeStart < 0) throw new Error("options.start < 0");
      if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
    }
    if (options.end != null) {
      relativeEnd = options.end;
      if (relativeEnd < 0) throw new Error("options.end < 0");
      if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
      if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
    }
  }
  if (!self2.isOpen) return callback(new Error("closed"));
  if (entry.isEncrypted()) {
    if (options.decrypt !== false) return callback(new Error("entry is encrypted, and options.decrypt !== false"));
  }
  self2.reader.ref();
  var buffer = newBuffer(30);
  readAndAssertNoEof(self2.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function(err) {
    try {
      if (err) return callback(err);
      var signature = buffer.readUInt32LE(0);
      if (signature !== 67324752) {
        return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
      }
      var fileNameLength = buffer.readUInt16LE(26);
      var extraFieldLength = buffer.readUInt16LE(28);
      var localFileHeaderEnd = entry.relativeOffsetOfLocalHeader + buffer.length + fileNameLength + extraFieldLength;
      var decompress;
      if (entry.compressionMethod === 0) {
        decompress = false;
      } else if (entry.compressionMethod === 8) {
        decompress = options.decompress != null ? options.decompress : true;
      } else {
        return callback(new Error("unsupported compression method: " + entry.compressionMethod));
      }
      var fileDataStart = localFileHeaderEnd;
      var fileDataEnd = fileDataStart + entry.compressedSize;
      if (entry.compressedSize !== 0) {
        if (fileDataEnd > self2.fileSize) {
          return callback(new Error("file data overflows file bounds: " + fileDataStart + " + " + entry.compressedSize + " > " + self2.fileSize));
        }
      }
      var readStream = self2.reader.createReadStream({
        start: fileDataStart + relativeStart,
        end: fileDataStart + relativeEnd
      });
      var endpointStream = readStream;
      if (decompress) {
        var destroyed = false;
        var inflateFilter = zlib.createInflateRaw();
        readStream.on("error", function(err2) {
          setImmediate(function() {
            if (!destroyed) inflateFilter.emit("error", err2);
          });
        });
        readStream.pipe(inflateFilter);
        if (self2.validateEntrySizes) {
          endpointStream = new AssertByteCountStream(entry.uncompressedSize);
          inflateFilter.on("error", function(err2) {
            setImmediate(function() {
              if (!destroyed) endpointStream.emit("error", err2);
            });
          });
          inflateFilter.pipe(endpointStream);
        } else {
          endpointStream = inflateFilter;
        }
        endpointStream.destroy = function() {
          destroyed = true;
          if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
          readStream.unpipe(inflateFilter);
          readStream.destroy();
        };
      }
      callback(null, endpointStream);
    } finally {
      self2.reader.unref();
    }
  });
};
function Entry() {
}
Entry.prototype.getLastModDate = function() {
  return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime);
};
Entry.prototype.isEncrypted = function() {
  return (this.generalPurposeBitFlag & 1) !== 0;
};
Entry.prototype.isCompressed = function() {
  return this.compressionMethod === 8;
};
function dosDateTimeToDate(date, time) {
  var day = date & 31;
  var month = (date >> 5 & 15) - 1;
  var year = (date >> 9 & 127) + 1980;
  var millisecond = 0;
  var second = (time & 31) * 2;
  var minute = time >> 5 & 63;
  var hour = time >> 11 & 31;
  return new Date(year, month, day, hour, minute, second, millisecond);
}
function validateFileName(fileName) {
  if (fileName.indexOf("\\") !== -1) {
    return "invalid characters in fileName: " + fileName;
  }
  if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
    return "absolute path: " + fileName;
  }
  if (fileName.split("/").indexOf("..") !== -1) {
    return "invalid relative path: " + fileName;
  }
  return null;
}
function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
  if (length === 0) {
    return setImmediate(function() {
      callback(null, newBuffer(0));
    });
  }
  reader.read(buffer, offset, length, position, function(err, bytesRead) {
    if (err) return callback(err);
    if (bytesRead < length) {
      return callback(new Error("unexpected EOF"));
    }
    callback();
  });
}
util.inherits(AssertByteCountStream, Transform);
function AssertByteCountStream(byteCount) {
  Transform.call(this);
  this.actualByteCount = 0;
  this.expectedByteCount = byteCount;
}
AssertByteCountStream.prototype._transform = function(chunk, encoding, cb) {
  this.actualByteCount += chunk.length;
  if (this.actualByteCount > this.expectedByteCount) {
    var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
    return cb(new Error(msg));
  }
  cb(null, chunk);
};
AssertByteCountStream.prototype._flush = function(cb) {
  if (this.actualByteCount < this.expectedByteCount) {
    var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
    return cb(new Error(msg));
  }
  cb();
};
util.inherits(RandomAccessReader, EventEmitter);
function RandomAccessReader() {
  EventEmitter.call(this);
  this.refCount = 0;
}
RandomAccessReader.prototype.ref = function() {
  this.refCount += 1;
};
RandomAccessReader.prototype.unref = function() {
  var self2 = this;
  self2.refCount -= 1;
  if (self2.refCount > 0) return;
  if (self2.refCount < 0) throw new Error("invalid unref");
  self2.close(onCloseDone);
  function onCloseDone(err) {
    if (err) return self2.emit("error", err);
    self2.emit("close");
  }
};
RandomAccessReader.prototype.createReadStream = function(options) {
  var start = options.start;
  var end = options.end;
  if (start === end) {
    var emptyStream = new PassThrough();
    setImmediate(function() {
      emptyStream.end();
    });
    return emptyStream;
  }
  var stream2 = this._readStreamForRange(start, end);
  var destroyed = false;
  var refUnrefFilter = new RefUnrefFilter(this);
  stream2.on("error", function(err) {
    setImmediate(function() {
      if (!destroyed) refUnrefFilter.emit("error", err);
    });
  });
  refUnrefFilter.destroy = function() {
    stream2.unpipe(refUnrefFilter);
    refUnrefFilter.unref();
    stream2.destroy();
  };
  var byteCounter = new AssertByteCountStream(end - start);
  refUnrefFilter.on("error", function(err) {
    setImmediate(function() {
      if (!destroyed) byteCounter.emit("error", err);
    });
  });
  byteCounter.destroy = function() {
    destroyed = true;
    refUnrefFilter.unpipe(byteCounter);
    refUnrefFilter.destroy();
  };
  return stream2.pipe(refUnrefFilter).pipe(byteCounter);
};
RandomAccessReader.prototype._readStreamForRange = function(start, end) {
  throw new Error("not implemented");
};
RandomAccessReader.prototype.read = function(buffer, offset, length, position, callback) {
  var readStream = this.createReadStream({ start: position, end: position + length });
  var writeStream = new Writable();
  var written = 0;
  writeStream._write = function(chunk, encoding, cb) {
    chunk.copy(buffer, offset + written, 0, chunk.length);
    written += chunk.length;
    cb();
  };
  writeStream.on("finish", callback);
  readStream.on("error", function(error) {
    callback(error);
  });
  readStream.pipe(writeStream);
};
RandomAccessReader.prototype.close = function(callback) {
  setImmediate(callback);
};
util.inherits(RefUnrefFilter, PassThrough);
function RefUnrefFilter(context) {
  PassThrough.call(this);
  this.context = context;
  this.context.ref();
  this.unreffedYet = false;
}
RefUnrefFilter.prototype._flush = function(cb) {
  this.unref();
  cb();
};
RefUnrefFilter.prototype.unref = function(cb) {
  if (this.unreffedYet) return;
  this.unreffedYet = true;
  this.context.unref();
};
var cp437 = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
function decodeBuffer(buffer, start, end, isUtf8) {
  if (isUtf8) {
    return buffer.toString("utf8", start, end);
  } else {
    var result = "";
    for (var i = start; i < end; i++) {
      result += cp437[buffer[i]];
    }
    return result;
  }
}
function readUInt64LE(buffer, offset) {
  var lower32 = buffer.readUInt32LE(offset);
  var upper32 = buffer.readUInt32LE(offset + 4);
  return upper32 * 4294967296 + lower32;
}
var newBuffer;
if (typeof Buffer.allocUnsafe === "function") {
  newBuffer = function(len) {
    return Buffer.allocUnsafe(len);
  };
} else {
  newBuffer = function(len) {
    return new Buffer(len);
  };
}
function defaultCallback(err) {
  if (err) throw err;
}
const debug = srcExports("extract-zip");
const { createWriteStream, promises: fs } = fs$4;
const getStream = getStreamExports;
const path = path$1;
const { promisify } = require$$1$1;
const stream = require$$6;
const yauzl = yauzl$1;
const openZip = promisify(yauzl.open);
const pipeline = promisify(stream.pipeline);
class Extractor {
  constructor(zipPath, opts) {
    this.zipPath = zipPath;
    this.opts = opts;
  }
  async extract() {
    debug("opening", this.zipPath, "with opts", this.opts);
    this.zipfile = await openZip(this.zipPath, { lazyEntries: true });
    this.canceled = false;
    return new Promise((resolve, reject) => {
      this.zipfile.on("error", (err) => {
        this.canceled = true;
        reject(err);
      });
      this.zipfile.readEntry();
      this.zipfile.on("close", () => {
        if (!this.canceled) {
          debug("zip extraction complete");
          resolve();
        }
      });
      this.zipfile.on("entry", async (entry) => {
        if (this.canceled) {
          debug("skipping entry", entry.fileName, { cancelled: this.canceled });
          return;
        }
        debug("zipfile entry", entry.fileName);
        if (entry.fileName.startsWith("__MACOSX/")) {
          this.zipfile.readEntry();
          return;
        }
        const destDir = path.dirname(path.join(this.opts.dir, entry.fileName));
        try {
          await fs.mkdir(destDir, { recursive: true });
          const canonicalDestDir = await fs.realpath(destDir);
          const relativeDestDir = path.relative(this.opts.dir, canonicalDestDir);
          if (relativeDestDir.split(path.sep).includes("..")) {
            throw new Error(`Out of bound path "${canonicalDestDir}" found while processing file ${entry.fileName}`);
          }
          await this.extractEntry(entry);
          debug("finished processing", entry.fileName);
          this.zipfile.readEntry();
        } catch (err) {
          this.canceled = true;
          this.zipfile.close();
          reject(err);
        }
      });
    });
  }
  async extractEntry(entry) {
    if (this.canceled) {
      debug("skipping entry extraction", entry.fileName, { cancelled: this.canceled });
      return;
    }
    if (this.opts.onEntry) {
      this.opts.onEntry(entry, this.zipfile);
    }
    const dest = path.join(this.opts.dir, entry.fileName);
    const mode = entry.externalFileAttributes >> 16 & 65535;
    const IFMT = 61440;
    const IFDIR = 16384;
    const IFLNK = 40960;
    const symlink = (mode & IFMT) === IFLNK;
    let isDir = (mode & IFMT) === IFDIR;
    if (!isDir && entry.fileName.endsWith("/")) {
      isDir = true;
    }
    const madeBy = entry.versionMadeBy >> 8;
    if (!isDir) isDir = madeBy === 0 && entry.externalFileAttributes === 16;
    debug("extracting entry", { filename: entry.fileName, isDir, isSymlink: symlink });
    const procMode = this.getExtractedMode(mode, isDir) & 511;
    const destDir = isDir ? dest : path.dirname(dest);
    const mkdirOptions = { recursive: true };
    if (isDir) {
      mkdirOptions.mode = procMode;
    }
    debug("mkdir", { dir: destDir, ...mkdirOptions });
    await fs.mkdir(destDir, mkdirOptions);
    if (isDir) return;
    debug("opening read stream", dest);
    const readStream = await promisify(this.zipfile.openReadStream.bind(this.zipfile))(entry);
    if (symlink) {
      const link = await getStream(readStream);
      debug("creating symlink", link, dest);
      await fs.symlink(link, dest);
    } else {
      await pipeline(readStream, createWriteStream(dest, { mode: procMode }));
    }
  }
  getExtractedMode(entryMode, isDir) {
    let mode = entryMode;
    if (mode === 0) {
      if (isDir) {
        if (this.opts.defaultDirMode) {
          mode = parseInt(this.opts.defaultDirMode, 10);
        }
        if (!mode) {
          mode = 493;
        }
      } else {
        if (this.opts.defaultFileMode) {
          mode = parseInt(this.opts.defaultFileMode, 10);
        }
        if (!mode) {
          mode = 420;
        }
      }
    }
    return mode;
  }
}
var extractZip$1 = async function(zipPath, opts) {
  debug("creating target directory", opts.dir);
  if (!path.isAbsolute(opts.dir)) {
    throw new Error("Target directory is expected to be absolute");
  }
  await fs.mkdir(opts.dir, { recursive: true });
  opts.dir = await fs.realpath(opts.dir);
  return new Extractor(zipPath, opts).extract();
};
const extractZip = /* @__PURE__ */ getDefaultExportFromCjs(extractZip$1);
function cpRecursiveSync(src2, dest, opts = {}) {
  const { dereference = false, force = false } = opts;
  const stat = dereference ? fs$4.statSync(src2) : fs$4.lstatSync(src2);
  if (stat.isDirectory()) {
    if (!fs$4.existsSync(dest)) {
      fs$4.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs$4.readdirSync(src2)) {
      cpRecursiveSync(path$1.join(src2, entry), path$1.join(dest, entry), opts);
    }
  } else if (stat.isFile()) {
    if (fs$4.existsSync(dest) && !force) {
      return;
    }
    const destDir = path$1.dirname(dest);
    if (!fs$4.existsSync(destDir)) {
      fs$4.mkdirSync(destDir, { recursive: true });
    }
    fs$4.copyFileSync(src2, dest);
  } else if (stat.isSymbolicLink()) {
    if (fs$4.existsSync(dest)) {
      if (!force) return;
      fs$4.unlinkSync(dest);
    }
    const target = fs$4.readlinkSync(src2);
    fs$4.symlinkSync(target, dest);
  }
}
const PYTHON_RUNTIME_DIR_NAME = "python-win";
[
  path$1.join("Scripts", "pip.exe"),
  path$1.join("Scripts", "pip3.exe"),
  path$1.join("Scripts", "pip.cmd"),
  path$1.join("Scripts", "pip3.cmd"),
  path$1.join("Scripts", "pip"),
  path$1.join("Scripts", "pip3")
];
path$1.join("Lib", "site-packages", "pip", "__main__.py");
path$1.join("Lib", "site-packages", "pip", "__init__.py");
function appendWindowsPath(current, entries) {
  const delimiter = ";";
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  const append = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase().replace(/[\\/]+$/, "");
    if (seen.has(normalized)) return;
    seen.add(normalized);
    merged.push(trimmed);
  };
  entries.forEach(append);
  (current || "").split(delimiter).forEach(append);
  return merged.length > 0 ? merged.join(delimiter) : current;
}
function resolveBundledCandidates() {
  if (electron.app.isPackaged) {
    return [
      path$1.join(process.resourcesPath, PYTHON_RUNTIME_DIR_NAME),
      path$1.join(electron.app.getAppPath(), PYTHON_RUNTIME_DIR_NAME)
    ];
  }
  const projectRoot = path$1.resolve(__dirname, "..", "..", "..");
  return [
    path$1.join(projectRoot, "resources", PYTHON_RUNTIME_DIR_NAME),
    path$1.join(process.cwd(), "resources", PYTHON_RUNTIME_DIR_NAME),
    path$1.join(electron.app.getAppPath(), "resources", PYTHON_RUNTIME_DIR_NAME)
  ];
}
function getBundledPythonRoot() {
  const candidates = resolveBundledCandidates();
  for (const candidate of candidates) {
    if (fs$4.existsSync(candidate) && fs$4.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}
function getUserPythonRoot() {
  return path$1.join(electron.app.getPath("userData"), "runtimes", PYTHON_RUNTIME_DIR_NAME);
}
function appendPythonRuntimeToEnv(env) {
  if (process.platform !== "win32") {
    return env;
  }
  const userRoot = getUserPythonRoot();
  const bundledRoot = getBundledPythonRoot();
  const candidates = [userRoot, bundledRoot].filter((value) => Boolean(value));
  const pathEntries = [];
  for (const root of candidates) {
    if (!fs$4.existsSync(root)) continue;
    pathEntries.push(root, path$1.join(root, "Scripts"));
  }
  if (pathEntries.length > 0) {
    env.PATH = appendWindowsPath(env.PATH, pathEntries);
    env.LOBSTERAI_PYTHON_ROOT = pathEntries[0];
  }
  return env;
}
function resolveUserShellPath() {
  if (process.platform === "win32") return null;
  try {
    const shell = process.env.SHELL || "/bin/bash";
    const result = child_process.execSync(`${shell} -ilc 'echo __PATH__=$PATH'`, {
      encoding: "utf-8",
      timeout: 5e3,
      env: { ...process.env }
    });
    const match = result.match(/__PATH__=(.+)/);
    return match ? match[1].trim() : null;
  } catch (error) {
    console.warn("[skills] Failed to resolve user shell PATH:", error);
    return null;
  }
}
function hasCommand(command, env) {
  var _a;
  const isWin = process.platform === "win32";
  const checker = isWin ? "where" : "which";
  const result = child_process.spawnSync(checker, [command], {
    stdio: "pipe",
    env,
    shell: isWin,
    timeout: 5e3
  });
  if (result.status !== 0) {
    console.log(
      `[skills] hasCommand('${command}'): not found (status=${result.status}, error=${((_a = result.error) == null ? void 0 : _a.message) || "none"})`
    );
  }
  return result.status === 0;
}
function normalizePathKey(env) {
  if (process.platform !== "win32") return;
  const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === "path");
  if (pathKeys.length <= 1) return;
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const key of pathKeys) {
    const value = env[key];
    if (!value) continue;
    for (const entry of value.split(";")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const normalized = trimmed.toLowerCase().replace(/[\\/]+$/, "");
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(trimmed);
    }
    if (key !== "PATH") {
      delete env[key];
    }
  }
  env.PATH = merged.join(";");
}
function resolveWindowsRegistryPath() {
  if (process.platform !== "win32") return null;
  try {
    const machinePath = child_process.execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path',
      { encoding: "utf-8", timeout: 5e3, stdio: ["ignore", "pipe", "ignore"] }
    );
    const userPath = child_process.execSync('reg query "HKCU\\Environment" /v Path', {
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const extract = (output) => {
      const match = output.match(/Path\s+REG_(?:EXPAND_)?SZ\s+(.+)/i);
      return match ? match[1].trim() : "";
    };
    const combined = [extract(machinePath), extract(userPath)].filter(Boolean).join(";");
    return combined || null;
  } catch {
    return null;
  }
}
function buildSkillEnv() {
  const env = { ...process.env };
  normalizePathKey(env);
  if (electron.app.isPackaged) {
    if (!env.HOME) {
      env.HOME = electron.app.getPath("home");
    }
    if (process.platform === "win32") {
      const registryPath = resolveWindowsRegistryPath();
      if (registryPath) {
        const currentPath = env.PATH || "";
        const seen = new Set(
          currentPath.toLowerCase().split(";").map((s) => s.trim().replace(/[\\/]+$/, "")).filter(Boolean)
        );
        const extra = [];
        for (const entry of registryPath.split(";")) {
          const trimmed = entry.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase().replace(/[\\/]+$/, "");
          if (!seen.has(key)) {
            seen.add(key);
            extra.push(trimmed);
          }
        }
        if (extra.length > 0) {
          env.PATH = currentPath ? `${currentPath};${extra.join(";")}` : extra.join(";");
          console.log(
            "[skills] Merged registry PATH entries for skill scripts"
          );
        }
      }
      const commonWinPaths = [
        "C:\\Program Files\\nodejs",
        "C:\\Program Files (x86)\\nodejs",
        `${env.APPDATA || ""}\\npm`,
        `${env.LOCALAPPDATA || ""}\\Programs\\nodejs`
      ].filter(Boolean);
      const pathSet = new Set(
        (env.PATH || "").toLowerCase().split(";").map((s) => s.trim().replace(/[\\/]+$/, ""))
      );
      const missingPaths = commonWinPaths.filter(
        (p) => !pathSet.has(p.toLowerCase().replace(/[\\/]+$/, ""))
      );
      if (missingPaths.length > 0) {
        env.PATH = env.PATH ? `${env.PATH};${missingPaths.join(";")}` : missingPaths.join(";");
      }
    } else {
      const userPath = resolveUserShellPath();
      if (userPath) {
        env.PATH = userPath;
        console.log("[skills] Resolved user shell PATH for skill scripts");
      } else {
        const commonPaths = [
          "/usr/local/bin",
          "/opt/homebrew/bin",
          `${env.HOME}/.nvm/current/bin`,
          `${env.HOME}/.volta/bin`,
          `${env.HOME}/.fnm/current/bin`
        ];
        env.PATH = [env.PATH, ...commonPaths].filter(Boolean).join(":");
        console.log("[skills] Using fallback PATH for skill scripts");
      }
    }
  }
  env.LOBSTERAI_ELECTRON_PATH = process.execPath;
  appendPythonRuntimeToEnv(env);
  normalizePathKey(env);
  return env;
}
const SKILLS_DIR_NAME = "SKILLs";
const SKILL_FILE_NAME = "SKILL.md";
const SKILLS_CONFIG_FILE = "skills.config.json";
const SKILL_STATE_KEY = "skills_state";
const WATCH_DEBOUNCE_MS = 250;
const CLAUDE_SKILLS_DIR_NAME = ".claude";
const CLAUDE_SKILLS_SUBDIR = "skills";
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const parseFrontmatter = (raw) => {
  const normalized = raw.replace(/^\uFEFF/, "");
  const match = normalized.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, content: normalized };
  }
  let frontmatter = {};
  try {
    const parsed = jsYaml.load(match[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed;
    }
  } catch (e) {
    console.warn("[skills] Failed to parse YAML frontmatter:", e);
  }
  const content = normalized.slice(match[0].length);
  return { frontmatter, content };
};
const isTruthy = (value) => {
  if (value === true) return true;
  if (!value) return false;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1";
};
const extractDescription = (content) => {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    return trimmed.replace(/^#+\s*/, "");
  }
  return "";
};
const normalizeFolderName = (name) => {
  const normalized = name.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "skill";
};
const isZipFile = (filePath) => path$1.extname(filePath).toLowerCase() === ".zip";
const compareVersions = (a, b) => {
  const pa = a.split(".").map((s) => parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};
const resolveWithin = (root, target) => {
  const resolvedRoot = path$1.resolve(root);
  const resolvedTarget = path$1.resolve(root, target);
  if (resolvedTarget === resolvedRoot) return resolvedTarget;
  if (!resolvedTarget.startsWith(resolvedRoot + path$1.sep)) {
    throw new Error("Invalid target path");
  }
  return resolvedTarget;
};
const appendEnvPath = (current, entries) => {
  const delimiter = process.platform === "win32" ? ";" : ":";
  const existing = (current || "").split(delimiter).filter(Boolean);
  const merged = [...existing];
  entries.forEach((entry) => {
    if (!entry || merged.includes(entry)) return;
    merged.push(entry);
  });
  return merged.join(delimiter);
};
const listWindowsCommandPaths = (command) => {
  if (process.platform !== "win32") return [];
  try {
    const result = child_process.spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result.status !== 0) return [];
    return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
};
const resolveWindowsGitExecutable = () => {
  if (process.platform !== "win32") return null;
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";
  const userProfile = process.env.USERPROFILE || "";
  const installedCandidates = [
    path$1.join(programFiles, "Git", "cmd", "git.exe"),
    path$1.join(programFiles, "Git", "bin", "git.exe"),
    path$1.join(programFilesX86, "Git", "cmd", "git.exe"),
    path$1.join(programFilesX86, "Git", "bin", "git.exe"),
    path$1.join(localAppData, "Programs", "Git", "cmd", "git.exe"),
    path$1.join(localAppData, "Programs", "Git", "bin", "git.exe"),
    path$1.join(userProfile, "scoop", "apps", "git", "current", "cmd", "git.exe"),
    path$1.join(userProfile, "scoop", "apps", "git", "current", "bin", "git.exe"),
    "C:\\Git\\cmd\\git.exe",
    "C:\\Git\\bin\\git.exe"
  ];
  for (const candidate of installedCandidates) {
    if (candidate && fs$4.existsSync(candidate)) {
      return candidate;
    }
  }
  const whereCandidates = listWindowsCommandPaths("where git");
  for (const candidate of whereCandidates) {
    const normalized = candidate.trim();
    if (!normalized) continue;
    if (normalized.toLowerCase().endsWith("git.exe") && fs$4.existsSync(normalized)) {
      return normalized;
    }
  }
  const bundledRoots = electron.app.isPackaged ? [path$1.join(process.resourcesPath, "mingit")] : [
    path$1.join(__dirname, "..", "..", "resources", "mingit"),
    path$1.join(process.cwd(), "resources", "mingit")
  ];
  for (const root of bundledRoots) {
    const bundledCandidates = [
      path$1.join(root, "cmd", "git.exe"),
      path$1.join(root, "bin", "git.exe"),
      path$1.join(root, "mingw64", "bin", "git.exe"),
      path$1.join(root, "usr", "bin", "git.exe")
    ];
    for (const candidate of bundledCandidates) {
      if (fs$4.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
};
const resolveGitCommand = () => {
  if (process.platform !== "win32") {
    return { command: "git" };
  }
  const gitExe = resolveWindowsGitExecutable();
  if (!gitExe) {
    return { command: "git" };
  }
  const env = { ...process.env };
  const gitDir = path$1.dirname(gitExe);
  const gitRoot = path$1.dirname(gitDir);
  const candidateDirs = [
    gitDir,
    path$1.join(gitRoot, "cmd"),
    path$1.join(gitRoot, "bin"),
    path$1.join(gitRoot, "mingw64", "bin"),
    path$1.join(gitRoot, "usr", "bin")
  ].filter((dir) => fs$4.existsSync(dir));
  env.PATH = appendEnvPath(env.PATH, candidateDirs);
  return { command: gitExe, env };
};
const runCommand = (command, args, options) => new Promise((resolve, reject) => {
  const child = child_process.spawn(command, args, {
    cwd: options == null ? void 0 : options.cwd,
    env: options == null ? void 0 : options.env,
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.on("error", (error) => reject(error));
  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(
      new Error(stderr.trim() || `Command failed with exit code ${code}`)
    );
  });
});
const runScriptWithTimeout = (options) => new Promise((resolve) => {
  const startedAt = Date.now();
  const child = child_process.spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let settled = false;
  let timedOut = false;
  let stdout = "";
  let stderr = "";
  let forceKillTimer = null;
  const settle = (result) => {
    if (settled) return;
    settled = true;
    resolve(result);
  };
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    forceKillTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 2e3);
  }, options.timeoutMs);
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.on("error", (error) => {
    clearTimeout(timeoutTimer);
    if (forceKillTimer) clearTimeout(forceKillTimer);
    settle({
      success: false,
      exitCode: null,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      durationMs: Date.now() - startedAt,
      timedOut,
      error: error.message,
      spawnErrorCode: error.code
    });
  });
  child.on("close", (exitCode) => {
    clearTimeout(timeoutTimer);
    if (forceKillTimer) clearTimeout(forceKillTimer);
    settle({
      success: !timedOut && exitCode === 0,
      exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      durationMs: Date.now() - startedAt,
      timedOut,
      error: timedOut ? `Command timed out after ${options.timeoutMs}ms` : void 0
    });
  });
});
const cleanupPathSafely = (targetPath) => {
  if (!targetPath) return;
  try {
    fs$4.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: process.platform === "win32" ? 5 : 0,
      retryDelay: process.platform === "win32" ? 200 : 0
    });
  } catch (error) {
    console.warn(
      "[skills] Failed to cleanup temporary directory:",
      targetPath,
      error
    );
  }
};
const listSkillDirs = (root) => {
  if (!fs$4.existsSync(root)) return [];
  const skillFile = path$1.join(root, SKILL_FILE_NAME);
  if (fs$4.existsSync(skillFile)) {
    return [root];
  }
  const entries = fs$4.readdirSync(root);
  return entries.map((entry) => path$1.join(root, entry)).filter((entryPath) => {
    try {
      const stat = fs$4.lstatSync(entryPath);
      if (!stat.isDirectory() && !stat.isSymbolicLink()) {
        return false;
      }
      return fs$4.existsSync(path$1.join(entryPath, SKILL_FILE_NAME));
    } catch {
      return false;
    }
  });
};
const collectSkillDirsFromSource = (source) => {
  const resolved = path$1.resolve(source);
  if (fs$4.existsSync(path$1.join(resolved, SKILL_FILE_NAME))) {
    return [resolved];
  }
  const nestedRoot = path$1.join(resolved, SKILLS_DIR_NAME);
  if (fs$4.existsSync(nestedRoot) && fs$4.statSync(nestedRoot).isDirectory()) {
    const nestedSkills = listSkillDirs(nestedRoot);
    if (nestedSkills.length > 0) {
      return nestedSkills;
    }
  }
  const directSkills = listSkillDirs(resolved);
  if (directSkills.length > 0) {
    return directSkills;
  }
  return collectSkillDirsRecursively(resolved);
};
const collectSkillDirsRecursively = (root) => {
  const resolvedRoot = path$1.resolve(root);
  if (!fs$4.existsSync(resolvedRoot)) return [];
  const matchedDirs = [];
  const queue = [resolvedRoot];
  const seen = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const normalized = path$1.resolve(current);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    let stat;
    try {
      stat = fs$4.lstatSync(normalized);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    if (fs$4.existsSync(path$1.join(normalized, SKILL_FILE_NAME))) {
      matchedDirs.push(normalized);
      continue;
    }
    let entries = [];
    try {
      entries = fs$4.readdirSync(normalized);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry || entry === ".git" || entry === "node_modules") continue;
      queue.push(path$1.join(normalized, entry));
    }
  }
  return matchedDirs;
};
const deriveRepoName = (source) => {
  const cleaned = source.replace(/[#?].*$/, "");
  const base = cleaned.split("/").filter(Boolean).pop() || "skill";
  return normalizeFolderName(base.replace(/\.git$/, ""));
};
const extractErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
const parseGithubRepoSource = (repoUrl) => {
  const trimmed = repoUrl.trim();
  const sshMatch = trimmed.match(
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i
  );
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2]
    };
  }
  try {
    const parsedUrl = new URL(trimmed);
    if (!["github.com", "www.github.com"].includes(
      parsedUrl.hostname.toLowerCase()
    )) {
      return null;
    }
    const segments = parsedUrl.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    return {
      owner: segments[0],
      repo: segments[1]
    };
  } catch {
    return null;
  }
};
const downloadGithubArchive = async (source, tempRoot, ref) => {
  const encodedRef = ref ? encodeURIComponent(ref) : "";
  const archiveUrlCandidates = [];
  if (encodedRef) {
    archiveUrlCandidates.push(
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/refs/heads/${encodedRef}.zip`,
        headers: { "User-Agent": "LobsterAI Skill Downloader" }
      },
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/refs/tags/${encodedRef}.zip`,
        headers: { "User-Agent": "LobsterAI Skill Downloader" }
      },
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/${encodedRef}.zip`,
        headers: { "User-Agent": "LobsterAI Skill Downloader" }
      }
    );
  }
  archiveUrlCandidates.push({
    url: `https://api.github.com/repos/${source.owner}/${source.repo}/zipball${encodedRef ? `/${encodedRef}` : ""}`,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "LobsterAI Skill Downloader",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  let buffer = null;
  let lastError = null;
  for (const candidate of archiveUrlCandidates) {
    try {
      const response = await electron.session.defaultSession.fetch(candidate.url, {
        method: "GET",
        headers: candidate.headers
      });
      if (!response.ok) {
        const detail = (await response.text()).trim();
        lastError = `Archive download failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`;
        continue;
      }
      buffer = Buffer.from(await response.arrayBuffer());
      break;
    } catch (error) {
      lastError = extractErrorMessage(error);
    }
  }
  if (!buffer) {
    throw new Error(lastError || "Archive download failed");
  }
  const zipPath = path$1.join(tempRoot, "github-archive.zip");
  const extractRoot = path$1.join(tempRoot, "github-archive");
  fs$4.writeFileSync(zipPath, buffer);
  fs$4.mkdirSync(extractRoot, { recursive: true });
  await extractZip(zipPath, { dir: extractRoot });
  const extractedDirs = fs$4.readdirSync(extractRoot).map((entry) => path$1.join(extractRoot, entry)).filter((entryPath) => {
    try {
      return fs$4.statSync(entryPath).isDirectory();
    } catch {
      return false;
    }
  });
  if (extractedDirs.length === 1) {
    return extractedDirs[0];
  }
  return extractRoot;
};
const isRemoteZipUrl = (source) => {
  try {
    const url = new URL(source);
    return (url.protocol === "http:" || url.protocol === "https:") && url.pathname.toLowerCase().endsWith(".zip");
  } catch {
    return false;
  }
};
const downloadZipUrl = async (zipUrl, tempRoot) => {
  const response = await electron.session.defaultSession.fetch(zipUrl, {
    method: "GET",
    headers: { "User-Agent": "LobsterAI Skill Downloader" }
  });
  if (!response.ok) {
    throw new Error(
      `Download failed (${response.status} ${response.statusText})`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const zipPath = path$1.join(tempRoot, "remote-skill.zip");
  const extractRoot = path$1.join(tempRoot, "remote-skill");
  fs$4.writeFileSync(zipPath, buffer);
  fs$4.mkdirSync(extractRoot, { recursive: true });
  await extractZip(zipPath, { dir: extractRoot });
  const extractedDirs = fs$4.readdirSync(extractRoot).map((entry) => path$1.join(extractRoot, entry)).filter((entryPath) => {
    try {
      return fs$4.statSync(entryPath).isDirectory();
    } catch {
      return false;
    }
  });
  if (extractedDirs.length === 1) {
    return extractedDirs[0];
  }
  return extractRoot;
};
const normalizeGithubSubpath = (value) => {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return null;
  const segments = trimmed.split("/").filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
};
const parseGithubTreeOrBlobUrl = (source) => {
  try {
    const parsedUrl = new URL(source);
    if (!["github.com", "www.github.com"].includes(parsedUrl.hostname)) {
      return null;
    }
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (segments.length < 5) {
      return null;
    }
    const [owner, repoRaw, mode, ref, ...rest] = segments;
    if (!owner || !repoRaw || !ref || mode !== "tree" && mode !== "blob") {
      return null;
    }
    const repo = repoRaw.replace(/\.git$/i, "");
    const sourceSubpath = normalizeGithubSubpath(rest.join("/"));
    if (!repo || !sourceSubpath) {
      return null;
    }
    return {
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      sourceSubpath,
      ref: decodeURIComponent(ref),
      repoNameHint: repo
    };
  } catch {
    return null;
  }
};
const isWebSearchSkillBroken = (skillRoot) => {
  const startServerScript = path$1.join(skillRoot, "scripts", "start-server.sh");
  const searchScript = path$1.join(skillRoot, "scripts", "search.sh");
  const serverEntry = path$1.join(skillRoot, "dist", "server", "index.js");
  const requiredPaths = [
    startServerScript,
    searchScript,
    serverEntry,
    path$1.join(skillRoot, "node_modules", "iconv-lite", "encodings", "index.js")
  ];
  if (requiredPaths.some((requiredPath) => !fs$4.existsSync(requiredPath))) {
    return true;
  }
  try {
    const startScript = fs$4.readFileSync(startServerScript, "utf-8");
    const searchScriptContent = fs$4.readFileSync(searchScript, "utf-8");
    const serverEntryContent = fs$4.readFileSync(serverEntry, "utf-8");
    if (!startScript.includes("WEB_SEARCH_FORCE_REPAIR")) {
      return true;
    }
    if (!startScript.includes("detect_healthy_bridge_server")) {
      return true;
    }
    if (!searchScriptContent.includes("ACTIVE_SERVER_URL")) {
      return true;
    }
    if (!searchScriptContent.includes("try_switch_to_local_server")) {
      return true;
    }
    if (!searchScriptContent.includes("build_search_payload")) {
      return true;
    }
    if (!searchScriptContent.includes("@query_file")) {
      return true;
    }
    if (!serverEntryContent.includes("decodeJsonRequestBody")) {
      return true;
    }
    if (!serverEntryContent.includes("TextDecoder('gb18030'")) {
      return true;
    }
    if (serverEntryContent.includes("scoreDecodedJsonText") && serverEntryContent.includes("Request body decoded using gb18030 (score")) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
};
class SkillManager {
  constructor(getStore2) {
    __publicField(this, "watchers", []);
    __publicField(this, "notifyTimer", null);
    this.getStore = getStore2;
  }
  getSkillsRoot() {
    return path$1.resolve(electron.app.getPath("userData"), SKILLS_DIR_NAME);
  }
  /**
   * 确保目录存在
   */
  ensureSkillsRoot() {
    const root = this.getSkillsRoot();
    if (!fs$4.existsSync(root)) {
      fs$4.mkdirSync(root, { recursive: true });
    }
    return root;
  }
  /**
   * 同步技能
   */
  syncBundledSkillsToUserData() {
    if (!electron.app.isPackaged) {
      return;
    }
    console.log("[skills] syncBundledSkillsToUserData: start");
    const userRoot = this.ensureSkillsRoot();
    console.log("[skills] syncBundledSkillsToUserData: userRoot =", userRoot);
    const bundledRoot = this.getBundledSkillsRoot();
    console.log(
      "[skills] syncBundledSkillsToUserData: bundledRoot =",
      bundledRoot
    );
    if (!bundledRoot || bundledRoot === userRoot || !fs$4.existsSync(bundledRoot)) {
      console.log(
        "[skills] syncBundledSkillsToUserData: bundledRoot skipped (missing or same as userRoot)"
      );
      return;
    }
    try {
      const bundledSkillDirs = listSkillDirs(bundledRoot);
      console.log(
        "[skills] syncBundledSkillsToUserData: found",
        bundledSkillDirs.length,
        "bundled skills"
      );
      bundledSkillDirs.forEach((dir) => {
        const id = path$1.basename(dir);
        const targetDir = path$1.join(userRoot, id);
        const targetExists = fs$4.existsSync(targetDir);
        let shouldRepair = false;
        let needsCleanCopy = false;
        if (targetExists) {
          const bundledVer = this.getSkillVersion(dir);
          if (bundledVer && compareVersions(
            bundledVer,
            this.getSkillVersion(targetDir) || "0.0.0"
          ) > 0) {
            shouldRepair = true;
            needsCleanCopy = true;
          } else if (id === "web-search" && isWebSearchSkillBroken(targetDir)) {
            shouldRepair = true;
          } else if (!this.isSkillRuntimeHealthy(targetDir, dir)) {
            shouldRepair = true;
          }
        }
        if (targetExists && !shouldRepair) return;
        try {
          console.log(
            `[skills] syncBundledSkillsToUserData: copying "${id}" from ${dir} to ${targetDir}`
          );
          let envBackup = null;
          const envPath = path$1.join(targetDir, ".env");
          if (needsCleanCopy && fs$4.existsSync(envPath)) {
            envBackup = fs$4.readFileSync(envPath);
          }
          if (needsCleanCopy) {
            fs$4.rmSync(targetDir, { recursive: true, force: true });
          }
          cpRecursiveSync(dir, targetDir, {
            dereference: true,
            force: shouldRepair
          });
          if (envBackup !== null) {
            fs$4.writeFileSync(envPath, envBackup);
          }
          console.log(
            `[skills] syncBundledSkillsToUserData: copied "${id}" successfully`
          );
          if (shouldRepair) {
            console.log(`[skills] Repaired bundled skill "${id}" in user data`);
          }
        } catch (error) {
          console.warn(`[skills] Failed to sync bundled skill "${id}":`, error);
        }
      });
      const bundledConfig = path$1.join(bundledRoot, SKILLS_CONFIG_FILE);
      const targetConfig = path$1.join(userRoot, SKILLS_CONFIG_FILE);
      if (fs$4.existsSync(bundledConfig)) {
        if (!fs$4.existsSync(targetConfig)) {
          console.log(
            "[skills] syncBundledSkillsToUserData: copying skills.config.json"
          );
          cpRecursiveSync(bundledConfig, targetConfig);
        } else {
          this.mergeSkillsConfig(bundledConfig, targetConfig);
        }
      }
      console.log("[skills] syncBundledSkillsToUserData: done");
    } catch (error) {
      console.warn("[skills] Failed to sync bundled skills:", error);
    }
  }
  /**
   * Check if a skill's runtime is healthy by comparing with bundled version.
   * Returns false if bundled has dependencies but target doesn't.
   */
  isSkillRuntimeHealthy(targetDir, bundledDir) {
    const bundledNodeModules = path$1.join(bundledDir, "node_modules");
    const targetNodeModules = path$1.join(targetDir, "node_modules");
    const targetPackageJson = path$1.join(targetDir, "package.json");
    if (!fs$4.existsSync(targetPackageJson)) {
      return true;
    }
    if (!fs$4.existsSync(bundledNodeModules)) {
      return true;
    }
    if (!fs$4.existsSync(targetNodeModules)) {
      return false;
    }
    return true;
  }
  getSkillVersion(skillDir) {
    try {
      const raw = fs$4.readFileSync(path$1.join(skillDir, SKILL_FILE_NAME), "utf8");
      const { frontmatter } = parseFrontmatter(raw);
      return typeof frontmatter.version === "string" ? frontmatter.version : typeof frontmatter.version === "number" ? String(frontmatter.version) : "";
    } catch {
      return "";
    }
  }
  mergeSkillsConfig(bundledPath, targetPath) {
    try {
      const bundled = JSON.parse(fs$4.readFileSync(bundledPath, "utf-8"));
      const target = JSON.parse(fs$4.readFileSync(targetPath, "utf-8"));
      if (!bundled.defaults || !target.defaults) return;
      let changed = false;
      for (const [id, config] of Object.entries(bundled.defaults)) {
        if (!(id in target.defaults)) {
          target.defaults[id] = config;
          changed = true;
        }
      }
      if (changed) {
        const tmpPath = targetPath + ".tmp";
        fs$4.writeFileSync(
          tmpPath,
          JSON.stringify(target, null, 2) + "\n",
          "utf-8"
        );
        fs$4.renameSync(tmpPath, targetPath);
        console.log(
          "[skills] mergeSkillsConfig: merged new skill entries into user config"
        );
      }
    } catch (e) {
      console.warn("[skills] Failed to merge skills config:", e);
    }
  }
  /**
   * 获取所有可用技能
   */
  listSkills() {
    const primaryRoot = this.ensureSkillsRoot();
    const state = this.loadSkillStateMap();
    const roots = this.getSkillRoots(primaryRoot);
    const orderedRoots = roots.filter((root) => root !== primaryRoot).concat(primaryRoot);
    const defaults = this.loadSkillsDefaults(roots);
    const builtInSkillIds = this.listBuiltInSkillIds();
    const skillMap = /* @__PURE__ */ new Map();
    orderedRoots.forEach((root) => {
      if (!fs$4.existsSync(root)) return;
      const skillDirs = listSkillDirs(root);
      skillDirs.forEach((dir) => {
        const skill = this.parseSkillDir(
          dir,
          state,
          defaults,
          builtInSkillIds.has(path$1.basename(dir))
        );
        if (!skill) return;
        skillMap.set(skill.id, skill);
      });
    });
    const skills = Array.from(skillMap.values());
    skills.sort((a, b) => {
      var _a, _b;
      const orderA = ((_a = defaults[a.id]) == null ? void 0 : _a.order) ?? 999;
      const orderB = ((_b = defaults[b.id]) == null ? void 0 : _b.order) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
    return skills;
  }
  buildAutoRoutingPrompt() {
    const skills = this.listSkills();
    const enabled = skills.filter((s) => s.enabled && s.prompt);
    if (enabled.length === 0) return null;
    const skillEntries = enabled.map(
      (s) => `  <skill><id>${s.id}</id><name>${s.name}</name><description>${s.description}</description><location>${s.skillPath}</location></skill>`
    ).join("\n");
    return [
      "## Skills (mandatory)",
      "Before replying: scan <available_skills> <description> entries.",
      "- If exactly one skill clearly applies: read its SKILL.md at <location> with the Read tool, then follow it.",
      "- If multiple could apply: choose the most specific one, then read/follow it.",
      "- If none clearly apply: do not read any SKILL.md.",
      `- IMPORTANT: If a description contains "Do NOT use" constraints, strictly respect them. If the user's request falls into a "Do NOT" category, treat that skill as non-matching — do NOT read its SKILL.md.`,
      "- For the selected skill, treat <location> as the canonical SKILL.md path.",
      "- Resolve relative paths mentioned by that SKILL.md against its directory (dirname(<location>)), not the workspace root.",
      "Constraints: never read more than one skill up front; only read additional skills if the first one explicitly references them.",
      "",
      "<available_skills>",
      skillEntries,
      "</available_skills>"
    ].join("\n");
  }
  setSkillEnabled(id, enabled) {
    const state = this.loadSkillStateMap();
    state[id] = { enabled };
    this.saveSkillStateMap(state);
    this.notifySkillsChanged();
    return this.listSkills();
  }
  deleteSkill(id) {
    const root = this.ensureSkillsRoot();
    if (id !== path$1.basename(id)) {
      throw new Error("Invalid skill id");
    }
    if (this.isBuiltInSkillId(id)) {
      throw new Error("Built-in skills cannot be deleted");
    }
    const targetDir = resolveWithin(root, id);
    if (!fs$4.existsSync(targetDir)) {
      throw new Error("Skill not found");
    }
    fs$4.rmSync(targetDir, { recursive: true, force: true });
    const state = this.loadSkillStateMap();
    delete state[id];
    this.saveSkillStateMap(state);
    this.startWatching();
    this.notifySkillsChanged();
    return this.listSkills();
  }
  async downloadSkill(source) {
    let cleanupPath = null;
    try {
      const trimmed = source.trim();
      if (!trimmed) {
        return { success: false, error: "Missing skill source" };
      }
      const root = this.ensureSkillsRoot();
      let localSource = trimmed;
      if (fs$4.existsSync(localSource)) {
        const stat = fs$4.statSync(localSource);
        if (stat.isFile()) {
          if (isZipFile(localSource)) {
            const tempRoot = fs$4.mkdtempSync(
              path$1.join(electron.app.getPath("temp"), "lobsterai-skill-zip-")
            );
            await extractZip(localSource, { dir: tempRoot });
            localSource = tempRoot;
            cleanupPath = tempRoot;
          } else if (path$1.basename(localSource) === SKILL_FILE_NAME) {
            localSource = path$1.dirname(localSource);
          } else {
            return {
              success: false,
              error: "Skill source must be a directory, zip file, or SKILL.md file"
            };
          }
        }
      } else if (isRemoteZipUrl(trimmed)) {
        const tempRoot = fs$4.mkdtempSync(
          path$1.join(electron.app.getPath("temp"), "lobsterai-skill-zip-")
        );
        cleanupPath = tempRoot;
        localSource = await downloadZipUrl(trimmed, tempRoot);
      } else {
        const normalized = this.normalizeGitSource(trimmed);
        if (!normalized) {
          return {
            success: false,
            error: "Invalid skill source. Use owner/repo, repo URL, or a GitHub tree/blob URL."
          };
        }
        const tempRoot = fs$4.mkdtempSync(
          path$1.join(electron.app.getPath("temp"), "lobsterai-skill-")
        );
        cleanupPath = tempRoot;
        const repoName = normalizeFolderName(
          normalized.repoNameHint || deriveRepoName(normalized.repoUrl)
        );
        const clonePath = path$1.join(tempRoot, repoName);
        const cloneArgs = ["clone", "--depth", "1"];
        if (normalized.ref) {
          cloneArgs.push("--branch", normalized.ref);
        }
        cloneArgs.push(normalized.repoUrl, clonePath);
        const gitRuntime = resolveGitCommand();
        const githubSource = parseGithubRepoSource(normalized.repoUrl);
        let downloadedSourceRoot = clonePath;
        try {
          await runCommand(gitRuntime.command, cloneArgs, {
            env: gitRuntime.env
          });
        } catch (error) {
          const errno = error == null ? void 0 : error.code;
          if (githubSource) {
            try {
              downloadedSourceRoot = await downloadGithubArchive(
                githubSource,
                tempRoot,
                normalized.ref
              );
            } catch (archiveError) {
              const gitMessage = extractErrorMessage(error);
              const archiveMessage = extractErrorMessage(archiveError);
              if (errno === "ENOENT" && process.platform === "win32") {
                throw new Error(
                  `Git executable not found. Please install Git for Windows or reinstall LobsterAI with bundled PortableGit. Archive fallback also failed: ${archiveMessage}`
                );
              }
              throw new Error(
                `Git clone failed: ${gitMessage}. Archive fallback failed: ${archiveMessage}`
              );
            }
          } else if (errno === "ENOENT" && process.platform === "win32") {
            throw new Error(
              "Git executable not found. Please install Git for Windows or reinstall LobsterAI with bundled PortableGit."
            );
          } else {
            throw error;
          }
        }
        if (normalized.sourceSubpath) {
          const scopedSource = resolveWithin(
            downloadedSourceRoot,
            normalized.sourceSubpath
          );
          if (!fs$4.existsSync(scopedSource)) {
            return {
              success: false,
              error: `Path "${normalized.sourceSubpath}" not found in repository`
            };
          }
          const scopedStat = fs$4.statSync(scopedSource);
          if (scopedStat.isFile()) {
            if (path$1.basename(scopedSource) === SKILL_FILE_NAME) {
              localSource = path$1.dirname(scopedSource);
            } else {
              return {
                success: false,
                error: "GitHub path must point to a directory or SKILL.md file"
              };
            }
          } else {
            localSource = scopedSource;
          }
        } else {
          localSource = downloadedSourceRoot;
        }
      }
      const skillDirs = collectSkillDirsFromSource(localSource);
      if (skillDirs.length === 0) {
        cleanupPathSafely(cleanupPath);
        cleanupPath = null;
        return { success: false, error: "No SKILL.md found in source" };
      }
      for (const skillDir of skillDirs) {
        const folderName = normalizeFolderName(path$1.basename(skillDir));
        let targetDir = resolveWithin(root, folderName);
        let suffix = 1;
        while (fs$4.existsSync(targetDir)) {
          targetDir = resolveWithin(root, `${folderName}-${suffix}`);
          suffix += 1;
        }
        cpRecursiveSync(skillDir, targetDir);
      }
      cleanupPathSafely(cleanupPath);
      cleanupPath = null;
      this.startWatching();
      this.notifySkillsChanged();
      return { success: true, skills: this.listSkills() };
    } catch (error) {
      cleanupPathSafely(cleanupPath);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to download skill"
      };
    }
  }
  startWatching() {
    this.stopWatching();
    const primaryRoot = this.ensureSkillsRoot();
    const roots = this.getSkillRoots(primaryRoot);
    const watchHandler = () => this.scheduleNotify();
    roots.forEach((root) => {
      if (!fs$4.existsSync(root)) return;
      try {
        this.watchers.push(fs$4.watch(root, watchHandler));
      } catch (error) {
        console.warn("[skills] Failed to watch skills root:", root, error);
      }
      const skillDirs = listSkillDirs(root);
      skillDirs.forEach((dir) => {
        try {
          this.watchers.push(fs$4.watch(dir, watchHandler));
        } catch (error) {
          console.warn("[skills] Failed to watch skill directory:", dir, error);
        }
      });
    });
  }
  stopWatching() {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
    }
  }
  handleWorkingDirectoryChange() {
    this.startWatching();
    this.notifySkillsChanged();
  }
  scheduleNotify() {
    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
    }
    this.notifyTimer = setTimeout(() => {
      this.startWatching();
      this.notifySkillsChanged();
    }, WATCH_DEBOUNCE_MS);
  }
  notifySkillsChanged() {
    electron.BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skills:changed");
      }
    });
  }
  parseSkillDir(dir, state, defaults, isBuiltIn) {
    var _a, _b;
    const skillFile = path$1.join(dir, SKILL_FILE_NAME);
    if (!fs$4.existsSync(skillFile)) return null;
    try {
      const raw = fs$4.readFileSync(skillFile, "utf8");
      const { frontmatter, content } = parseFrontmatter(raw);
      const name = (String(frontmatter.name || "") || path$1.basename(dir)).trim() || path$1.basename(dir);
      const description = (String(frontmatter.description || "") || extractDescription(content) || name).trim();
      const isOfficial = isTruthy(frontmatter.official) || isTruthy(frontmatter.isOfficial);
      const version = typeof frontmatter.version === "string" ? frontmatter.version : typeof frontmatter.version === "number" ? String(frontmatter.version) : void 0;
      const updatedAt = fs$4.statSync(skillFile).mtimeMs;
      const id = path$1.basename(dir);
      const prompt = content.trim();
      const defaultEnabled = ((_a = defaults[id]) == null ? void 0 : _a.enabled) ?? true;
      const enabled = ((_b = state[id]) == null ? void 0 : _b.enabled) ?? defaultEnabled;
      return {
        id,
        name,
        description,
        enabled,
        isOfficial,
        isBuiltIn,
        updatedAt,
        prompt,
        skillPath: skillFile,
        version
      };
    } catch (error) {
      console.warn("[skills] Failed to parse skill:", dir, error);
      return null;
    }
  }
  listBuiltInSkillIds() {
    const builtInRoot = this.getBundledSkillsRoot();
    if (!builtInRoot || !fs$4.existsSync(builtInRoot)) {
      return /* @__PURE__ */ new Set();
    }
    return new Set(listSkillDirs(builtInRoot).map((dir) => path$1.basename(dir)));
  }
  isBuiltInSkillId(id) {
    return this.listBuiltInSkillIds().has(id);
  }
  /**
   * 加载技能状态
   */
  loadSkillStateMap() {
    const store2 = this.getStore();
    const raw = store2.get(SKILL_STATE_KEY);
    if (Array.isArray(raw)) {
      const migrated = {};
      raw.forEach((skill) => {
        migrated[skill.id] = { enabled: skill.enabled };
      });
      store2.set(SKILL_STATE_KEY, migrated);
      return migrated;
    }
    return raw ?? {};
  }
  saveSkillStateMap(map2) {
    this.getStore().set(SKILL_STATE_KEY, map2);
  }
  loadSkillsDefaults(roots) {
    const merged = {};
    const reversedRoots = [...roots].reverse();
    for (const root of reversedRoots) {
      const configPath = path$1.join(root, SKILLS_CONFIG_FILE);
      if (!fs$4.existsSync(configPath)) continue;
      try {
        const raw = fs$4.readFileSync(configPath, "utf8");
        const config = JSON.parse(raw);
        if (config.defaults && typeof config.defaults === "object") {
          for (const [id, settings] of Object.entries(config.defaults)) {
            merged[id] = { ...merged[id], ...settings };
          }
        }
      } catch (error) {
        console.warn(
          "[skills] Failed to load skills config:",
          configPath,
          error
        );
      }
    }
    return merged;
  }
  getSkillRoots(primaryRoot) {
    const resolvedPrimary = primaryRoot ?? this.getSkillsRoot();
    const roots = [resolvedPrimary];
    const claudeSkillsRoot = this.getClaudeSkillsRoot();
    if (claudeSkillsRoot && fs$4.existsSync(claudeSkillsRoot)) {
      roots.push(claudeSkillsRoot);
    }
    const appRoot = this.getBundledSkillsRoot();
    if (appRoot !== resolvedPrimary && fs$4.existsSync(appRoot)) {
      roots.push(appRoot);
    }
    return roots;
  }
  getClaudeSkillsRoot() {
    const homeDir = electron.app.getPath("home");
    return path$1.join(homeDir, CLAUDE_SKILLS_DIR_NAME, CLAUDE_SKILLS_SUBDIR);
  }
  getBundledSkillsRoot() {
    if (electron.app.isPackaged) {
      const resourcesRoot = path$1.resolve(
        process.resourcesPath,
        SKILLS_DIR_NAME
      );
      if (fs$4.existsSync(resourcesRoot)) {
        return resourcesRoot;
      }
      return path$1.resolve(electron.app.getAppPath(), SKILLS_DIR_NAME);
    }
    const projectRoot = path$1.resolve(__dirname, "..");
    return path$1.resolve(projectRoot, SKILLS_DIR_NAME);
  }
  getSkillConfig(skillId) {
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const envPath = path$1.join(skillDir, ".env");
      if (!fs$4.existsSync(envPath)) {
        return { success: true, config: {} };
      }
      const raw = fs$4.readFileSync(envPath, "utf8");
      const config = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        config[key] = value;
      }
      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read skill config"
      };
    }
  }
  setSkillConfig(skillId, config) {
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const envPath = path$1.join(skillDir, ".env");
      const lines = Object.entries(config).filter(([key]) => key.trim()).map(([key, value]) => `${key}=${value}`);
      fs$4.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to write skill config"
      };
    }
  }
  repairSkillFromBundled(skillId, skillPath) {
    if (!electron.app.isPackaged) return false;
    const bundledRoot = this.getBundledSkillsRoot();
    if (!bundledRoot || !fs$4.existsSync(bundledRoot)) {
      return false;
    }
    const bundledPath = path$1.join(bundledRoot, skillId);
    if (!fs$4.existsSync(bundledPath) || bundledPath === skillPath) {
      return false;
    }
    const bundledNodeModules = path$1.join(bundledPath, "node_modules");
    if (!fs$4.existsSync(bundledNodeModules)) {
      console.log(
        `[skills] Bundled ${skillId} does not have node_modules, skipping repair`
      );
      return false;
    }
    try {
      console.log(`[skills] Repairing ${skillId} from bundled resources...`);
      fs$4.cpSync(bundledPath, skillPath, {
        recursive: true,
        dereference: true,
        force: true,
        errorOnExist: false
      });
      console.log(`[skills] Repaired ${skillId} from bundled resources`);
      return true;
    } catch (error) {
      console.warn(
        `[skills] Failed to repair ${skillId} from bundled resources:`,
        error
      );
      return false;
    }
  }
  ensureSkillDependencies(skillDir) {
    var _a;
    const nodeModulesPath = path$1.join(skillDir, "node_modules");
    const packageJsonPath = path$1.join(skillDir, "package.json");
    const skillId = path$1.basename(skillDir);
    console.log(`[skills] Checking dependencies for ${skillId}...`);
    console.log(
      `[skills]   node_modules exists: ${fs$4.existsSync(nodeModulesPath)}`
    );
    console.log(
      `[skills]   package.json exists: ${fs$4.existsSync(packageJsonPath)}`
    );
    console.log(`[skills]   skillDir: ${skillDir}`);
    if (fs$4.existsSync(nodeModulesPath)) {
      console.log(`[skills] Dependencies already installed for ${skillId}`);
      return { success: true };
    }
    if (!fs$4.existsSync(packageJsonPath)) {
      console.log(
        `[skills] No package.json found for ${skillId}, skipping install`
      );
      return { success: true };
    }
    if (this.repairSkillFromBundled(skillId, skillDir)) {
      if (fs$4.existsSync(nodeModulesPath)) {
        console.log(
          `[skills] Dependencies restored from bundled resources for ${skillId}`
        );
        return { success: true };
      }
    }
    const env = buildSkillEnv();
    const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === "path");
    console.log(`[skills]   PATH keys in env: ${JSON.stringify(pathKeys)}`);
    console.log(
      `[skills]   PATH (first 300 chars): ${(_a = env.PATH) == null ? void 0 : _a.substring(0, 300)}`
    );
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    if (!hasCommand(npmCommand, env) && !hasCommand("npm", env)) {
      const errorMsg = "npm is not available and skill cannot be repaired from bundled resources. Please install Node.js from https://nodejs.org/";
      console.error(`[skills] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
    console.log(`[skills] npm is available`);
    console.log(`[skills] Installing dependencies for ${skillId}...`);
    console.log(`[skills]   Working directory: ${skillDir}`);
    try {
      const isWin = process.platform === "win32";
      const result = child_process.spawnSync("npm", ["install"], {
        cwd: skillDir,
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 12e4,
        // 2 minute timeout
        env,
        shell: isWin
      });
      console.log(`[skills] npm install exit code: ${result.status}`);
      if (result.stdout) {
        console.log(
          `[skills] npm install stdout: ${result.stdout.substring(0, 500)}`
        );
      }
      if (result.stderr) {
        console.log(
          `[skills] npm install stderr: ${result.stderr.substring(0, 500)}`
        );
      }
      if (result.status !== 0) {
        const errorMsg = result.stderr || result.stdout || "npm install failed";
        console.error(
          `[skills] Failed to install dependencies for ${skillId}:`,
          errorMsg
        );
        return {
          success: false,
          error: `Failed to install dependencies: ${errorMsg}`
        };
      }
      if (!fs$4.existsSync(nodeModulesPath)) {
        const errorMsg = "npm install appeared to succeed but node_modules was not created";
        console.error(`[skills] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
      console.log(
        `[skills] Dependencies installed successfully for ${skillId}`
      );
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[skills] Error installing dependencies for ${skillId}:`,
        errorMsg
      );
      return {
        success: false,
        error: `Failed to install dependencies: ${errorMsg}`
      };
    }
  }
  async testEmailConnectivity(skillId, config) {
    var _a, _b, _c, _d;
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const depsResult = this.ensureSkillDependencies(skillDir);
      if (!depsResult.success) {
        console.error(
          "[email-connectivity] Dependency install failed:",
          depsResult.error
        );
        return { success: false, error: depsResult.error };
      }
      const imapScript = path$1.join(skillDir, "scripts", "imap.js");
      const smtpScript = path$1.join(skillDir, "scripts", "smtp.js");
      if (!fs$4.existsSync(imapScript) || !fs$4.existsSync(smtpScript)) {
        console.error("[email-connectivity] Scripts not found:", {
          imapScript,
          smtpScript
        });
        return {
          success: false,
          error: "Email connectivity scripts not found"
        };
      }
      const safeConfig = { ...config };
      if (safeConfig.IMAP_PASS) safeConfig.IMAP_PASS = "***";
      if (safeConfig.SMTP_PASS) safeConfig.SMTP_PASS = "***";
      console.log(
        "[email-connectivity] Testing with config:",
        JSON.stringify(safeConfig, null, 2)
      );
      const envOverrides = Object.fromEntries(
        Object.entries(config ?? {}).filter(([key]) => key.trim()).map(([key, value]) => [key, String(value ?? "")])
      );
      console.log("[email-connectivity] Running IMAP test (list-mailboxes)...");
      const imapResult = await this.runSkillScriptWithEnv(
        skillDir,
        imapScript,
        ["list-mailboxes"],
        envOverrides,
        2e4
      );
      console.log(
        "[email-connectivity] IMAP result:",
        JSON.stringify(
          {
            success: imapResult.success,
            exitCode: imapResult.exitCode,
            timedOut: imapResult.timedOut,
            durationMs: imapResult.durationMs,
            stdout: (_a = imapResult.stdout) == null ? void 0 : _a.slice(0, 500),
            stderr: (_b = imapResult.stderr) == null ? void 0 : _b.slice(0, 500),
            error: imapResult.error,
            spawnErrorCode: imapResult.spawnErrorCode
          },
          null,
          2
        )
      );
      console.log("[email-connectivity] Running SMTP test (verify)...");
      const smtpResult = await this.runSkillScriptWithEnv(
        skillDir,
        smtpScript,
        ["verify"],
        envOverrides,
        2e4
      );
      console.log(
        "[email-connectivity] SMTP result:",
        JSON.stringify(
          {
            success: smtpResult.success,
            exitCode: smtpResult.exitCode,
            timedOut: smtpResult.timedOut,
            durationMs: smtpResult.durationMs,
            stdout: (_c = smtpResult.stdout) == null ? void 0 : _c.slice(0, 500),
            stderr: (_d = smtpResult.stderr) == null ? void 0 : _d.slice(0, 500),
            error: smtpResult.error,
            spawnErrorCode: smtpResult.spawnErrorCode
          },
          null,
          2
        )
      );
      const checks = [
        this.buildEmailConnectivityCheck("imap_connection", imapResult),
        this.buildEmailConnectivityCheck("smtp_connection", smtpResult)
      ];
      const verdict = checks.every(
        (check) => check.level === "pass"
      ) ? "pass" : "fail";
      console.log(
        "[email-connectivity] Final verdict:",
        verdict,
        "checks:",
        JSON.stringify(checks, null, 2)
      );
      return {
        success: true,
        result: {
          testedAt: Date.now(),
          verdict,
          checks
        }
      };
    } catch (error) {
      console.error("[email-connectivity] Unexpected error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test email connectivity"
      };
    }
  }
  resolveSkillDir(skillId) {
    const skills = this.listSkills();
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }
    return path$1.dirname(skill.skillPath);
  }
  getScriptRuntimeCandidates() {
    const candidates = [];
    if (!electron.app.isPackaged) {
      candidates.push({ command: "node" });
    }
    candidates.push({
      command: process.execPath,
      extraEnv: { ELECTRON_RUN_AS_NODE: "1" }
    });
    return candidates;
  }
  async runSkillScriptWithEnv(skillDir, scriptPath, scriptArgs, envOverrides, timeoutMs) {
    let lastResult = null;
    const baseEnv = buildSkillEnv();
    for (const runtime of this.getScriptRuntimeCandidates()) {
      const env = {
        ...baseEnv,
        ...runtime.extraEnv,
        ...envOverrides
      };
      const result = await runScriptWithTimeout({
        command: runtime.command,
        args: [scriptPath, ...scriptArgs],
        cwd: skillDir,
        env,
        timeoutMs
      });
      lastResult = result;
      if (result.spawnErrorCode === "ENOENT") {
        continue;
      }
      return result;
    }
    return lastResult ?? {
      success: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      timedOut: false,
      error: "Failed to run skill script"
    };
  }
  parseScriptMessage(stdout) {
    if (!stdout) {
      return null;
    }
    try {
      const parsed = JSON.parse(stdout);
      if (parsed && typeof parsed === "object" && typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
  getLastOutputLine(text) {
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-1)[0] || "";
  }
  buildEmailConnectivityCheck(code, result) {
    const label = code === "imap_connection" ? "IMAP" : "SMTP";
    if (result.success) {
      const parsedMessage = this.parseScriptMessage(result.stdout);
      return {
        code,
        level: "pass",
        message: parsedMessage || `${label} connection successful`,
        durationMs: result.durationMs
      };
    }
    const message = result.timedOut ? `${label} connectivity check timed out` : result.error || this.getLastOutputLine(result.stderr) || this.getLastOutputLine(result.stdout) || `${label} connection failed`;
    return {
      code,
      level: "fail",
      message,
      durationMs: result.durationMs
    };
  }
  normalizeGitSource(source) {
    const githubTreeOrBlob = parseGithubTreeOrBlobUrl(source);
    if (githubTreeOrBlob) {
      return githubTreeOrBlob;
    }
    if (/^[\w.-]+\/[\w.-]+$/.test(source)) {
      return {
        repoUrl: `https://github.com/${source}.git`
      };
    }
    if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("git@")) {
      return {
        repoUrl: source
      };
    }
    if (source.endsWith(".git")) {
      return {
        repoUrl: source
      };
    }
    return null;
  }
}
const USER_MEMORIES_MIGRATION_KEY = "userMemories.migration.v1.completed";
function loadWasmBinary() {
  const wasmPath = electron.app.isPackaged ? path$1.join(process.resourcesPath, "app.asar.unpacked/node_modules/sql.js/dist/sql-wasm.wasm") : path$1.join(electron.app.getAppPath(), "node_modules/sql.js/dist/sql-wasm.wasm");
  const buf = fs$4.readFileSync(wasmPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
const _SqliteStore = class _SqliteStore {
  constructor(db, dbPath) {
    // sql.js 的内存数据库句柄。所有 SQL 操作都在该实例上执行。
    __publicField(this, "db");
    // sqlite 文件持久化路径（通常位于 userData 目录）。
    __publicField(this, "dbPath");
    // 仅用于 set/delete 后派发 change 事件。
    __publicField(this, "emitter", new require$$4());
    this.db = db;
    this.dbPath = dbPath;
  }
  /**
   * 工厂方法：创建并初始化 SqliteStore。
   *
   * 步骤：
   * 1. 计算数据库路径。
   * 2. 初始化 sql.js（首次调用才会加载 wasm）。
   * 3. 读取已存在的 sqlite 文件，或创建空库。
   * 4. 建表并执行迁移。
   */
  static async create(userDataPath) {
    const basePath = userDataPath ?? electron.app.getPath("userData");
    const dbPath = path$1.join(basePath, DB_FILENAME);
    if (!_SqliteStore.sqlPromise) {
      const wasmBinary = loadWasmBinary();
      _SqliteStore.sqlPromise = initSqlJs({
        wasmBinary
      });
    }
    const SQL = await _SqliteStore.sqlPromise;
    let db;
    if (fs$4.existsSync(dbPath)) {
      const buffer = fs$4.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    const store2 = new _SqliteStore(db, dbPath);
    store2.initializeTables(basePath);
    return store2;
  }
  /**
   * 初始化所有业务表并执行历史迁移。
   *
   * 迁移策略：
   * - 先 CREATE TABLE IF NOT EXISTS，保证冷启动可用。
   * - 对列级变更通过 PRAGMA table_info 检查后再 ALTER。
   * - 迁移失败尽量降级处理，避免阻塞启动。
   */
  initializeTables(basePath) {
    var _a, _b;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        claude_session_id TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        pinned INTEGER NOT NULL DEFAULT 0,
        cwd TEXT NOT NULL,
        system_prompt TEXT NOT NULL DEFAULT '',
        execution_mode TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        sequence INTEGER,
        FOREIGN KEY (session_id) REFERENCES cowork_sessions(id) ON DELETE CASCADE
      );
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cowork_messages_session_id ON cowork_messages(session_id);
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.75,
        is_explicit INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'created',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_memory_sources (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        session_id TEXT,
        message_id TEXT,
        role TEXT NOT NULL DEFAULT 'system',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES user_memories(id) ON DELETE CASCADE
      );
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_status_updated_at
      ON user_memories(status, updated_at DESC);
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_fingerprint
      ON user_memories(fingerprint);
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memory_sources_session_id
      ON user_memory_sources(session_id, is_active);
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memory_sources_memory_id
      ON user_memory_sources(memory_id, is_active);
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        schedule_json TEXT NOT NULL,
        prompt TEXT NOT NULL,
        working_directory TEXT NOT NULL DEFAULT '',
        system_prompt TEXT NOT NULL DEFAULT '',
        execution_mode TEXT NOT NULL DEFAULT 'auto',
        expires_at TEXT,
        notify_platforms_json TEXT NOT NULL DEFAULT '[]',
        next_run_at_ms INTEGER,
        last_run_at_ms INTEGER,
        last_status TEXT,
        last_error TEXT,
        last_duration_ms INTEGER,
        running_at_ms INTEGER,
        consecutive_errors INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
        ON scheduled_tasks(enabled, next_run_at_ms);
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_task_runs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        session_id TEXT,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        duration_ms INTEGER,
        error TEXT,
        trigger_type TEXT NOT NULL DEFAULT 'scheduled',
        FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
      );
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_task_runs_task_id
        ON scheduled_task_runs(task_id, started_at DESC);
    `);
    try {
      const colsResult = this.db.exec("PRAGMA table_info(cowork_sessions);");
      const columns = ((_a = colsResult[0]) == null ? void 0 : _a.values.map((row) => row[1])) || [];
      if (!columns.includes("execution_mode")) {
        this.db.run("ALTER TABLE cowork_sessions ADD COLUMN execution_mode TEXT;");
        this.save();
      }
      if (!columns.includes("pinned")) {
        this.db.run("ALTER TABLE cowork_sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;");
        this.save();
      }
      if (!columns.includes("active_skill_ids")) {
        this.db.run("ALTER TABLE cowork_sessions ADD COLUMN active_skill_ids TEXT;");
        this.save();
      }
      const msgColsResult = this.db.exec("PRAGMA table_info(cowork_messages);");
      const msgColumns = ((_b = msgColsResult[0]) == null ? void 0 : _b.values.map((row) => row[1])) || [];
      if (!msgColumns.includes("sequence")) {
        this.db.run("ALTER TABLE cowork_messages ADD COLUMN sequence INTEGER");
        this.db.run(`
          WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY session_id
              ORDER BY created_at ASC, ROWID ASC
            ) as seq
            FROM cowork_messages
          )
          UPDATE cowork_messages
          SET sequence = (SELECT seq FROM numbered WHERE numbered.id = cowork_messages.id)
        `);
        this.save();
      }
    } catch {
    }
    try {
      this.db.run("UPDATE cowork_sessions SET pinned = 0 WHERE pinned IS NULL;");
    } catch {
    }
    try {
      this.db.run(
        `UPDATE cowork_sessions SET execution_mode = 'sandbox' WHERE execution_mode = 'container';`
      );
      this.db.run(`
        UPDATE cowork_config
        SET value = 'sandbox'
        WHERE key = 'executionMode' AND value = 'container';
      `);
    } catch (error) {
      console.warn("Failed to migrate cowork execution mode:", error);
    }
    try {
      const stColsResult = this.db.exec("PRAGMA table_info(scheduled_tasks);");
      if (stColsResult[0]) {
        const stColumns = stColsResult[0].values.map((row) => row[1]) || [];
        if (!stColumns.includes("expires_at")) {
          this.db.run("ALTER TABLE scheduled_tasks ADD COLUMN expires_at TEXT");
          this.save();
        }
        if (!stColumns.includes("notify_platforms_json")) {
          this.db.run(
            "ALTER TABLE scheduled_tasks ADD COLUMN notify_platforms_json TEXT NOT NULL DEFAULT '[]'"
          );
          this.save();
        }
      }
    } catch {
    }
    this.migrateLegacyMemoryFileToUserMemories();
    this.migrateFromElectronStore(basePath);
    this.save();
  }
  /**
   * 将旧版 MEMORY.md 的列表项迁移到 user_memories / user_memory_sources。
   * 使用 kv 标记保证该迁移只执行一次。
   */
  migrateLegacyMemoryFileToUserMemories() {
    var _a, _b, _c;
    if (this.get(USER_MEMORIES_MIGRATION_KEY) === "1") {
      return;
    }
    const content = this.tryReadLegacyMemoryText();
    if (!content.trim()) {
      this.set(USER_MEMORIES_MIGRATION_KEY, "1");
      return;
    }
    const entries = this.parseLegacyMemoryEntries(content);
    if (entries.length === 0) {
      this.set(USER_MEMORIES_MIGRATION_KEY, "1");
      return;
    }
    const now = Date.now();
    this.db.run("BEGIN TRANSACTION;");
    try {
      for (const text of entries) {
        const fingerprint = this.memoryFingerprint(text);
        const existing = this.db.exec(
          `SELECT id FROM user_memories WHERE fingerprint = ? AND status != 'deleted' LIMIT 1`,
          [fingerprint]
        );
        if ((_c = (_b = (_a = existing[0]) == null ? void 0 : _a.values) == null ? void 0 : _b[0]) == null ? void 0 : _c[0]) {
          continue;
        }
        const memoryId = crypto.randomUUID();
        this.db.run(
          `
          INSERT INTO user_memories (
            id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
          ) VALUES (?, ?, ?, ?, 1, 'created', ?, ?, NULL)
        `,
          [memoryId, text, fingerprint, 0.9, now, now]
        );
        this.db.run(
          `
          INSERT INTO user_memory_sources (id, memory_id, session_id, message_id, role, is_active, created_at)
          VALUES (?, ?, NULL, NULL, 'system', 1, ?)
        `,
          [crypto.randomUUID(), memoryId, now]
        );
      }
      this.db.run("COMMIT;");
    } catch (error) {
      this.db.run("ROLLBACK;");
      console.warn("Failed to migrate legacy MEMORY.md entries:", error);
    }
    this.set(USER_MEMORIES_MIGRATION_KEY, "1");
  }
  /**
   * 生成记忆文本指纹，用于迁移与去重。
   *
   * 处理步骤：
   * 1. 转小写，降低大小写差异带来的重复。
   * 2. 将标点/符号归一为空格，仅保留字母、数字和空白。
   * 3. 合并连续空白并 trim，减少格式噪声影响。
   * 4. 对规范化结果计算 SHA-1，得到稳定短指纹。
   *
   * 这里使用 SHA-1 不是用于安全场景，只用于内容相等性近似去重。
   */
  memoryFingerprint(text) {
    const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    return crypto.createHash("sha1").update(normalized).digest("hex");
  }
  /**
   * 将旧版 electron-store(config.json) 迁移到 kv 表。
   * 仅在 kv 当前为空时执行，避免覆盖已存在的新版本数据。
   */
  migrateFromElectronStore(userDataPath) {
    var _a, _b;
    const result = this.db.exec("SELECT COUNT(*) as count FROM kv");
    const count = (_b = (_a = result[0]) == null ? void 0 : _a.values[0]) == null ? void 0 : _b[0];
    if (count > 0) return;
    const legacyPath = path$1.join(userDataPath, "config.json");
    if (!fs$4.existsSync(legacyPath)) return;
    try {
      const raw = fs$4.readFileSync(legacyPath, "utf8");
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;
      const entries = Object.entries(data);
      if (!entries.length) return;
      const now = Date.now();
      this.db.run("BEGIN TRANSACTION;");
      try {
        entries.forEach(([key, value]) => {
          this.db.run(
            `
            INSERT INTO kv (key, value, updated_at)
            VALUES (?, ?, ?)
          `,
            [key, JSON.stringify(value), now]
          );
        });
        this.db.run("COMMIT;");
        this.save();
        console.info(`Migrated ${entries.length} entries from electron-store.`);
      } catch (error) {
        this.db.run("ROLLBACK;");
        throw error;
      }
    } catch (error) {
      console.warn("Failed to migrate electron-store data:", error);
    }
  }
  /**
   * 尝试读取旧版 MEMORY.md 内容。
   * 按候选路径顺序查找，命中后立即返回。
   */
  tryReadLegacyMemoryText() {
    const candidates = [
      path$1.join(process.cwd(), "MEMORY.md"),
      path$1.join(electron.app.getAppPath(), "MEMORY.md"),
      path$1.join(process.cwd(), "memory.md"),
      path$1.join(electron.app.getAppPath(), "memory.md")
    ];
    for (const candidate of candidates) {
      try {
        if (fs$4.existsSync(candidate) && fs$4.statSync(candidate).isFile()) {
          return fs$4.readFileSync(candidate, "utf8");
        }
      } catch {
      }
    }
    return "";
  }
  /**
   * 从旧版 MEMORY.md 文本中提取可迁移条目。
   *
   * 处理规则：
   * 1. 去掉代码块内容。
   * 2. 仅提取 markdown 列表项。
   * 3. 过滤空值、极短值、(empty) 伪值。
   * 4. 忽略重复项，并限制最大条目数。
   */
  parseLegacyMemoryEntries(raw) {
    const normalized = raw.replace(/```[\s\S]*?```/g, " ");
    const lines = normalized.split(/\r?\n/);
    const entries = [];
    const seen = /* @__PURE__ */ new Set();
    for (const line of lines) {
      const match = line.trim().match(/^-+\s*(?:\[[^\]]+\]\s*)?(.+)$/);
      if (!(match == null ? void 0 : match[1])) continue;
      const text = match[1].replace(/\s+/g, " ").trim();
      if (!text || text.length < 6) continue;
      if (/^\(empty\)$/i.test(text)) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(text.length > 360 ? `${text.slice(0, 359)}...` : text);
    }
    return entries.slice(0, 200);
  }
  /**
   * 将 sql.js 内存数据库导出并写回磁盘文件。
   * 当前为整库覆盖写入模式，简单稳定但在大库下写放大更明显。
   */
  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs$4.writeFileSync(this.dbPath, buffer);
  }
  /**
   * 从 kv 表读取并反序列化指定 key 的值。
   * 如果值不存在或 JSON 解析失败，返回 undefined。
   */
  get(key) {
    var _a;
    const result = this.db.exec("SELECT value FROM kv WHERE key = ?", [key]);
    if (!((_a = result[0]) == null ? void 0 : _a.values[0])) return void 0;
    const value = result[0].values[0][0];
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`Failed to parse store value for ${key}`, error);
      return void 0;
    }
  }
  /**
   * 写入 kv 值（UPSERT）。
   * 写入后立即落盘，并派发 change 事件（包含 old/new 值）。
   */
  set(key, value) {
    const oldValue = this.get(key);
    const now = Date.now();
    this.db.run(
      `
      INSERT INTO kv (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
      [key, JSON.stringify(value), now]
    );
    this.save();
    this.emitter.emit("change", {
      key,
      newValue: value,
      oldValue
    });
  }
  /**
   * 删除 kv 值并派发 change 事件。
   */
  delete(key) {
    const oldValue = this.get(key);
    this.db.run("DELETE FROM kv WHERE key = ?", [key]);
    this.save();
    this.emitter.emit("change", {
      key,
      newValue: void 0,
      oldValue
    });
  }
  // Expose database for cowork operations
  getDatabase() {
    return this.db;
  }
  // Expose save method for external use (e.g., CoworkStore)
  getSaveFunction() {
    return () => this.save();
  }
};
// 进程级 sql.js 初始化缓存，避免重复加载 wasm。
__publicField(_SqliteStore, "sqlPromise", null);
let SqliteStore = _SqliteStore;
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    node_crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID: node_crypto.randomUUID };
function _v4(options, buf, offset) {
  var _a;
  options = options || {};
  const rnds = options.random ?? ((_a = options.rng) == null ? void 0 : _a.call(options)) ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
const CHINESE_QUESTION_PREFIX_RE = /^(?:请问|问下|问一下|是否|能否|可否|为什么|为何|怎么|如何|谁|什么|哪(?:里|儿|个)?|几|多少|要不要|会不会|是不是|能不能|可不可以|行不行|对不对|好不好)/u;
const ENGLISH_QUESTION_PREFIX_RE = /^(?:what|who|why|how|when|where|which|is|are|am|do|does|did|can|could|would|will|should)\b/i;
const QUESTION_INLINE_RE = /(是不是|能不能|可不可以|要不要|会不会|有没有|对不对|好不好)/i;
const QUESTION_SUFFIX_RE = /(吗|么|呢|嘛)\s*$/u;
function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}
function isQuestionLikeMemoryText(text) {
  const normalized = normalizeText(text).replace(/[。！!]+$/g, "").trim();
  if (!normalized) return false;
  if (/[？?]\s*$/.test(normalized)) return true;
  if (CHINESE_QUESTION_PREFIX_RE.test(normalized)) return true;
  if (ENGLISH_QUESTION_PREFIX_RE.test(normalized)) return true;
  if (QUESTION_INLINE_RE.test(normalized)) return true;
  if (QUESTION_SUFFIX_RE.test(normalized)) return true;
  return false;
}
const MEMORY_NEAR_DUPLICATE_MIN_SCORE = 0.82;
const MEMORY_PROCEDURAL_TEXT_RE = /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i;
const MEMORY_ASSISTANT_STYLE_TEXT_RE = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i;
function shouldAutoDeleteMemoryText(text) {
  const normalized = normalizeMemoryText(text);
  if (!normalized) return false;
  return MEMORY_ASSISTANT_STYLE_TEXT_RE.test(normalized) || MEMORY_PROCEDURAL_TEXT_RE.test(normalized) || isQuestionLikeMemoryText(normalized);
}
function normalizeMemoryText(value) {
  return value.replace(/\s+/g, " ").trim();
}
function truncate(value, maxChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1)}…`;
}
function buildMemoryFingerprint(text) {
  const key = normalizeMemoryMatchKey(text);
  return crypto.createHash("sha1").update(key).digest("hex");
}
function normalizeMemoryMatchKey(value) {
  return normalizeMemoryText(value).toLowerCase().replace(/[\u0000-\u001f]/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function normalizeMemorySemanticKey(value) {
  const key = normalizeMemoryMatchKey(value);
  if (!key) return "";
  return key.replace(/^(?:the user|user|i am|i m|i|my|me)\s+/i, "").replace(/^(?:该用户|这个用户|用户|本人|我的|我们|咱们|咱|我|你的|你)\s*/u, "").replace(/\s+/g, " ").trim();
}
function scoreMemorySimilarity(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const compactLeft = left.replace(/\s+/g, "");
  const compactRight = right.replace(/\s+/g, "");
  if (compactLeft && compactLeft === compactRight) {
    return 1;
  }
  let phraseScore = 0;
  if (compactLeft && compactRight && (compactLeft.includes(compactRight) || compactRight.includes(compactLeft))) {
    phraseScore = Math.min(compactLeft.length, compactRight.length) / Math.max(compactLeft.length, compactRight.length);
  }
  return Math.max(phraseScore, scoreTokenOverlap(left, right), scoreCharacterBigramDice(left, right));
}
function scoreTokenOverlap(left, right) {
  const leftMap = buildTokenFrequencyMap(left);
  const rightMap = buildTokenFrequencyMap(right);
  if (leftMap.size === 0 || rightMap.size === 0) return 0;
  let leftCount = 0;
  let rightCount = 0;
  let intersection = 0;
  for (const count of leftMap.values()) leftCount += count;
  for (const count of rightMap.values()) rightCount += count;
  for (const [token, leftValue] of leftMap.entries()) {
    intersection += Math.min(leftValue, rightMap.get(token) || 0);
  }
  const denominator = Math.min(leftCount, rightCount);
  if (denominator <= 0) return 0;
  return intersection / denominator;
}
function scoreCharacterBigramDice(left, right) {
  const leftMap = buildCharacterBigramMap(left);
  const rightMap = buildCharacterBigramMap(right);
  if (leftMap.size === 0 || rightMap.size === 0) return 0;
  let leftCount = 0;
  let rightCount = 0;
  let intersection = 0;
  for (const count of leftMap.values()) leftCount += count;
  for (const count of rightMap.values()) rightCount += count;
  for (const [gram, leftValue] of leftMap.entries()) {
    intersection += Math.min(leftValue, rightMap.get(gram) || 0);
  }
  const denominator = leftCount + rightCount;
  if (denominator <= 0) return 0;
  return 2 * intersection / denominator;
}
function buildCharacterBigramMap(value) {
  const compact = value.replace(/\s+/g, "").trim();
  if (!compact) return /* @__PURE__ */ new Map();
  if (compact.length <= 1) return /* @__PURE__ */ new Map([[compact, 1]]);
  const map2 = /* @__PURE__ */ new Map();
  for (let index = 0; index < compact.length - 1; index += 1) {
    const gram = compact.slice(index, index + 2);
    map2.set(gram, (map2.get(gram) || 0) + 1);
  }
  return map2;
}
function buildTokenFrequencyMap(value) {
  const tokens = value.split(/\s+/g).map((token) => token.trim()).filter(Boolean);
  const map2 = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    map2.set(token, (map2.get(token) || 0) + 1);
  }
  return map2;
}
function choosePreferredMemoryText(currentText, incomingText) {
  const normalizedCurrent = truncate(normalizeMemoryText(currentText), 360);
  const normalizedIncoming = truncate(normalizeMemoryText(incomingText), 360);
  if (!normalizedCurrent) return normalizedIncoming;
  if (!normalizedIncoming) return normalizedCurrent;
  const currentScore = scoreMemoryTextQuality(normalizedCurrent);
  const incomingScore = scoreMemoryTextQuality(normalizedIncoming);
  if (incomingScore > currentScore + 1) return normalizedIncoming;
  if (currentScore > incomingScore + 1) return normalizedCurrent;
  return normalizedIncoming.length >= normalizedCurrent.length ? normalizedIncoming : normalizedCurrent;
}
function scoreMemoryTextQuality(value) {
  const normalized = normalizeMemoryText(value);
  if (!normalized) return 0;
  let score = normalized.length;
  if (/^(?:该用户|这个用户|用户)\s*/u.test(normalized)) {
    score -= 12;
  }
  if (/^(?:the user|user)\b/i.test(normalized)) {
    score -= 12;
  }
  if (/^(?:我|我的|我是|我有|我会|我喜欢|我偏好)/u.test(normalized)) {
    score += 4;
  }
  if (/^(?:i|i am|i'm|my)\b/i.test(normalized)) {
    score += 4;
  }
  return score;
}
class CoworkStore {
  constructor(db, saveDb) {
    __publicField(this, "db");
    __publicField(this, "saveDb");
    this.db = db;
    this.saveDb = saveDb;
  }
  getOne(sql, params = []) {
    var _a;
    const result = this.db.exec(sql, params);
    if (!((_a = result[0]) == null ? void 0 : _a.values[0])) return void 0;
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    return row;
  }
  getAll(sql, params = []) {
    var _a;
    const result = this.db.exec(sql, params);
    if (!((_a = result[0]) == null ? void 0 : _a.values)) return [];
    const columns = result[0].columns;
    return result[0].values.map((values) => {
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      return row;
    });
  }
  mapMemoryRow(row) {
    return {
      id: row.id,
      text: row.text,
      confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : 0.7,
      isExplicit: Boolean(row.is_explicit),
      status: row.status === "stale" || row.status === "deleted" ? row.status : "created",
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      lastUsedAt: row.last_used_at === null ? null : Number(row.last_used_at)
    };
  }
  addMemorySource(memoryId, source) {
    const now = Date.now();
    this.db.run(
      `
      INSERT INTO user_memory_sources (id, memory_id, session_id, message_id, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `,
      [v4(), memoryId, (source == null ? void 0 : source.sessionId) || null, (source == null ? void 0 : source.messageId) || null, (source == null ? void 0 : source.role) || "system", now]
    );
  }
  createOrReviveUserMemory(input) {
    const normalizedText = truncate(normalizeMemoryText(input.text), 360);
    if (!normalizedText) {
      throw new Error("Memory text is required");
    }
    const now = Date.now();
    const fingerprint = buildMemoryFingerprint(normalizedText);
    const confidence = Math.max(0, Math.min(1, Number.isFinite(input.confidence) ? Number(input.confidence) : 0.75));
    const explicitFlag = input.isExplicit ? 1 : 0;
    let existing = this.getOne(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE fingerprint = ? AND status != 'deleted'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
      [fingerprint]
    );
    if (!existing) {
      const incomingSemanticKey = normalizeMemorySemanticKey(normalizedText);
      if (incomingSemanticKey) {
        const candidates = this.getAll(`
          SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
          FROM user_memories
          WHERE status != 'deleted'
          ORDER BY updated_at DESC
          LIMIT 200
        `);
        let bestCandidate = null;
        let bestScore = 0;
        for (const candidate of candidates) {
          const candidateSemanticKey = normalizeMemorySemanticKey(candidate.text);
          if (!candidateSemanticKey) continue;
          const score = scoreMemorySimilarity(candidateSemanticKey, incomingSemanticKey);
          if (score <= bestScore) continue;
          bestScore = score;
          bestCandidate = candidate;
        }
        if (bestCandidate && bestScore >= MEMORY_NEAR_DUPLICATE_MIN_SCORE) {
          existing = bestCandidate;
        }
      }
    }
    if (existing) {
      const mergedText = choosePreferredMemoryText(existing.text, normalizedText);
      const mergedExplicit = existing.is_explicit ? 1 : explicitFlag;
      const mergedConfidence = Math.max(Number(existing.confidence) || 0, confidence);
      this.db.run(
        `
        UPDATE user_memories
        SET text = ?, fingerprint = ?, confidence = ?, is_explicit = ?, status = 'created', updated_at = ?
        WHERE id = ?
      `,
        [mergedText, buildMemoryFingerprint(mergedText), mergedConfidence, mergedExplicit, now, existing.id]
      );
      this.addMemorySource(existing.id, input.source);
      const memory2 = this.getOne(
        `
        SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
        FROM user_memories
        WHERE id = ?
      `,
        [existing.id]
      );
      if (!memory2) {
        throw new Error("Failed to reload updated memory");
      }
      return { memory: this.mapMemoryRow(memory2), created: false, updated: true };
    }
    const id = v4();
    this.db.run(
      `
      INSERT INTO user_memories (
        id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, 'created', ?, ?, NULL)
    `,
      [id, normalizedText, fingerprint, confidence, explicitFlag, now, now]
    );
    this.addMemorySource(id, input.source);
    const memory = this.getOne(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE id = ?
    `,
      [id]
    );
    if (!memory) {
      throw new Error("Failed to load created memory");
    }
    return { memory: this.mapMemoryRow(memory), created: true, updated: false };
  }
  createUserMemory(input) {
    const result = this.createOrReviveUserMemory(input);
    this.saveDb();
    return result.memory;
  }
  updateUserMemory(input) {
    const current = this.getOne(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE id = ?
    `,
      [input.id]
    );
    if (!current) return null;
    const now = Date.now();
    const nextText = input.text !== void 0 ? truncate(normalizeMemoryText(input.text), 360) : current.text;
    if (!nextText) {
      throw new Error("Memory text is required");
    }
    const nextConfidence = input.confidence !== void 0 ? Math.max(0, Math.min(1, Number(input.confidence))) : Number(current.confidence);
    const nextStatus = input.status && (input.status === "created" || input.status === "stale" || input.status === "deleted") ? input.status : current.status;
    const nextExplicit = input.isExplicit !== void 0 ? input.isExplicit ? 1 : 0 : current.is_explicit;
    this.db.run(
      `
      UPDATE user_memories
      SET text = ?, fingerprint = ?, confidence = ?, is_explicit = ?, status = ?, updated_at = ?
      WHERE id = ?
    `,
      [nextText, buildMemoryFingerprint(nextText), nextConfidence, nextExplicit, nextStatus, now, input.id]
    );
    const updated = this.getOne(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE id = ?
    `,
      [input.id]
    );
    this.saveDb();
    return updated ? this.mapMemoryRow(updated) : null;
  }
  deleteUserMemory(id) {
    var _a, _b;
    const now = Date.now();
    this.db.run(
      `
      UPDATE user_memories
      SET status = 'deleted', updated_at = ?
      WHERE id = ?
    `,
      [now, id]
    );
    this.db.run(
      `
      UPDATE user_memory_sources
      SET is_active = 0
      WHERE memory_id = ?
    `,
      [id]
    );
    this.saveDb();
    return (((_b = (_a = this.db).getRowsModified) == null ? void 0 : _b.call(_a)) || 0) > 0;
  }
  listUserMemories(options = {}) {
    const query = normalizeMemoryText(options.query || "");
    const includeDeleted = Boolean(options.includeDeleted);
    const status = options.status || "all";
    const limit = Math.max(1, Math.min(200, Math.floor(options.limit ?? 200)));
    const offset = Math.max(0, Math.floor(options.offset ?? 0));
    const clauses = [];
    const params = [];
    if (!includeDeleted && status === "all") {
      clauses.push(`status != 'deleted'`);
    }
    if (status !== "all") {
      clauses.push("status = ?");
      params.push(status);
    }
    if (query) {
      clauses.push("LOWER(text) LIKE ?");
      params.push(`%${query.toLowerCase()}%`);
    }
    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.getAll(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset]
    );
    return rows.map((row) => this.mapMemoryRow(row));
  }
  getUserMemoryStats() {
    const rows = this.getAll(`
      SELECT status, is_explicit, COUNT(*) AS count
      FROM user_memories
      GROUP BY status, is_explicit
    `);
    const stats = {
      total: 0,
      created: 0,
      stale: 0,
      deleted: 0,
      explicit: 0,
      implicit: 0
    };
    for (const row of rows) {
      const count = Number(row.count) || 0;
      stats.total += count;
      if (row.status === "created") stats.created += count;
      if (row.status === "stale") stats.stale += count;
      if (row.status === "deleted") stats.deleted += count;
      if (row.is_explicit) stats.explicit += count;
      else stats.implicit += count;
    }
    return stats;
  }
  autoDeleteNonPersonalMemories() {
    const rows = this.getAll(`SELECT id, text FROM user_memories WHERE status = 'created'`);
    if (rows.length === 0) return 0;
    const now = Date.now();
    let deleted = 0;
    for (const row of rows) {
      if (!shouldAutoDeleteMemoryText(row.text)) {
        continue;
      }
      this.db.run(
        `
        UPDATE user_memories
        SET status = 'deleted', updated_at = ?
        WHERE id = ?
      `,
        [now, row.id]
      );
      this.db.run(
        `
        UPDATE user_memory_sources
        SET is_active = 0
        WHERE memory_id = ?
      `,
        [row.id]
      );
      deleted += 1;
    }
    if (deleted > 0) {
      this.saveDb();
    }
    return deleted;
  }
}
electron.app.name = APP_NAME;
electron.app.setName(APP_NAME);
const isDev = process.env.NODE_ENV === "development";
process.platform === "linux";
const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || "http://localhost:5176";
const PRELOAD_PATH = electron.app.isPackaged ? path$2.join(__dirname, "preload.js") : path$2.join(__dirname, "../dist-electron/preload.js");
const getAppIconPath = () => {
  if (process.platform !== "win32" && process.platform !== "linux") return void 0;
  const basePath = electron.app.isPackaged ? path$2.join(process.resourcesPath, "tray") : path$2.join(__dirname, "..", "resources", "tray");
  return process.platform === "win32" ? path$2.join(basePath, "tray-icon.ico") : path$2.join(basePath, "tray-icon.png");
};
let mainWindow = null;
const gotTheLock = isDev ? true : electron.app.requestSingleInstanceLock();
let store = null;
let coworkStore = null;
let skillManager = null;
let storeInitPromise = null;
const initStore = async () => {
  if (!storeInitPromise) {
    if (!electron.app.isReady()) {
      throw new Error("Store accessed before app is ready.");
    }
    storeInitPromise = Promise.race([
      SqliteStore.create(electron.app.getPath("userData")),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Store initialization timed out after 15s")), 15e3))
    ]);
  }
  return storeInitPromise;
};
const getStore = () => {
  if (!store) {
    throw new Error("Store not initialized. Call initStore() first.");
  }
  return store;
};
const getCoworkStore = () => {
  if (!coworkStore) {
    const sqliteStore = getStore();
    coworkStore = new CoworkStore(sqliteStore.getDatabase(), sqliteStore.getSaveFunction());
    const cleaned = coworkStore.autoDeleteNonPersonalMemories();
    if (cleaned > 0) {
      console.info(`[cowork-memory] Auto-deleted ${cleaned} non-personal/procedural memories`);
    }
  }
  return coworkStore;
};
const getSkillManager = () => {
  if (!skillManager) {
    skillManager = new SkillManager(getStore);
  }
  return skillManager;
};
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.ipcMain.on("window-minimize", () => {
    mainWindow == null ? void 0 : mainWindow.minimize();
  });
  electron.ipcMain.on("window-maximize", () => {
    if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow == null ? void 0 : mainWindow.maximize();
    }
  });
  electron.ipcMain.on("window-close", () => {
    mainWindow == null ? void 0 : mainWindow.close();
  });
  electron.ipcMain.handle("window:isMaximized", () => {
    return (mainWindow == null ? void 0 : mainWindow.isMaximized()) ?? false;
  });
  electron.ipcMain.handle("skills:list", () => {
    try {
      const skills = getSkillManager().listSkills();
      return { success: true, skills };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load skills"
      };
    }
  });
  electron.ipcMain.handle("skills:getConfig", (_event, skillId) => {
    return getSkillManager().getSkillConfig(skillId);
  });
  electron.ipcMain.handle("skills:setConfig", (_event, skillId, config) => {
    return getSkillManager().setSkillConfig(skillId, config);
  });
  electron.ipcMain.handle("skills:testEmailConnectivity", async (_event, skillId, config) => {
    return getSkillManager().testEmailConnectivity(skillId, config);
  });
  electron.ipcMain.handle(
    "api:fetch",
    async (_event, options) => {
      try {
        const response = await electron.session.defaultSession.fetch(options.url, {
          method: options.method,
          headers: options.headers,
          body: options.body
        });
        const contentType = response.headers.get("content-type") || "";
        let data;
        if (contentType.includes("text/event-stream")) {
          data = await response.text();
        } else if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          statusText: error instanceof Error ? error.message : "Network error",
          headers: {},
          data: null,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "cowork:memory:createEntry",
    async (_event, input) => {
      try {
        const entry = getCoworkStore().createUserMemory({
          text: input.text,
          confidence: input.confidence,
          isExplicit: input == null ? void 0 : input.isExplicit
        });
        return { success: true, entry };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create memory entry"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "cowork:memory:updateEntry",
    async (_event, input) => {
      try {
        const entry = getCoworkStore().updateUserMemory({
          id: input.id,
          text: input.text,
          confidence: input.confidence,
          status: input.status,
          isExplicit: input.isExplicit
        });
        if (!entry) {
          return { success: false, error: "Memory entry not found" };
        }
        return { success: true, entry };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update memory entry"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "cowork:memory:listEntries",
    async (_event, input) => {
      var _a;
      try {
        const entries = getCoworkStore().listUserMemories({
          query: ((_a = input == null ? void 0 : input.query) == null ? void 0 : _a.trim()) || void 0,
          status: (input == null ? void 0 : input.status) || "all",
          includeDeleted: Boolean(input == null ? void 0 : input.includeDeleted),
          limit: input == null ? void 0 : input.limit,
          offset: input == null ? void 0 : input.offset
        });
        return { success: true, entries };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to list memory entries"
        };
      }
    }
  );
  electron.ipcMain.handle("cowork:memory:getStats", async () => {
    try {
      const stats = getCoworkStore().getUserMemoryStats();
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get memory stats"
      };
    }
  });
  electron.ipcMain.handle(
    "cowork:memory:deleteEntry",
    async (_event, input) => {
      try {
        const success = getCoworkStore().deleteUserMemory(input.id);
        return success ? { success: true } : { success: false, error: "Memory entry not found" };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete memory entry"
        };
      }
    }
  );
  electron.ipcMain.handle("cowork:sandbox:install", async () => {
  });
  electron.app.on("second-instance", (_event, commandLine, workingDirectory) => {
    console.log("[Main] second-instance event", {
      commandLine,
      workingDirectory
    });
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      if (!mainWindow.isFocused()) mainWindow.focus();
    }
  });
  const setContentSecurityPolicy = () => {
    electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      var _a, _b;
      const devPort = ((_b = (_a = process.env.ELECTRON_START_URL) == null ? void 0 : _a.match(/:(\d+)/)) == null ? void 0 : _b[1]) || "5176";
      const cspDirectives = [
        "default-src 'self'",
        isDev ? `script-src 'self' 'unsafe-inline' http://localhost:${devPort} ws://localhost:${devPort}` : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http:",
        // 允许连接到所有域名，不做限制
        "connect-src *",
        "font-src 'self' data:",
        "media-src 'self'",
        "worker-src 'self' blob:",
        "frame-src 'self'"
      ];
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": cspDirectives.join("; ")
        }
      });
    });
  };
  const createWindow = () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      if (!mainWindow.isFocused()) mainWindow.focus();
      return;
    }
    mainWindow = new electron.BrowserWindow({
      width: 1200,
      height: 800,
      title: APP_NAME,
      icon: getAppIconPath(),
      ...isMac ? {
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 12, y: 20 }
      } : isWindows ? {
        frame: false,
        titleBarStyle: "hidden"
      } : {
        titleBarStyle: "hidden"
        // titleBarOverlay: getTitleBarOverlayOptions(),
      },
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: PRELOAD_PATH,
        backgroundThrottling: false,
        devTools: isDev,
        spellcheck: false,
        enableWebSQL: false,
        autoplayPolicy: "document-user-activation-required",
        disableDialogs: true,
        navigateOnDragDrop: false
      },
      backgroundColor: "#F8F9FB",
      show: false,
      autoHideMenuBar: true,
      enableLargerThanScreen: false
    });
    if (isMac && isDev) {
      const iconPath = path$2.join(__dirname, "../build/icons/png/512x512.png");
      if (fs$5.existsSync(iconPath)) {
        electron.app.dock.setIcon(electron.nativeImage.createFromPath(iconPath));
      }
    }
    mainWindow.setMenu(null);
    mainWindow.setMinimumSize(800, 600);
    if (isDev) {
      const maxRetries = 3;
      let retryCount = 0;
      const tryLoadURL = () => {
        mainWindow == null ? void 0 : mainWindow.loadURL(DEV_SERVER_URL).catch((err) => {
          console.error("Failed to load URL:", err);
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`Retrying to load URL (${retryCount}/${maxRetries})...`);
            setTimeout(tryLoadURL, 3e3);
          } else {
            console.error("Failed to load URL after maximum retries");
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadFile(path$2.join(__dirname, "../resources/error.html"));
            }
          }
        });
      };
      tryLoadURL();
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path$2.join(__dirname, "../dist/index.html"));
    }
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
    mainWindow.once("ready-to-show", () => {
      mainWindow == null ? void 0 : mainWindow.show();
    });
    electron.app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (!mainWindow.isFocused()) mainWindow.focus();
        return;
      }
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  };
  const manager = getSkillManager();
  console.log("[Main] initApp: getSkillManager done");
  try {
    manager.syncBundledSkillsToUserData();
    console.log("[Main] initApp: syncBundledSkillsToUserData done");
  } catch (error) {
    console.error("[Main] initApp: syncBundledSkillsToUserData failed:", error);
  }
  const initApp = async () => {
    console.log('app.getPath("userData")', electron.app.getPath("userData"));
    console.log("[Main] initApp: waiting for app.whenReady()");
    await electron.app.whenReady();
    console.log("[Main] initApp: app is ready");
    const defaultProjectDir = path$2.join(os.homedir(), "lobsterai", "project");
    if (!fs$5.existsSync(defaultProjectDir)) {
      fs$5.mkdirSync(defaultProjectDir, { recursive: true });
      console.log("Created default project directory:", defaultProjectDir);
    }
    console.log("[Main] initApp: default project dir ensured");
    console.log("[Main] initApp: starting initStore()");
    store = await initStore();
    console.log("[Main] initApp: store initialized");
    setContentSecurityPolicy();
    console.log("[Main] initApp: creating window");
    createWindow();
    console.log("[Main] initApp: window created");
    electron.app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (!mainWindow.isFocused()) mainWindow.focus();
        return;
      }
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  };
  initApp().catch(console.error);
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  });
}
//# sourceMappingURL=main.js.map
