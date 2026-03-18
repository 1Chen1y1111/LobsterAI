"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
const require$$0$1 = require("electron");
const path$8 = require("node:path");
const fs$b = require("node:fs");
const os$4 = require("node:os");
const require$$0$2 = require("child_process");
const fs$a = require("fs");
const path$7 = require("path");
const require$$1 = require("tty");
const require$$1$2 = require("util");
const require$$1$1 = require("os");
const require$$0 = require("buffer");
const require$$6 = require("stream");
const require$$1$3 = require("zlib");
const require$$4 = require("events");
const crypto = require("crypto");
const initSqlJs = require("sql.js");
const http$1 = require("http");
const node_crypto = require("node:crypto");
const promises = require("stream/promises");
const require$$1$4 = require("https");
const string_decoder = require("string_decoder");
const url = require("url");
const net = require("net");
const APP_NAME = "CyLobsterAI";
const DB_FILENAME = "cylobsterai.sqlite";
/*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT */
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject$1(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index2, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index2 = 0, length = sourceKeys.length; index2 < length; index2 += 1) {
      key = sourceKeys[index2];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string2, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string2;
  }
  return result;
}
function isNegativeZero(number2) {
  return number2 === 0 && Number.NEGATIVE_INFINITY === 1 / number2;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject$1;
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
function formatError$1(exception2, compact) {
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
  this.message = formatError$1(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError$1(this, compact);
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
function padStart(string2, max) {
  return common$1.repeat(" ", max - string2.length) + string2;
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
    Object.keys(map2).forEach(function(style2) {
      map2[style2].forEach(function(alias) {
        result[String(alias)] = style2;
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
  }, index2, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index2 = 0, length = arguments.length; index2 < length; index2 += 1) {
    arguments[index2].forEach(collectType);
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
function isNull(object2) {
  return object2 === null;
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
function isBoolean(object2) {
  return Object.prototype.toString.call(object2) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object2) {
      return object2 ? "true" : "false";
    },
    uppercase: function(object2) {
      return object2 ? "TRUE" : "FALSE";
    },
    camelcase: function(object2) {
      return object2 ? "True" : "False";
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
  var max = data.length, index2 = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index2];
  if (ch === "-" || ch === "+") {
    ch = data[++index2];
  }
  if (ch === "0") {
    if (index2 + 1 === max) return true;
    ch = data[++index2];
    if (ch === "b") {
      index2++;
      for (; index2 < max; index2++) {
        ch = data[index2];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index2++;
      for (; index2 < max; index2++) {
        ch = data[index2];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index2))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index2++;
      for (; index2 < max; index2++) {
        ch = data[index2];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index2))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index2 < max; index2++) {
    ch = data[index2];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index2))) {
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
function isInteger(object2) {
  return Object.prototype.toString.call(object2) === "[object Number]" && (object2 % 1 === 0 && !common$1.isNegativeZero(object2));
}
var int$1 = new type("tag:yaml.org,2002:int", {
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
function representYamlFloat(object2, style2) {
  var res;
  if (isNaN(object2)) {
    switch (style2) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object2) {
    switch (style2) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object2) {
    switch (style2) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common$1.isNegativeZero(object2)) {
    return "-0.0";
  }
  res = object2.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object2) {
  return Object.prototype.toString.call(object2) === "[object Number]" && (object2 % 1 !== 0 || common$1.isNegativeZero(object2));
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
    int$1,
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
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date2;
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
  date2 = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date2.setTime(date2.getTime() - delta);
  return date2;
}
function representYamlTimestamp(object2) {
  return object2.toISOString();
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
function representYamlBinary(object2) {
  var result = "", bits = 0, idx, tail, max = object2.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object2[idx];
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
  var objectKeys = [], index2, length, pair, pairKey, pairHasKey, object2 = data;
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    pair = object2[index2];
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
  var index2, length, pair, keys, result, object2 = data;
  result = new Array(object2.length);
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    pair = object2[index2];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index2] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index2, length, pair, keys, result, object2 = data;
  result = new Array(object2.length);
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    pair = object2[index2];
    keys = Object.keys(pair);
    result[index2] = [keys[0], pair[keys[0]]];
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
  var key, object2 = data;
  for (key in object2) {
    if (_hasOwnProperty$2.call(object2, key)) {
      if (object2[key] !== null) return false;
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
var _default$1 = core.extend({
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
function setProperty(object2, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object2, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object2[key] = value;
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
  this.schema = options["schema"] || _default$1;
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
  var _position, _length2, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length2 = _result.length; _position < _length2; _position += 1) {
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
  var sourceKeys, key, index2, quantity;
  if (!common$1.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index2 = 0, quantity = sourceKeys.length; index2 < quantity; index2 += 1) {
    key = sourceKeys[index2];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index2, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index2 = 0, quantity = keyNode.length; index2 < quantity; index2 += 1) {
      if (Array.isArray(keyNode[index2])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index2]) === "[object Object]") {
        keyNode[index2] = "[object Object]";
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
      for (index2 = 0, quantity = valueNode.length; index2 < quantity; index2 += 1) {
        mergeMappings(state, _result, valueNode[index2], overridableKeys);
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
  for (var index2 = 0, length = documents.length; index2 < length; index2 += 1) {
    iterator(documents[index2]);
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
  var result, keys, index2, length, tag, style2, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index2 = 0, length = keys.length; index2 < length; index2 += 1) {
    tag = keys[index2];
    style2 = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style2)) {
      style2 = type2.styleAliases[style2];
    }
    result[tag] = style2;
  }
  return result;
}
function encodeHex(character) {
  var string2, handle, length;
  string2 = character.toString(16).toUpperCase();
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
  return "\\" + handle + common$1.repeat("0", length - string2.length) + string2;
}
var QUOTING_TYPE_SINGLE = 1, QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default$1;
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
function indentString(string2, spaces) {
  var ind = common$1.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string2.length;
  while (position < length) {
    next = string2.indexOf("\n", position);
    if (next === -1) {
      line = string2.slice(position);
      position = length;
    } else {
      line = string2.slice(position, next + 1);
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
  var index2, length, type2;
  for (index2 = 0, length = state.implicitTypes.length; index2 < length; index2 += 1) {
    type2 = state.implicitTypes[index2];
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
function codePointAt(string2, pos) {
  var first = string2.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string2.length) {
    second = string2.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string2) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string2);
}
var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
function chooseScalarStyle(string2, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string2, 0)) && isPlainSafeLast(codePointAt(string2, string2.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string2.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string2, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string2.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string2, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string2[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string2[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string2)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string2)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string2, level, iskey, inblock) {
  state.dump = function() {
    if (string2.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string2) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string2)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string2 + '"' : "'" + string2 + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string3) {
      return testImplicitResolving(state, string3);
    }
    switch (chooseScalarStyle(
      string2,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string2;
      case STYLE_SINGLE:
        return "'" + string2.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string2, state.indent) + dropEndingNewline(indentString(string2, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string2, state.indent) + dropEndingNewline(indentString(foldString(string2, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string2) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string2, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string2) ? String(indentPerLevel) : "";
  var clip = string2[string2.length - 1] === "\n";
  var keep = clip && (string2[string2.length - 2] === "\n" || string2 === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string2) {
  return string2[string2.length - 1] === "\n" ? string2.slice(0, -1) : string2;
}
function foldString(string2, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string2.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string2.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string2.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string2[0] === "\n" || string2[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string2)) {
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
function escapeString(string2) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string2.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string2, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string2[i];
      if (char >= 65536) result += string2[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object2) {
  var _result = "", _tag = state.tag, index2, length, value;
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    value = object2[index2];
    if (state.replacer) {
      value = state.replacer.call(object2, String(index2), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object2, compact) {
  var _result = "", _tag = state.tag, index2, length, value;
  for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
    value = object2[index2];
    if (state.replacer) {
      value = state.replacer.call(object2, String(index2), value);
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
function writeFlowMapping(state, level, object2) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object2), index2, length, objectKey, objectValue, pairBuffer;
  for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index2];
    objectValue = object2[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object2, objectKey, objectValue);
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
function writeBlockMapping(state, level, object2, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object2), index2, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index2];
    objectValue = object2[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object2, objectKey, objectValue);
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
function detectType(state, object2, explicit) {
  var _result, typeList, index2, length, type2, style2;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index2 = 0, length = typeList.length; index2 < length; index2 += 1) {
    type2 = typeList[index2];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object2 === "object" && object2 instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object2))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object2);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style2 = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object2, style2);
        } else if (_hasOwnProperty.call(type2.represent, style2)) {
          _result = type2.represent[style2](object2, style2);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style2 + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object2, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object2;
  if (!detectType(state, object2, false)) {
    detectType(state, object2, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object2);
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
function getDuplicateReferences(object2, state) {
  var objects = [], duplicatesIndexes = [], index2, length;
  inspectNode(object2, objects, duplicatesIndexes);
  for (index2 = 0, length = duplicatesIndexes.length; index2 < length; index2 += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index2]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object2, objects, duplicatesIndexes) {
  var objectKeyList, index2, length;
  if (object2 !== null && typeof object2 === "object") {
    index2 = objects.indexOf(object2);
    if (index2 !== -1) {
      if (duplicatesIndexes.indexOf(index2) === -1) {
        duplicatesIndexes.push(index2);
      }
    } else {
      objects.push(object2);
      if (Array.isArray(object2)) {
        for (index2 = 0, length = object2.length; index2 < length; index2 += 1) {
          inspectNode(object2[index2], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object2);
        for (index2 = 0, length = objectKeyList.length; index2 < length; index2 += 1) {
          inspectNode(object2[objectKeyList[index2]], objects, duplicatesIndexes);
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
var DEFAULT_SCHEMA = _default$1;
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
  int: int$1,
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
function getDefaultExportFromCjs$1(x) {
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
      return parse2(val);
    } else if (type2 === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse2(str2) {
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
        let index2 = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format2) => {
          if (match === "%%") {
            return "%";
          }
          index2++;
          const formatter = createDebug.formatters[format2];
          if (typeof formatter === "function") {
            const val = args[index2];
            match = formatter.call(self2, val);
            args.splice(index2, 1);
            index2--;
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
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
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
  const os2 = require$$1$1;
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
      const version2 = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version2 >= 3 ? 3 : 2;
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
    const util2 = require$$1$2;
    exports$1.init = init;
    exports$1.log = log2;
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
    function log2(...args) {
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
var fs$9;
try {
  fs$9 = require("fs");
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
  if (!fs$9) return false;
  return (stream2 instanceof (fs$9.ReadStream || noop) || stream2 instanceof (fs$9.WriteStream || noop)) && isFn(stream2.close);
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
var pipe$1 = function(from, to) {
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
  return streams.reduce(pipe$1);
};
var pump_1 = pump$1;
const { PassThrough: PassThroughStream } = require$$6;
var bufferStream$1 = (options) => {
  options = { ...options };
  const { array: array2 } = options;
  let { encoding } = options;
  const isBuffer = encoding === "buffer";
  let objectMode = false;
  if (array2) {
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
    if (array2) {
      return chunks;
    }
    return isBuffer ? Buffer.concat(chunks, length) : chunks.join("");
  };
  stream2.getBufferedLength = () => length;
  return stream2;
};
const { constants: BufferConstants } = require$$0;
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
var fs$8 = fs$a;
var util$2 = require$$1$2;
var stream$1 = require$$6;
var Readable = stream$1.Readable;
var Writable$1 = stream$1.Writable;
var PassThrough$2 = stream$1.PassThrough;
var Pend = pend;
var EventEmitter$4 = require$$4.EventEmitter;
fdSlicer.createFromBuffer = createFromBuffer;
fdSlicer.createFromFd = createFromFd;
fdSlicer.BufferSlicer = BufferSlicer;
fdSlicer.FdSlicer = FdSlicer;
util$2.inherits(FdSlicer, EventEmitter$4);
function FdSlicer(fd, options) {
  options = options || {};
  EventEmitter$4.call(this);
  this.fd = fd;
  this.pend = new Pend();
  this.pend.max = 1;
  this.refCount = 0;
  this.autoClose = !!options.autoClose;
}
FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var self2 = this;
  self2.pend.go(function(cb) {
    fs$8.read(self2.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
      cb();
      callback(err, bytesRead, buffer2);
    });
  });
};
FdSlicer.prototype.write = function(buffer, offset, length, position, callback) {
  var self2 = this;
  self2.pend.go(function(cb) {
    fs$8.write(self2.fd, buffer, offset, length, position, function(err, written, buffer2) {
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
    fs$8.close(self2.fd, onCloseDone);
  }
  function onCloseDone(err) {
    if (err) {
      self2.emit("error", err);
    } else {
      self2.emit("close");
    }
  }
};
util$2.inherits(ReadStream, Readable);
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
    fs$8.read(self2.context.fd, buffer, 0, toRead, self2.pos, function(err, bytesRead) {
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
util$2.inherits(WriteStream, Writable$1);
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
    fs$8.write(self2.context.fd, buffer, 0, buffer.length, self2.pos, function(err2, bytes) {
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
util$2.inherits(BufferSlicer, EventEmitter$4);
function BufferSlicer(buffer, options) {
  EventEmitter$4.call(this);
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
  var readStream = new PassThrough$2(options);
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
var Buffer$1 = require$$0.Buffer;
var CRC_TABLE$1 = [
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
  CRC_TABLE$1 = new Int32Array(CRC_TABLE$1);
}
function ensureBuffer$1(input) {
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
function bufferizeInt$1(num) {
  var tmp = ensureBuffer$1(4);
  tmp.writeInt32BE(num, 0);
  return tmp;
}
function _crc32$1(buf, previous) {
  buf = ensureBuffer$1(buf);
  if (Buffer$1.isBuffer(previous)) {
    previous = previous.readUInt32BE(0);
  }
  var crc = ~~previous ^ -1;
  for (var n = 0; n < buf.length; n++) {
    crc = CRC_TABLE$1[(crc ^ buf[n]) & 255] ^ crc >>> 8;
  }
  return crc ^ -1;
}
function crc32$3() {
  return bufferizeInt$1(_crc32$1.apply(null, arguments));
}
crc32$3.signed = function() {
  return _crc32$1.apply(null, arguments);
};
crc32$3.unsigned = function() {
  return _crc32$1.apply(null, arguments) >>> 0;
};
var bufferCrc32$1 = crc32$3;
var fs$7 = fs$a;
var zlib$1 = require$$1$3;
var fd_slicer = fdSlicer;
var crc32$2 = bufferCrc32$1;
var util$1 = require$$1$2;
var EventEmitter$3 = require$$4.EventEmitter;
var Transform$1 = require$$6.Transform;
var PassThrough$1 = require$$6.PassThrough;
var Writable = require$$6.Writable;
yauzl$1.open = open;
yauzl$1.fromFd = fromFd;
yauzl$1.fromBuffer = fromBuffer;
yauzl$1.fromRandomAccessReader = fromRandomAccessReader;
yauzl$1.dosDateTimeToDate = dosDateTimeToDate;
yauzl$1.validateFileName = validateFileName;
yauzl$1.ZipFile = ZipFile$1;
yauzl$1.Entry = Entry$1;
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
  fs$7.open(path2, "r", function(err, fd) {
    if (err) return callback(err);
    fromFd(fd, options, function(err2, zipfile) {
      if (err2) fs$7.close(fd, defaultCallback);
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
  fs$7.fstat(fd, function(err, stats) {
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
        return callback(null, new ZipFile$1(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
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
          return callback(null, new ZipFile$1(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames));
        });
      });
      return;
    }
    callback(new Error("end of central directory record signature not found"));
  });
}
util$1.inherits(ZipFile$1, EventEmitter$3);
function ZipFile$1(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
  var self2 = this;
  EventEmitter$3.call(self2);
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
ZipFile$1.prototype.close = function() {
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
ZipFile$1.prototype.readEntry = function() {
  if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
  this._readEntry();
};
ZipFile$1.prototype._readEntry = function() {
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
    var entry = new Entry$1();
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
        var index2 = 0;
        if (entry.uncompressedSize === 4294967295) {
          if (index2 + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self2, new Error("zip64 extended information extra field does not include uncompressed size"));
          }
          entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index2);
          index2 += 8;
        }
        if (entry.compressedSize === 4294967295) {
          if (index2 + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self2, new Error("zip64 extended information extra field does not include compressed size"));
          }
          entry.compressedSize = readUInt64LE(zip64EiefBuffer, index2);
          index2 += 8;
        }
        if (entry.relativeOffsetOfLocalHeader === 4294967295) {
          if (index2 + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self2, new Error("zip64 extended information extra field does not include relative header offset"));
          }
          entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index2);
          index2 += 8;
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
            if (crc32$2.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
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
ZipFile$1.prototype.openReadStream = function(entry, options, callback) {
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
        var inflateFilter = zlib$1.createInflateRaw();
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
function Entry$1() {
}
Entry$1.prototype.getLastModDate = function() {
  return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime);
};
Entry$1.prototype.isEncrypted = function() {
  return (this.generalPurposeBitFlag & 1) !== 0;
};
Entry$1.prototype.isCompressed = function() {
  return this.compressionMethod === 8;
};
function dosDateTimeToDate(date2, time2) {
  var day = date2 & 31;
  var month = (date2 >> 5 & 15) - 1;
  var year = (date2 >> 9 & 127) + 1980;
  var millisecond = 0;
  var second = (time2 & 31) * 2;
  var minute = time2 >> 5 & 63;
  var hour = time2 >> 11 & 31;
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
util$1.inherits(AssertByteCountStream, Transform$1);
function AssertByteCountStream(byteCount) {
  Transform$1.call(this);
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
util$1.inherits(RandomAccessReader, EventEmitter$3);
function RandomAccessReader() {
  EventEmitter$3.call(this);
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
    var emptyStream = new PassThrough$1();
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
util$1.inherits(RefUnrefFilter, PassThrough$1);
function RefUnrefFilter(context) {
  PassThrough$1.call(this);
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
var cp437$1 = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
function decodeBuffer(buffer, start, end, isUtf8) {
  if (isUtf8) {
    return buffer.toString("utf8", start, end);
  } else {
    var result = "";
    for (var i = start; i < end; i++) {
      result += cp437$1[buffer[i]];
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
const { createWriteStream, promises: fs$6 } = fs$a;
const getStream = getStreamExports;
const path$6 = path$7;
const { promisify } = require$$1$2;
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
        const destDir = path$6.dirname(path$6.join(this.opts.dir, entry.fileName));
        try {
          await fs$6.mkdir(destDir, { recursive: true });
          const canonicalDestDir = await fs$6.realpath(destDir);
          const relativeDestDir = path$6.relative(this.opts.dir, canonicalDestDir);
          if (relativeDestDir.split(path$6.sep).includes("..")) {
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
    const dest = path$6.join(this.opts.dir, entry.fileName);
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
    const destDir = isDir ? dest : path$6.dirname(dest);
    const mkdirOptions = { recursive: true };
    if (isDir) {
      mkdirOptions.mode = procMode;
    }
    debug("mkdir", { dir: destDir, ...mkdirOptions });
    await fs$6.mkdir(destDir, mkdirOptions);
    if (isDir) return;
    debug("opening read stream", dest);
    const readStream = await promisify(this.zipfile.openReadStream.bind(this.zipfile))(entry);
    if (symlink) {
      const link = await getStream(readStream);
      debug("creating symlink", link, dest);
      await fs$6.symlink(link, dest);
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
  if (!path$6.isAbsolute(opts.dir)) {
    throw new Error("Target directory is expected to be absolute");
  }
  await fs$6.mkdir(opts.dir, { recursive: true });
  opts.dir = await fs$6.realpath(opts.dir);
  return new Extractor(zipPath, opts).extract();
};
const extractZip = /* @__PURE__ */ getDefaultExportFromCjs$1(extractZip$1);
function cpRecursiveSync(src2, dest, opts = {}) {
  const { dereference = false, force = false } = opts;
  const stat = dereference ? fs$a.statSync(src2) : fs$a.lstatSync(src2);
  if (stat.isDirectory()) {
    if (!fs$a.existsSync(dest)) {
      fs$a.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs$a.readdirSync(src2)) {
      cpRecursiveSync(path$7.join(src2, entry), path$7.join(dest, entry), opts);
    }
  } else if (stat.isFile()) {
    if (fs$a.existsSync(dest) && !force) {
      return;
    }
    const destDir = path$7.dirname(dest);
    if (!fs$a.existsSync(destDir)) {
      fs$a.mkdirSync(destDir, { recursive: true });
    }
    fs$a.copyFileSync(src2, dest);
  } else if (stat.isSymbolicLink()) {
    if (fs$a.existsSync(dest)) {
      if (!force) return;
      fs$a.unlinkSync(dest);
    }
    const target = fs$a.readlinkSync(src2);
    fs$a.symlinkSync(target, dest);
  }
}
const PYTHON_RUNTIME_DIR_NAME = "python-win";
const PYTHON_RUNTIME_STATE_FILE = "runtime.json";
const REQUIRED_FILES = [
  "python.exe",
  "python3.exe"
];
const PIP_EXECUTABLE_CANDIDATES = [
  path$7.join("Scripts", "pip.exe"),
  path$7.join("Scripts", "pip3.exe"),
  path$7.join("Scripts", "pip.cmd"),
  path$7.join("Scripts", "pip3.cmd"),
  path$7.join("Scripts", "pip"),
  path$7.join("Scripts", "pip3")
];
const PIP_MODULE_MAIN_REL_PATH = path$7.join("Lib", "site-packages", "pip", "__main__.py");
const PIP_MODULE_INIT_REL_PATH = path$7.join("Lib", "site-packages", "pip", "__init__.py");
function hasPipExecutable(rootDir) {
  return PIP_EXECUTABLE_CANDIDATES.some((relPath) => fs$a.existsSync(path$7.join(rootDir, relPath)));
}
function hasPipSupport(rootDir) {
  const hasCommand2 = hasPipExecutable(rootDir);
  const hasModuleShim = fs$a.existsSync(path$7.join(rootDir, PIP_MODULE_MAIN_REL_PATH)) || fs$a.existsSync(path$7.join(rootDir, PIP_MODULE_INIT_REL_PATH));
  return hasCommand2 && hasModuleShim;
}
function findPythonExecutable(rootDir) {
  const candidates = [
    path$7.join(rootDir, "python.exe"),
    path$7.join(rootDir, "python3.exe")
  ];
  for (const candidate of candidates) {
    if (fs$a.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
function readEmbedPthFiles(rootDir) {
  try {
    return fs$a.readdirSync(rootDir).filter((name) => name.endsWith("._pth"));
  } catch {
    return [];
  }
}
function ensureEmbedSitePackages(rootDir) {
  const pthFiles = readEmbedPthFiles(rootDir);
  if (pthFiles.length === 0) {
    return;
  }
  const pthPath = path$7.join(rootDir, pthFiles[0]);
  const raw = fs$a.readFileSync(pthPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const updated = [];
  let hasSitePackages = false;
  let hasImportSite = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "import site" || trimmed === "#import site") {
      updated.push("import site");
      hasImportSite = true;
      continue;
    }
    if (trimmed.toLowerCase() === "lib\\site-packages" || trimmed.toLowerCase() === "lib/site-packages") {
      updated.push("Lib\\site-packages");
      hasSitePackages = true;
      continue;
    }
    updated.push(line);
  }
  if (!hasSitePackages) {
    updated.push("Lib\\site-packages");
  }
  if (!hasImportSite) {
    updated.push("import site");
  }
  const normalized = `${updated.join("\n").replace(/\n+$/g, "")}
`;
  if (normalized !== raw) {
    fs$a.writeFileSync(pthPath, normalized, "utf8");
  }
}
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
function runtimeHealth(rootDir, options = {}) {
  const requireEmbedSiteConfig = options.requireEmbedSiteConfig !== false;
  const requirePip = options.requirePip === true;
  const missing = [];
  for (const relPath of REQUIRED_FILES) {
    const fullPath = path$7.join(rootDir, relPath);
    if (!fs$a.existsSync(fullPath)) {
      missing.push(relPath);
    }
  }
  const hasPip = hasPipSupport(rootDir);
  if (requirePip && !hasPip) {
    if (!hasPipExecutable(rootDir)) {
      missing.push("Scripts/pip.exe (or Scripts/pip3.exe/pip.cmd)");
    }
    if (!fs$a.existsSync(path$7.join(rootDir, PIP_MODULE_MAIN_REL_PATH)) && !fs$a.existsSync(path$7.join(rootDir, PIP_MODULE_INIT_REL_PATH))) {
      missing.push(PIP_MODULE_MAIN_REL_PATH.replace(/\\/g, "/"));
    }
  }
  if (requireEmbedSiteConfig) {
    const pthFiles = readEmbedPthFiles(rootDir);
    if (pthFiles.length > 0) {
      const pthPath = path$7.join(rootDir, pthFiles[0]);
      try {
        const raw = fs$a.readFileSync(pthPath, "utf8");
        const lines = raw.split(/\r?\n/).map((line) => line.trim().toLowerCase());
        const hasImportSite = lines.includes("import site");
        const hasSitePackages = lines.includes("lib\\site-packages") || lines.includes("lib/site-packages");
        if (!hasImportSite || !hasSitePackages) {
          missing.push(`${pthFiles[0]} config (require "Lib\\site-packages" and "import site")`);
        }
      } catch {
        missing.push(`${pthFiles[0]} read failed`);
      }
    }
  }
  return {
    ok: missing.length === 0,
    missing
  };
}
function computeRuntimeSignature(rootDir) {
  const parts = [];
  for (const relPath of REQUIRED_FILES) {
    const fullPath = path$7.join(rootDir, relPath);
    try {
      const stat = fs$a.statSync(fullPath);
      parts.push(`${relPath}:${stat.size}:${Math.floor(stat.mtimeMs)}`);
    } catch {
      parts.push(`${relPath}:missing`);
    }
  }
  return parts.join("|");
}
function ensureRuntimeStateFile(runtimeRoot, sourceRoot) {
  const statePath = path$7.join(runtimeRoot, PYTHON_RUNTIME_STATE_FILE);
  const payload = {
    syncedAt: Date.now(),
    sourceRoot,
    signature: computeRuntimeSignature(runtimeRoot)
  };
  fs$a.writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}
`, "utf8");
}
function resolveBundledCandidates() {
  if (require$$0$1.app.isPackaged) {
    return [
      path$7.join(process.resourcesPath, PYTHON_RUNTIME_DIR_NAME),
      path$7.join(require$$0$1.app.getAppPath(), PYTHON_RUNTIME_DIR_NAME)
    ];
  }
  const projectRoot = path$7.resolve(__dirname, "..", "..", "..");
  return [
    path$7.join(projectRoot, "resources", PYTHON_RUNTIME_DIR_NAME),
    path$7.join(process.cwd(), "resources", PYTHON_RUNTIME_DIR_NAME),
    path$7.join(require$$0$1.app.getAppPath(), "resources", PYTHON_RUNTIME_DIR_NAME)
  ];
}
function getBundledPythonRoot() {
  const candidates = resolveBundledCandidates();
  for (const candidate of candidates) {
    if (fs$a.existsSync(candidate) && fs$a.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}
function getUserPythonRoot() {
  return path$7.join(require$$0$1.app.getPath("userData"), "runtimes", PYTHON_RUNTIME_DIR_NAME);
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
    if (!fs$a.existsSync(root)) continue;
    pathEntries.push(root, path$7.join(root, "Scripts"));
  }
  if (pathEntries.length > 0) {
    env.PATH = appendWindowsPath(env.PATH, pathEntries);
    env.LOBSTERAI_PYTHON_ROOT = pathEntries[0];
  }
  return env;
}
async function ensurePythonRuntimeReady() {
  if (process.platform !== "win32") {
    return { success: true };
  }
  try {
    const userRoot = getUserPythonRoot();
    if (fs$a.existsSync(userRoot)) {
      try {
        ensureEmbedSitePackages(userRoot);
      } catch (error) {
        console.warn("[python-runtime] Failed to normalize user runtime _pth:", error);
      }
    }
    const userHealth = runtimeHealth(userRoot);
    if (userHealth.ok) {
      ensureRuntimeStateFile(userRoot, "existing-user-runtime");
      if (!hasPipSupport(userRoot)) {
        console.warn("[python-runtime] User runtime is ready without full pip support; pip commands may fail.");
      }
      console.log("[python-runtime] User runtime already healthy");
      return { success: true };
    }
    const bundledRoot = getBundledPythonRoot();
    if (!bundledRoot) {
      const message = "Bundled python runtime not found in application resources.";
      console.error(`[python-runtime] ${message}`);
      return { success: false, error: message };
    }
    const bundledHealth = runtimeHealth(bundledRoot, { requireEmbedSiteConfig: false });
    if (!bundledHealth.ok) {
      const message = `Bundled python runtime is unhealthy (missing: ${bundledHealth.missing.join(", ")})`;
      console.error(`[python-runtime] ${message}`);
      return { success: false, error: message };
    }
    console.log(`[python-runtime] Sync runtime to userData: ${userRoot}`);
    if (fs$a.existsSync(userRoot)) {
      fs$a.rmSync(userRoot, { recursive: true, force: true });
    }
    fs$a.mkdirSync(path$7.dirname(userRoot), { recursive: true });
    cpRecursiveSync(bundledRoot, userRoot, { force: true, dereference: true });
    ensureEmbedSitePackages(userRoot);
    const syncedHealth = runtimeHealth(userRoot);
    if (!syncedHealth.ok) {
      const message = `Synced python runtime is unhealthy (missing: ${syncedHealth.missing.join(", ")})`;
      console.error(`[python-runtime] ${message}`);
      return { success: false, error: message };
    }
    ensureRuntimeStateFile(userRoot, bundledRoot);
    if (!hasPipSupport(userRoot)) {
      console.warn("[python-runtime] Synced runtime does not include full pip support; pip commands may fail.");
    }
    console.log("[python-runtime] Runtime sync complete");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[python-runtime] Failed to ensure runtime ready:", message);
    return { success: false, error: message };
  }
}
function runPythonCommand(pythonExe, args, rootDir) {
  const env = {
    ...process.env,
    PATH: appendWindowsPath(process.env.PATH, [rootDir, path$7.join(rootDir, "Scripts")])
  };
  const result = require$$0$2.spawnSync(pythonExe, args, {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: "pipe",
    timeout: 6e4,
    env
  });
  if (result.status === 0) {
    return { ok: true };
  }
  const detail = (result.stderr || result.stdout || "").trim();
  return { ok: false, detail: detail || `exit code ${String(result.status)}` };
}
function tryBootstrapPip(rootDir) {
  const pythonExe = findPythonExecutable(rootDir);
  if (!pythonExe) {
    return { ok: false, detail: "python executable not found in runtime root" };
  }
  const ensurePipResult = runPythonCommand(pythonExe, ["-m", "ensurepip", "--upgrade"], rootDir);
  if (!ensurePipResult.ok) {
    return ensurePipResult;
  }
  const pipVersionResult = runPythonCommand(pythonExe, ["-m", "pip", "--version"], rootDir);
  if (!pipVersionResult.ok) {
    return pipVersionResult;
  }
  return { ok: true };
}
async function ensurePythonPipReady() {
  if (process.platform !== "win32") {
    return { success: true };
  }
  const runtimeReady = await ensurePythonRuntimeReady();
  if (!runtimeReady.success) {
    return runtimeReady;
  }
  try {
    const userRoot = getUserPythonRoot();
    const userHealth = runtimeHealth(userRoot, { requirePip: true });
    if (userHealth.ok) {
      return { success: true };
    }
    const bootstrapResult = tryBootstrapPip(userRoot);
    if (bootstrapResult.ok) {
      const finalHealth = runtimeHealth(userRoot, { requirePip: true });
      if (finalHealth.ok) {
        console.log("[python-runtime] ensurepip successfully restored pip in user runtime");
        return { success: true };
      }
    }
    const errorDetail = bootstrapResult.detail ? ` (${bootstrapResult.detail})` : "";
    const message = `pip is unavailable in bundled runtime${errorDetail}`;
    console.error(`[python-runtime] ${message}`);
    return { success: false, error: message };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[python-runtime] Failed to ensure pip ready:", message);
    return { success: false, error: message };
  }
}
function resolveUserShellPath$1() {
  if (process.platform === "win32") return null;
  try {
    const shell = process.env.SHELL || "/bin/bash";
    const result = require$$0$2.execSync(`${shell} -ilc 'echo __PATH__=$PATH'`, {
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
  var _a3;
  const isWin = process.platform === "win32";
  const checker = isWin ? "where" : "which";
  const result = require$$0$2.spawnSync(checker, [command], {
    stdio: "pipe",
    env,
    shell: isWin,
    timeout: 5e3
  });
  if (result.status !== 0) {
    console.log(`[skills] hasCommand('${command}'): not found (status=${result.status}, error=${((_a3 = result.error) == null ? void 0 : _a3.message) || "none"})`);
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
function resolveWindowsRegistryPath$1() {
  if (process.platform !== "win32") return null;
  try {
    const machinePath = require$$0$2.execSync('reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path', {
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const userPath = require$$0$2.execSync('reg query "HKCU\\Environment" /v Path', {
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
  if (require$$0$1.app.isPackaged) {
    if (!env.HOME) {
      env.HOME = require$$0$1.app.getPath("home");
    }
    if (process.platform === "win32") {
      const registryPath = resolveWindowsRegistryPath$1();
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
          console.log("[skills] Merged registry PATH entries for skill scripts");
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
      const missingPaths = commonWinPaths.filter((p) => !pathSet.has(p.toLowerCase().replace(/[\\/]+$/, "")));
      if (missingPaths.length > 0) {
        env.PATH = env.PATH ? `${env.PATH};${missingPaths.join(";")}` : missingPaths.join(";");
      }
    } else {
      const userPath = resolveUserShellPath$1();
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
const isZipFile = (filePath) => path$7.extname(filePath).toLowerCase() === ".zip";
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
  const resolvedRoot = path$7.resolve(root);
  const resolvedTarget = path$7.resolve(root, target);
  if (resolvedTarget === resolvedRoot) return resolvedTarget;
  if (!resolvedTarget.startsWith(resolvedRoot + path$7.sep)) {
    throw new Error("Invalid target path");
  }
  return resolvedTarget;
};
const appendEnvPath$1 = (current, entries) => {
  const delimiter = process.platform === "win32" ? ";" : ":";
  const existing = (current || "").split(delimiter).filter(Boolean);
  const merged = [...existing];
  entries.forEach((entry) => {
    if (!entry || merged.includes(entry)) return;
    merged.push(entry);
  });
  return merged.join(delimiter);
};
const listWindowsCommandPaths$1 = (command) => {
  if (process.platform !== "win32") return [];
  try {
    const result = require$$0$2.spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
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
    path$7.join(programFiles, "Git", "cmd", "git.exe"),
    path$7.join(programFiles, "Git", "bin", "git.exe"),
    path$7.join(programFilesX86, "Git", "cmd", "git.exe"),
    path$7.join(programFilesX86, "Git", "bin", "git.exe"),
    path$7.join(localAppData, "Programs", "Git", "cmd", "git.exe"),
    path$7.join(localAppData, "Programs", "Git", "bin", "git.exe"),
    path$7.join(userProfile, "scoop", "apps", "git", "current", "cmd", "git.exe"),
    path$7.join(userProfile, "scoop", "apps", "git", "current", "bin", "git.exe"),
    "C:\\Git\\cmd\\git.exe",
    "C:\\Git\\bin\\git.exe"
  ];
  for (const candidate of installedCandidates) {
    if (candidate && fs$a.existsSync(candidate)) {
      return candidate;
    }
  }
  const whereCandidates = listWindowsCommandPaths$1("where git");
  for (const candidate of whereCandidates) {
    const normalized = candidate.trim();
    if (!normalized) continue;
    if (normalized.toLowerCase().endsWith("git.exe") && fs$a.existsSync(normalized)) {
      return normalized;
    }
  }
  const bundledRoots = require$$0$1.app.isPackaged ? [path$7.join(process.resourcesPath, "mingit")] : [path$7.join(__dirname, "..", "..", "resources", "mingit"), path$7.join(process.cwd(), "resources", "mingit")];
  for (const root of bundledRoots) {
    const bundledCandidates = [
      path$7.join(root, "cmd", "git.exe"),
      path$7.join(root, "bin", "git.exe"),
      path$7.join(root, "mingw64", "bin", "git.exe"),
      path$7.join(root, "usr", "bin", "git.exe")
    ];
    for (const candidate of bundledCandidates) {
      if (fs$a.existsSync(candidate)) {
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
  const gitDir = path$7.dirname(gitExe);
  const gitRoot = path$7.dirname(gitDir);
  const candidateDirs = [
    gitDir,
    path$7.join(gitRoot, "cmd"),
    path$7.join(gitRoot, "bin"),
    path$7.join(gitRoot, "mingw64", "bin"),
    path$7.join(gitRoot, "usr", "bin")
  ].filter((dir) => fs$a.existsSync(dir));
  env.PATH = appendEnvPath$1(env.PATH, candidateDirs);
  return { command: gitExe, env };
};
const runCommand = (command, args, options) => new Promise((resolve, reject) => {
  const child = require$$0$2.spawn(command, args, {
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
    reject(new Error(stderr.trim() || `Command failed with exit code ${code}`));
  });
});
const runScriptWithTimeout = (options) => new Promise((resolve) => {
  const startedAt = Date.now();
  const child = require$$0$2.spawn(options.command, options.args, {
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
    fs$a.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: process.platform === "win32" ? 5 : 0,
      retryDelay: process.platform === "win32" ? 200 : 0
    });
  } catch (error) {
    console.warn("[skills] Failed to cleanup temporary directory:", targetPath, error);
  }
};
const listSkillDirs = (root) => {
  if (!fs$a.existsSync(root)) return [];
  const skillFile = path$7.join(root, SKILL_FILE_NAME);
  if (fs$a.existsSync(skillFile)) {
    return [root];
  }
  const entries = fs$a.readdirSync(root);
  return entries.map((entry) => path$7.join(root, entry)).filter((entryPath) => {
    try {
      const stat = fs$a.lstatSync(entryPath);
      if (!stat.isDirectory() && !stat.isSymbolicLink()) {
        return false;
      }
      return fs$a.existsSync(path$7.join(entryPath, SKILL_FILE_NAME));
    } catch {
      return false;
    }
  });
};
const collectSkillDirsFromSource = (source) => {
  const resolved = path$7.resolve(source);
  if (fs$a.existsSync(path$7.join(resolved, SKILL_FILE_NAME))) {
    return [resolved];
  }
  const nestedRoot = path$7.join(resolved, SKILLS_DIR_NAME);
  if (fs$a.existsSync(nestedRoot) && fs$a.statSync(nestedRoot).isDirectory()) {
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
  const resolvedRoot = path$7.resolve(root);
  if (!fs$a.existsSync(resolvedRoot)) return [];
  const matchedDirs = [];
  const queue = [resolvedRoot];
  const seen = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const normalized = path$7.resolve(current);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    let stat;
    try {
      stat = fs$a.lstatSync(normalized);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    if (fs$a.existsSync(path$7.join(normalized, SKILL_FILE_NAME))) {
      matchedDirs.push(normalized);
      continue;
    }
    let entries = [];
    try {
      entries = fs$a.readdirSync(normalized);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry || entry === ".git" || entry === "node_modules") continue;
      queue.push(path$7.join(normalized, entry));
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
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2]
    };
  }
  try {
    const parsedUrl = new URL(trimmed);
    if (!["github.com", "www.github.com"].includes(parsedUrl.hostname.toLowerCase())) {
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
      const response = await require$$0$1.session.defaultSession.fetch(candidate.url, {
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
  const zipPath = path$7.join(tempRoot, "github-archive.zip");
  const extractRoot = path$7.join(tempRoot, "github-archive");
  fs$a.writeFileSync(zipPath, buffer);
  fs$a.mkdirSync(extractRoot, { recursive: true });
  await extractZip(zipPath, { dir: extractRoot });
  const extractedDirs = fs$a.readdirSync(extractRoot).map((entry) => path$7.join(extractRoot, entry)).filter((entryPath) => {
    try {
      return fs$a.statSync(entryPath).isDirectory();
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
    const url2 = new URL(source);
    return (url2.protocol === "http:" || url2.protocol === "https:") && url2.pathname.toLowerCase().endsWith(".zip");
  } catch {
    return false;
  }
};
const downloadZipUrl = async (zipUrl, tempRoot) => {
  const response = await require$$0$1.session.defaultSession.fetch(zipUrl, {
    method: "GET",
    headers: { "User-Agent": "LobsterAI Skill Downloader" }
  });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status} ${response.statusText})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const zipPath = path$7.join(tempRoot, "remote-skill.zip");
  const extractRoot = path$7.join(tempRoot, "remote-skill");
  fs$a.writeFileSync(zipPath, buffer);
  fs$a.mkdirSync(extractRoot, { recursive: true });
  await extractZip(zipPath, { dir: extractRoot });
  const extractedDirs = fs$a.readdirSync(extractRoot).map((entry) => path$7.join(extractRoot, entry)).filter((entryPath) => {
    try {
      return fs$a.statSync(entryPath).isDirectory();
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
  const startServerScript = path$7.join(skillRoot, "scripts", "start-server.sh");
  const searchScript = path$7.join(skillRoot, "scripts", "search.sh");
  const serverEntry = path$7.join(skillRoot, "dist", "server", "index.js");
  const requiredPaths = [
    startServerScript,
    searchScript,
    serverEntry,
    path$7.join(skillRoot, "node_modules", "iconv-lite", "encodings", "index.js")
  ];
  if (requiredPaths.some((requiredPath) => !fs$a.existsSync(requiredPath))) {
    return true;
  }
  try {
    const startScript = fs$a.readFileSync(startServerScript, "utf-8");
    const searchScriptContent = fs$a.readFileSync(searchScript, "utf-8");
    const serverEntryContent = fs$a.readFileSync(serverEntry, "utf-8");
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
    return path$7.resolve(require$$0$1.app.getPath("userData"), SKILLS_DIR_NAME);
  }
  /**
   * 确保目录存在
   */
  ensureSkillsRoot() {
    const root = this.getSkillsRoot();
    if (!fs$a.existsSync(root)) {
      fs$a.mkdirSync(root, { recursive: true });
    }
    return root;
  }
  /**
   * 同步技能
   */
  syncBundledSkillsToUserData() {
    if (!require$$0$1.app.isPackaged) {
      return;
    }
    console.log("[skills] syncBundledSkillsToUserData: start");
    const userRoot = this.ensureSkillsRoot();
    console.log("[skills] syncBundledSkillsToUserData: userRoot =", userRoot);
    const bundledRoot = this.getBundledSkillsRoot();
    console.log("[skills] syncBundledSkillsToUserData: bundledRoot =", bundledRoot);
    if (!bundledRoot || bundledRoot === userRoot || !fs$a.existsSync(bundledRoot)) {
      console.log("[skills] syncBundledSkillsToUserData: bundledRoot skipped (missing or same as userRoot)");
      return;
    }
    try {
      const bundledSkillDirs = listSkillDirs(bundledRoot);
      console.log("[skills] syncBundledSkillsToUserData: found", bundledSkillDirs.length, "bundled skills");
      bundledSkillDirs.forEach((dir) => {
        const id = path$7.basename(dir);
        const targetDir = path$7.join(userRoot, id);
        const targetExists = fs$a.existsSync(targetDir);
        let shouldRepair = false;
        let needsCleanCopy = false;
        if (targetExists) {
          const bundledVer = this.getSkillVersion(dir);
          if (bundledVer && compareVersions(bundledVer, this.getSkillVersion(targetDir) || "0.0.0") > 0) {
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
          console.log(`[skills] syncBundledSkillsToUserData: copying "${id}" from ${dir} to ${targetDir}`);
          let envBackup = null;
          const envPath = path$7.join(targetDir, ".env");
          if (needsCleanCopy && fs$a.existsSync(envPath)) {
            envBackup = fs$a.readFileSync(envPath);
          }
          if (needsCleanCopy) {
            fs$a.rmSync(targetDir, { recursive: true, force: true });
          }
          cpRecursiveSync(dir, targetDir, {
            dereference: true,
            force: shouldRepair
          });
          if (envBackup !== null) {
            fs$a.writeFileSync(envPath, envBackup);
          }
          console.log(`[skills] syncBundledSkillsToUserData: copied "${id}" successfully`);
          if (shouldRepair) {
            console.log(`[skills] Repaired bundled skill "${id}" in user data`);
          }
        } catch (error) {
          console.warn(`[skills] Failed to sync bundled skill "${id}":`, error);
        }
      });
      const bundledConfig = path$7.join(bundledRoot, SKILLS_CONFIG_FILE);
      const targetConfig = path$7.join(userRoot, SKILLS_CONFIG_FILE);
      if (fs$a.existsSync(bundledConfig)) {
        if (!fs$a.existsSync(targetConfig)) {
          console.log("[skills] syncBundledSkillsToUserData: copying skills.config.json");
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
    const bundledNodeModules = path$7.join(bundledDir, "node_modules");
    const targetNodeModules = path$7.join(targetDir, "node_modules");
    const targetPackageJson = path$7.join(targetDir, "package.json");
    if (!fs$a.existsSync(targetPackageJson)) {
      return true;
    }
    if (!fs$a.existsSync(bundledNodeModules)) {
      return true;
    }
    if (!fs$a.existsSync(targetNodeModules)) {
      return false;
    }
    return true;
  }
  getSkillVersion(skillDir) {
    try {
      const raw = fs$a.readFileSync(path$7.join(skillDir, SKILL_FILE_NAME), "utf8");
      const { frontmatter } = parseFrontmatter(raw);
      return typeof frontmatter.version === "string" ? frontmatter.version : typeof frontmatter.version === "number" ? String(frontmatter.version) : "";
    } catch {
      return "";
    }
  }
  mergeSkillsConfig(bundledPath, targetPath) {
    try {
      const bundled = JSON.parse(fs$a.readFileSync(bundledPath, "utf-8"));
      const target = JSON.parse(fs$a.readFileSync(targetPath, "utf-8"));
      if (!bundled.defaults || !target.defaults) return;
      let changed = false;
      for (const [id, config2] of Object.entries(bundled.defaults)) {
        if (!(id in target.defaults)) {
          target.defaults[id] = config2;
          changed = true;
        }
      }
      if (changed) {
        const tmpPath = targetPath + ".tmp";
        fs$a.writeFileSync(tmpPath, JSON.stringify(target, null, 2) + "\n", "utf-8");
        fs$a.renameSync(tmpPath, targetPath);
        console.log("[skills] mergeSkillsConfig: merged new skill entries into user config");
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
      if (!fs$a.existsSync(root)) return;
      const skillDirs = listSkillDirs(root);
      skillDirs.forEach((dir) => {
        const skill = this.parseSkillDir(dir, state, defaults, builtInSkillIds.has(path$7.basename(dir)));
        if (!skill) return;
        skillMap.set(skill.id, skill);
      });
    });
    const skills = Array.from(skillMap.values());
    skills.sort((a, b) => {
      var _a3, _b;
      const orderA = ((_a3 = defaults[a.id]) == null ? void 0 : _a3.order) ?? 999;
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
    if (id !== path$7.basename(id)) {
      throw new Error("Invalid skill id");
    }
    if (this.isBuiltInSkillId(id)) {
      throw new Error("Built-in skills cannot be deleted");
    }
    const targetDir = resolveWithin(root, id);
    if (!fs$a.existsSync(targetDir)) {
      throw new Error("Skill not found");
    }
    fs$a.rmSync(targetDir, { recursive: true, force: true });
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
      if (fs$a.existsSync(localSource)) {
        const stat = fs$a.statSync(localSource);
        if (stat.isFile()) {
          if (isZipFile(localSource)) {
            const tempRoot = fs$a.mkdtempSync(path$7.join(require$$0$1.app.getPath("temp"), "lobsterai-skill-zip-"));
            await extractZip(localSource, { dir: tempRoot });
            localSource = tempRoot;
            cleanupPath = tempRoot;
          } else if (path$7.basename(localSource) === SKILL_FILE_NAME) {
            localSource = path$7.dirname(localSource);
          } else {
            return {
              success: false,
              error: "Skill source must be a directory, zip file, or SKILL.md file"
            };
          }
        }
      } else if (isRemoteZipUrl(trimmed)) {
        const tempRoot = fs$a.mkdtempSync(path$7.join(require$$0$1.app.getPath("temp"), "lobsterai-skill-zip-"));
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
        const tempRoot = fs$a.mkdtempSync(path$7.join(require$$0$1.app.getPath("temp"), "lobsterai-skill-"));
        cleanupPath = tempRoot;
        const repoName = normalizeFolderName(normalized.repoNameHint || deriveRepoName(normalized.repoUrl));
        const clonePath = path$7.join(tempRoot, repoName);
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
              downloadedSourceRoot = await downloadGithubArchive(githubSource, tempRoot, normalized.ref);
            } catch (archiveError) {
              const gitMessage = extractErrorMessage(error);
              const archiveMessage = extractErrorMessage(archiveError);
              if (errno === "ENOENT" && process.platform === "win32") {
                throw new Error(
                  `Git executable not found. Please install Git for Windows or reinstall LobsterAI with bundled PortableGit. Archive fallback also failed: ${archiveMessage}`
                );
              }
              throw new Error(`Git clone failed: ${gitMessage}. Archive fallback failed: ${archiveMessage}`);
            }
          } else if (errno === "ENOENT" && process.platform === "win32") {
            throw new Error("Git executable not found. Please install Git for Windows or reinstall LobsterAI with bundled PortableGit.");
          } else {
            throw error;
          }
        }
        if (normalized.sourceSubpath) {
          const scopedSource = resolveWithin(downloadedSourceRoot, normalized.sourceSubpath);
          if (!fs$a.existsSync(scopedSource)) {
            return {
              success: false,
              error: `Path "${normalized.sourceSubpath}" not found in repository`
            };
          }
          const scopedStat = fs$a.statSync(scopedSource);
          if (scopedStat.isFile()) {
            if (path$7.basename(scopedSource) === SKILL_FILE_NAME) {
              localSource = path$7.dirname(scopedSource);
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
        const folderName = normalizeFolderName(path$7.basename(skillDir));
        let targetDir = resolveWithin(root, folderName);
        let suffix = 1;
        while (fs$a.existsSync(targetDir)) {
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
      if (!fs$a.existsSync(root)) return;
      try {
        this.watchers.push(fs$a.watch(root, watchHandler));
      } catch (error) {
        console.warn("[skills] Failed to watch skills root:", root, error);
      }
      const skillDirs = listSkillDirs(root);
      skillDirs.forEach((dir) => {
        try {
          this.watchers.push(fs$a.watch(dir, watchHandler));
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
    require$$0$1.BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skills:changed");
      }
    });
  }
  parseSkillDir(dir, state, defaults, isBuiltIn) {
    var _a3, _b;
    const skillFile = path$7.join(dir, SKILL_FILE_NAME);
    if (!fs$a.existsSync(skillFile)) return null;
    try {
      const raw = fs$a.readFileSync(skillFile, "utf8");
      const { frontmatter, content } = parseFrontmatter(raw);
      const name = (String(frontmatter.name || "") || path$7.basename(dir)).trim() || path$7.basename(dir);
      const description = (String(frontmatter.description || "") || extractDescription(content) || name).trim();
      const isOfficial = isTruthy(frontmatter.official) || isTruthy(frontmatter.isOfficial);
      const version2 = typeof frontmatter.version === "string" ? frontmatter.version : typeof frontmatter.version === "number" ? String(frontmatter.version) : void 0;
      const updatedAt = fs$a.statSync(skillFile).mtimeMs;
      const id = path$7.basename(dir);
      const prompt = content.trim();
      const defaultEnabled = ((_a3 = defaults[id]) == null ? void 0 : _a3.enabled) ?? true;
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
        version: version2
      };
    } catch (error) {
      console.warn("[skills] Failed to parse skill:", dir, error);
      return null;
    }
  }
  listBuiltInSkillIds() {
    const builtInRoot = this.getBundledSkillsRoot();
    if (!builtInRoot || !fs$a.existsSync(builtInRoot)) {
      return /* @__PURE__ */ new Set();
    }
    return new Set(listSkillDirs(builtInRoot).map((dir) => path$7.basename(dir)));
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
      const configPath = path$7.join(root, SKILLS_CONFIG_FILE);
      if (!fs$a.existsSync(configPath)) continue;
      try {
        const raw = fs$a.readFileSync(configPath, "utf8");
        const config2 = JSON.parse(raw);
        if (config2.defaults && typeof config2.defaults === "object") {
          for (const [id, settings] of Object.entries(config2.defaults)) {
            merged[id] = { ...merged[id], ...settings };
          }
        }
      } catch (error) {
        console.warn("[skills] Failed to load skills config:", configPath, error);
      }
    }
    return merged;
  }
  getSkillRoots(primaryRoot) {
    const resolvedPrimary = primaryRoot ?? this.getSkillsRoot();
    const roots = [resolvedPrimary];
    const claudeSkillsRoot = this.getClaudeSkillsRoot();
    if (claudeSkillsRoot && fs$a.existsSync(claudeSkillsRoot)) {
      roots.push(claudeSkillsRoot);
    }
    const appRoot = this.getBundledSkillsRoot();
    if (appRoot !== resolvedPrimary && fs$a.existsSync(appRoot)) {
      roots.push(appRoot);
    }
    return roots;
  }
  getClaudeSkillsRoot() {
    const homeDir = require$$0$1.app.getPath("home");
    return path$7.join(homeDir, CLAUDE_SKILLS_DIR_NAME, CLAUDE_SKILLS_SUBDIR);
  }
  getBundledSkillsRoot() {
    if (require$$0$1.app.isPackaged) {
      const resourcesRoot = path$7.resolve(process.resourcesPath, SKILLS_DIR_NAME);
      if (fs$a.existsSync(resourcesRoot)) {
        return resourcesRoot;
      }
      return path$7.resolve(require$$0$1.app.getAppPath(), SKILLS_DIR_NAME);
    }
    const projectRoot = path$7.resolve(__dirname, "..");
    return path$7.resolve(projectRoot, SKILLS_DIR_NAME);
  }
  getSkillConfig(skillId) {
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const envPath = path$7.join(skillDir, ".env");
      if (!fs$a.existsSync(envPath)) {
        return { success: true, config: {} };
      }
      const raw = fs$a.readFileSync(envPath, "utf8");
      const config2 = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        config2[key] = value;
      }
      return { success: true, config: config2 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read skill config"
      };
    }
  }
  setSkillConfig(skillId, config2) {
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const envPath = path$7.join(skillDir, ".env");
      const lines = Object.entries(config2).filter(([key]) => key.trim()).map(([key, value]) => `${key}=${value}`);
      fs$a.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to write skill config"
      };
    }
  }
  repairSkillFromBundled(skillId, skillPath) {
    if (!require$$0$1.app.isPackaged) return false;
    const bundledRoot = this.getBundledSkillsRoot();
    if (!bundledRoot || !fs$a.existsSync(bundledRoot)) {
      return false;
    }
    const bundledPath = path$7.join(bundledRoot, skillId);
    if (!fs$a.existsSync(bundledPath) || bundledPath === skillPath) {
      return false;
    }
    const bundledNodeModules = path$7.join(bundledPath, "node_modules");
    if (!fs$a.existsSync(bundledNodeModules)) {
      console.log(`[skills] Bundled ${skillId} does not have node_modules, skipping repair`);
      return false;
    }
    try {
      console.log(`[skills] Repairing ${skillId} from bundled resources...`);
      fs$a.cpSync(bundledPath, skillPath, {
        recursive: true,
        dereference: true,
        force: true,
        errorOnExist: false
      });
      console.log(`[skills] Repaired ${skillId} from bundled resources`);
      return true;
    } catch (error) {
      console.warn(`[skills] Failed to repair ${skillId} from bundled resources:`, error);
      return false;
    }
  }
  ensureSkillDependencies(skillDir) {
    var _a3;
    const nodeModulesPath = path$7.join(skillDir, "node_modules");
    const packageJsonPath = path$7.join(skillDir, "package.json");
    const skillId = path$7.basename(skillDir);
    console.log(`[skills] Checking dependencies for ${skillId}...`);
    console.log(`[skills]   node_modules exists: ${fs$a.existsSync(nodeModulesPath)}`);
    console.log(`[skills]   package.json exists: ${fs$a.existsSync(packageJsonPath)}`);
    console.log(`[skills]   skillDir: ${skillDir}`);
    if (fs$a.existsSync(nodeModulesPath)) {
      console.log(`[skills] Dependencies already installed for ${skillId}`);
      return { success: true };
    }
    if (!fs$a.existsSync(packageJsonPath)) {
      console.log(`[skills] No package.json found for ${skillId}, skipping install`);
      return { success: true };
    }
    if (this.repairSkillFromBundled(skillId, skillDir)) {
      if (fs$a.existsSync(nodeModulesPath)) {
        console.log(`[skills] Dependencies restored from bundled resources for ${skillId}`);
        return { success: true };
      }
    }
    const env = buildSkillEnv();
    const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === "path");
    console.log(`[skills]   PATH keys in env: ${JSON.stringify(pathKeys)}`);
    console.log(`[skills]   PATH (first 300 chars): ${(_a3 = env.PATH) == null ? void 0 : _a3.substring(0, 300)}`);
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
      const result = require$$0$2.spawnSync("npm", ["install"], {
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
        console.log(`[skills] npm install stdout: ${result.stdout.substring(0, 500)}`);
      }
      if (result.stderr) {
        console.log(`[skills] npm install stderr: ${result.stderr.substring(0, 500)}`);
      }
      if (result.status !== 0) {
        const errorMsg = result.stderr || result.stdout || "npm install failed";
        console.error(`[skills] Failed to install dependencies for ${skillId}:`, errorMsg);
        return {
          success: false,
          error: `Failed to install dependencies: ${errorMsg}`
        };
      }
      if (!fs$a.existsSync(nodeModulesPath)) {
        const errorMsg = "npm install appeared to succeed but node_modules was not created";
        console.error(`[skills] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
      console.log(`[skills] Dependencies installed successfully for ${skillId}`);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[skills] Error installing dependencies for ${skillId}:`, errorMsg);
      return {
        success: false,
        error: `Failed to install dependencies: ${errorMsg}`
      };
    }
  }
  async testEmailConnectivity(skillId, config2) {
    var _a3, _b, _c, _d;
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const depsResult = this.ensureSkillDependencies(skillDir);
      if (!depsResult.success) {
        console.error("[email-connectivity] Dependency install failed:", depsResult.error);
        return { success: false, error: depsResult.error };
      }
      const imapScript = path$7.join(skillDir, "scripts", "imap.js");
      const smtpScript = path$7.join(skillDir, "scripts", "smtp.js");
      if (!fs$a.existsSync(imapScript) || !fs$a.existsSync(smtpScript)) {
        console.error("[email-connectivity] Scripts not found:", {
          imapScript,
          smtpScript
        });
        return {
          success: false,
          error: "Email connectivity scripts not found"
        };
      }
      const safeConfig = { ...config2 };
      if (safeConfig.IMAP_PASS) safeConfig.IMAP_PASS = "***";
      if (safeConfig.SMTP_PASS) safeConfig.SMTP_PASS = "***";
      console.log("[email-connectivity] Testing with config:", JSON.stringify(safeConfig, null, 2));
      const envOverrides = Object.fromEntries(
        Object.entries(config2 ?? {}).filter(([key]) => key.trim()).map(([key, value]) => [key, String(value ?? "")])
      );
      console.log("[email-connectivity] Running IMAP test (list-mailboxes)...");
      const imapResult = await this.runSkillScriptWithEnv(skillDir, imapScript, ["list-mailboxes"], envOverrides, 2e4);
      console.log(
        "[email-connectivity] IMAP result:",
        JSON.stringify(
          {
            success: imapResult.success,
            exitCode: imapResult.exitCode,
            timedOut: imapResult.timedOut,
            durationMs: imapResult.durationMs,
            stdout: (_a3 = imapResult.stdout) == null ? void 0 : _a3.slice(0, 500),
            stderr: (_b = imapResult.stderr) == null ? void 0 : _b.slice(0, 500),
            error: imapResult.error,
            spawnErrorCode: imapResult.spawnErrorCode
          },
          null,
          2
        )
      );
      console.log("[email-connectivity] Running SMTP test (verify)...");
      const smtpResult = await this.runSkillScriptWithEnv(skillDir, smtpScript, ["verify"], envOverrides, 2e4);
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
      const verdict = checks.every((check) => check.level === "pass") ? "pass" : "fail";
      console.log("[email-connectivity] Final verdict:", verdict, "checks:", JSON.stringify(checks, null, 2));
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
    return path$7.dirname(skill.skillPath);
  }
  getScriptRuntimeCandidates() {
    const candidates = [];
    if (!require$$0$1.app.isPackaged) {
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
  const wasmPath = require$$0$1.app.isPackaged ? path$7.join(process.resourcesPath, "app.asar.unpacked/node_modules/sql.js/dist/sql-wasm.wasm") : path$7.join(require$$0$1.app.getAppPath(), "node_modules/sql.js/dist/sql-wasm.wasm");
  const buf = fs$a.readFileSync(wasmPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
const _SqliteStore = class _SqliteStore {
  // 构造函数：通过静态工厂 create 统一创建实例。
  constructor(db, dbPath) {
    // SQL.js 数据库实例。
    __publicField(this, "db");
    // SQLite 文件落盘路径。
    __publicField(this, "dbPath");
    // 键值变更事件分发器。
    __publicField(this, "emitter", new require$$4.EventEmitter());
    this.db = db;
    this.dbPath = dbPath;
  }
  // 创建并初始化存储实例（含建表与迁移）。
  static async create(userDataPath) {
    const basePath = userDataPath ?? require$$0$1.app.getPath("userData");
    const dbPath = path$7.join(basePath, DB_FILENAME);
    if (!_SqliteStore.sqlPromise) {
      const wasmBinary = loadWasmBinary();
      _SqliteStore.sqlPromise = initSqlJs({
        wasmBinary
      });
    }
    const SQL = await _SqliteStore.sqlPromise;
    let db;
    if (fs$a.existsSync(dbPath)) {
      const buffer = fs$a.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    const store2 = new _SqliteStore(db, dbPath);
    store2.initializeTables(basePath);
    return store2;
  }
  // 初始化所有业务表、索引与历史迁移逻辑。
  initializeTables(basePath) {
    var _a3, _b;
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
    this.db.run(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        transport_type TEXT NOT NULL DEFAULT 'stdio',
        config_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    try {
      const colsResult = this.db.exec("PRAGMA table_info(cowork_sessions);");
      const columns = ((_a3 = colsResult[0]) == null ? void 0 : _a3.values.map((row) => row[1])) || [];
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
      this.db.run(`UPDATE cowork_sessions SET execution_mode = 'sandbox' WHERE execution_mode = 'container';`);
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
          this.db.run("ALTER TABLE scheduled_tasks ADD COLUMN notify_platforms_json TEXT NOT NULL DEFAULT '[]'");
          this.save();
        }
      }
    } catch {
    }
    this.migrateLegacyMemoryFileToUserMemories();
    this.migrateFromElectronStore(basePath);
    this.save();
  }
  // 将内存数据库完整导出并同步写入磁盘文件。
  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs$a.writeFileSync(this.dbPath, buffer);
  }
  // 订阅指定 key 的值变更，返回取消订阅函数。
  onDidChange(key, callback) {
    const handler = (payload) => {
      if (payload.key !== key) return;
      callback(payload.newValue, payload.oldValue);
    };
    this.emitter.on("change", handler);
    return () => this.emitter.off("change", handler);
  }
  // 从 kv 表读取并反序列化指定 key 的值。
  get(key) {
    var _a3;
    const result = this.db.exec("SELECT value FROM kv WHERE key = ?", [key]);
    if (!((_a3 = result[0]) == null ? void 0 : _a3.values[0])) return void 0;
    const value = result[0].values[0][0];
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`Failed to parse store value for ${key}`, error);
      return void 0;
    }
  }
  // 向 kv 表写入指定 key 的值（不存在则插入，存在则更新）。
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
    this.emitter.emit("change", { key, newValue: value, oldValue });
  }
  // 删除 kv 表中的指定 key，并触发变更事件。
  delete(key) {
    const oldValue = this.get(key);
    this.db.run("DELETE FROM kv WHERE key = ?", [key]);
    this.save();
    this.emitter.emit("change", { key, newValue: void 0, oldValue });
  }
  // 对外暴露底层数据库实例（供协作模块直接操作）。
  getDatabase() {
    return this.db;
  }
  // 对外暴露保存函数（例如供 CoworkStore 复用）。
  getSaveFunction() {
    return () => this.save();
  }
  // 读取历史 MEMORY.md/memory.md 内容（按候选路径顺序尝试）。
  tryReadLegacyMemoryText() {
    const candidates = [
      path$7.join(process.cwd(), "MEMORY.md"),
      path$7.join(require$$0$1.app.getAppPath(), "MEMORY.md"),
      path$7.join(process.cwd(), "memory.md"),
      path$7.join(require$$0$1.app.getAppPath(), "memory.md")
    ];
    for (const candidate of candidates) {
      try {
        if (fs$a.existsSync(candidate) && fs$a.statSync(candidate).isFile()) {
          return fs$a.readFileSync(candidate, "utf8");
        }
      } catch {
      }
    }
    return "";
  }
  // 从历史记忆文本中提取条目，去重并裁剪长度。
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
      entries.push(text.length > 360 ? `${text.slice(0, 359)}…` : text);
    }
    return entries.slice(0, 200);
  }
  // 生成记忆指纹（用于去重匹配）。
  memoryFingerprint(text) {
    const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    return crypto.createHash("sha1").update(normalized).digest("hex");
  }
  // 将历史 MEMORY.md 条目迁移到 user_memories/user_memory_sources 表。
  migrateLegacyMemoryFileToUserMemories() {
    var _a3, _b, _c;
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
        const existing = this.db.exec(`SELECT id FROM user_memories WHERE fingerprint = ? AND status != 'deleted' LIMIT 1`, [fingerprint]);
        if ((_c = (_b = (_a3 = existing[0]) == null ? void 0 : _a3.values) == null ? void 0 : _b[0]) == null ? void 0 : _c[0]) {
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
  // 当 kv 为空时，从历史 electron-store(config.json) 迁移配置数据。
  migrateFromElectronStore(userDataPath) {
    var _a3, _b;
    const result = this.db.exec("SELECT COUNT(*) as count FROM kv");
    const count = (_b = (_a3 = result[0]) == null ? void 0 : _a3.values[0]) == null ? void 0 : _b[0];
    if (count > 0) return;
    const legacyPath = path$7.join(userDataPath, "config.json");
    if (!fs$a.existsSync(legacyPath)) return;
    try {
      const raw = fs$a.readFileSync(legacyPath, "utf8");
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
};
// SQL.js 初始化 Promise 缓存，避免重复初始化 WASM。
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
  var _a3;
  options = options || {};
  const rnds = options.random ?? ((_a3 = options.rng) == null ? void 0 : _a3.call(options)) ?? rng();
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
const EXPLICIT_ADD_RE = /(?:^|\n)\s*(?:请)?(?:记住|记下|保存到记忆|保存记忆|写入记忆|remember(?:\s+this|\s+that)?|store\s+(?:this|that)\s+in\s+memory)\s*[:：,，]?\s*(.+)$/gim;
const EXPLICIT_DELETE_RE = /(?:^|\n)\s*(?:请)?(?:删除记忆|从记忆中删除|忘掉|忘记这条|forget\s+this|remove\s+from\s+memory)\s*[:：,，]?\s*(.+)$/gim;
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const SMALL_TALK_RE = /^(ok|okay|thanks|thank\s+you|好的|收到|明白|行|嗯|谢谢)[.!? ]*$/i;
const SHORT_FACT_SIGNAL_RE = /(我叫|我是|我的名字是|我名字是|名字叫|我有(?!\s*(?:一个|个)?问题)|我养了|我家有|\bmy\s+name\s+is\b|\bi\s+am\b|\bi['’]?m\b|\bi\s+have\b|\bi\s+own\b)/i;
const NON_DURABLE_TOPIC_RE = /(我有\s*(?:一个|个)?问题|有个问题|报错|出现异常|exception|stack\s*trace)/i;
const PERSONAL_PROFILE_SIGNAL_RE = /(我叫|我是|我的名字是|我名字是|名字叫|我住在|我来自|我是做|我的职业|\bmy\s+name\s+is\b|\bi\s+am\b|\bi['’]?m\b|\bi\s+live\s+in\b|\bi['’]?m\s+from\b|\bi\s+work\s+as\b)/i;
const PERSONAL_OWNERSHIP_SIGNAL_RE = /(我有(?!\s*(?:一个|个)?问题)|我养了|我家有|我女儿|我儿子|我的孩子|我的小狗|我的小猫|\bi\s+have\b|\bi\s+own\b|\bmy\s+(?:daughter|son|child|dog|cat)\b)/i;
const PERSONAL_PREFERENCE_SIGNAL_RE = /(我喜欢|我偏好|我习惯|我常用|我不喜欢|我讨厌|我更喜欢|\bi\s+prefer\b|\bi\s+like\b|\bi\s+usually\b|\bi\s+often\b|\bi\s+don['’]?\s*t\s+like\b|\bi\s+hate\b)/i;
const ASSISTANT_PREFERENCE_SIGNAL_RE = /((请|以后|后续|默认|请始终|不要再|请不要|优先|务必).*(回复|回答|语言|中文|英文|格式|风格|语气|简洁|详细|代码|命名|markdown|respond|reply|language|format|style|tone))/i;
const SOURCE_STYLE_LINE_RE = /^(?:来源|source)\s*[:：]/i;
const ATTACHMENT_STYLE_LINE_RE = /^(?:输入文件|input\s*file)\s*[:：]/i;
const TRANSIENT_SIGNAL_RE = /(今天|昨日|昨天|刚刚|刚才|本周|本月|news|breaking|快讯|新闻|\b(19|20)\d{2}[./-]\d{1,2}[./-]\d{1,2}\b|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日)/i;
const REQUEST_TAIL_SPLIT_RE = /[,，。]\s*(?:请|麻烦)?你(?:帮我|帮忙|给我|为我|看下|看一下|查下|查一下)|[,，。]\s*帮我|[,，。]\s*请帮我|[,，。]\s*(?:能|可以)不能?\s*帮我|[,，。]\s*你看|[,，。]\s*请你/i;
const PROCEDURAL_CANDIDATE_RE = /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i;
const ASSISTANT_STYLE_CANDIDATE_RE = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i;
const CHINESE_QUESTION_PREFIX_RE = /^(?:请问|问下|问一下|是否|能否|可否|为什么|为何|怎么|如何|谁|什么|哪(?:里|儿|个)?|几|多少|要不要|会不会|是不是|能不能|可不可以|行不行|对不对|好不好)/u;
const ENGLISH_QUESTION_PREFIX_RE = /^(?:what|who|why|how|when|where|which|is|are|am|do|does|did|can|could|would|will|should)\b/i;
const QUESTION_INLINE_RE = /(是不是|能不能|可不可以|要不要|会不会|有没有|对不对|好不好)/i;
const QUESTION_SUFFIX_RE = /(吗|么|呢|嘛)\s*$/u;
function normalizeText$1(value) {
  return value.replace(/\s+/g, " ").trim();
}
function isQuestionLikeMemoryText(text) {
  const normalized = normalizeText$1(text).replace(/[。！!]+$/g, "").trim();
  if (!normalized) return false;
  if (/[？?]\s*$/.test(normalized)) return true;
  if (CHINESE_QUESTION_PREFIX_RE.test(normalized)) return true;
  if (ENGLISH_QUESTION_PREFIX_RE.test(normalized)) return true;
  if (QUESTION_INLINE_RE.test(normalized)) return true;
  if (QUESTION_SUFFIX_RE.test(normalized)) return true;
  return false;
}
function shouldKeepCandidate(text) {
  const trimmed = normalizeText$1(text);
  if (!trimmed) return false;
  if (trimmed.length < 6 && !SHORT_FACT_SIGNAL_RE.test(trimmed)) return false;
  if (SMALL_TALK_RE.test(trimmed)) return false;
  if (isQuestionLikeMemoryText(trimmed)) return false;
  if (ASSISTANT_STYLE_CANDIDATE_RE.test(trimmed)) return false;
  if (PROCEDURAL_CANDIDATE_RE.test(trimmed)) return false;
  return true;
}
function sanitizeImplicitCandidate(text) {
  const normalized = normalizeText$1(text);
  if (!normalized) return "";
  const tailMatch = normalized.match(REQUEST_TAIL_SPLIT_RE);
  const clipped = (tailMatch == null ? void 0 : tailMatch.index) && tailMatch.index > 0 ? normalized.slice(0, tailMatch.index) : normalized;
  return normalizeText$1(clipped.replace(/[，,；;:\-]+$/, ""));
}
function confidenceThreshold(level) {
  if (level === "strict") return 0.85;
  if (level === "relaxed") return 0.5;
  return 0.65;
}
function extractExplicit(text, action, pattern, reason) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  pattern.lastIndex = 0;
  let match = null;
  while ((match = pattern.exec(text)) !== null) {
    const raw = normalizeText$1(match[1] || "");
    if (!shouldKeepCandidate(raw)) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      action,
      text: raw,
      confidence: 0.99,
      isExplicit: true,
      reason
    });
  }
  return result;
}
function extractImplicit(options) {
  const requestedMaxImplicitAdds = Number.isFinite(options.maxImplicitAdds) ? Number(options.maxImplicitAdds) : 2;
  const maxImplicitAdds = Math.max(0, Math.min(2, Math.floor(requestedMaxImplicitAdds)));
  if (maxImplicitAdds === 0) return [];
  const threshold = confidenceThreshold(options.guardLevel);
  const strippedUser = options.userText.replace(CODE_BLOCK_RE, " ").trim();
  const strippedAssistant = options.assistantText.replace(CODE_BLOCK_RE, " ").trim();
  if (!strippedUser || !strippedAssistant) return [];
  const candidates = strippedUser.split(/[。！？!?；;\n]/g).map((line) => normalizeText$1(line)).filter(Boolean);
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rawCandidate of candidates) {
    const candidate = sanitizeImplicitCandidate(rawCandidate);
    if (!shouldKeepCandidate(candidate)) continue;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (NON_DURABLE_TOPIC_RE.test(candidate)) continue;
    if (SOURCE_STYLE_LINE_RE.test(candidate) || ATTACHMENT_STYLE_LINE_RE.test(candidate)) {
      continue;
    }
    if (TRANSIENT_SIGNAL_RE.test(candidate) && !PERSONAL_PROFILE_SIGNAL_RE.test(candidate) && !PERSONAL_OWNERSHIP_SIGNAL_RE.test(candidate) && !ASSISTANT_PREFERENCE_SIGNAL_RE.test(candidate)) {
      continue;
    }
    let confidence = 0;
    let reason = "";
    if (PERSONAL_PROFILE_SIGNAL_RE.test(candidate)) {
      confidence = 0.93;
      reason = "implicit:personal-profile";
    } else if (PERSONAL_OWNERSHIP_SIGNAL_RE.test(candidate)) {
      confidence = 0.9;
      reason = "implicit:personal-ownership";
    } else if (PERSONAL_PREFERENCE_SIGNAL_RE.test(candidate)) {
      confidence = 0.88;
      reason = "implicit:personal-preference";
    } else if (ASSISTANT_PREFERENCE_SIGNAL_RE.test(candidate)) {
      confidence = 0.86;
      reason = "implicit:assistant-preference";
    }
    if (confidence === 0) {
      continue;
    }
    if (confidence < threshold) continue;
    result.push({
      action: "add",
      text: candidate,
      confidence,
      isExplicit: false,
      reason
    });
    if (result.length >= maxImplicitAdds) break;
  }
  return result;
}
function extractTurnMemoryChanges(options) {
  const userText = (options.userText || "").trim();
  const assistantText = (options.assistantText || "").trim();
  if (!userText || !assistantText) return [];
  const explicitAdds = extractExplicit(userText, "add", EXPLICIT_ADD_RE, "explicit:add-command");
  const explicitDeletes = extractExplicit(userText, "delete", EXPLICIT_DELETE_RE, "explicit:delete-command");
  const implicitAdds = extractImplicit(options);
  const merged = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entry of [...explicitDeletes, ...explicitAdds, ...implicitAdds]) {
    const key = `${entry.action}|${entry.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}
function normalizeProviderApiFormat(format2) {
  if (format2 === "openai") {
    return "openai";
  }
  return "anthropic";
}
let proxyServer = null;
let upstreamConfig = null;
let lastProxyError = null;
function configureCoworkOpenAICompatProxy(config2) {
  var _a3;
  upstreamConfig = {
    ...config2,
    baseURL: config2.baseURL.trim(),
    apiKey: (_a3 = config2.apiKey) == null ? void 0 : _a3.trim()
  };
  lastProxyError = null;
}
function getCoworkOpenAICompatProxyBaseURL(target = "local") {
  {
    return null;
  }
}
function getInternalApiBaseURL() {
  return getCoworkOpenAICompatProxyBaseURL("local");
}
function getCoworkOpenAICompatProxyStatus() {
  return {
    running: Boolean(proxyServer),
    baseURL: getCoworkOpenAICompatProxyBaseURL(),
    hasUpstream: Boolean(upstreamConfig),
    upstreamBaseURL: (upstreamConfig == null ? void 0 : upstreamConfig.baseURL) || null,
    upstreamModel: (upstreamConfig == null ? void 0 : upstreamConfig.model) || null,
    lastError: lastProxyError
  };
}
const ZHIPU_CODING_PLAN_BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4";
const QWEN_CODING_PLAN_OPENAI_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1";
const QWEN_CODING_PLAN_ANTHROPIC_BASE_URL = "https://coding.dashscope.aliyuncs.com/apps/anthropic";
const VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding/v3";
const VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL = "https://ark.cn-beijing.volces.com/api/coding";
const MOONSHOT_CODING_PLAN_OPENAI_BASE_URL = "https://api.kimi.com/coding/v1";
const MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL = "https://api.kimi.com/coding";
let storeGetter = null;
function setStoreGetter(getter) {
  storeGetter = getter;
}
const getStore$1 = () => {
  if (!storeGetter) {
    return null;
  }
  return storeGetter();
};
function getClaudeCodePath() {
  if (require$$0$1.app.isPackaged) {
    return path$7.join(process.resourcesPath, "app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk/cli.js");
  }
  const appPath = require$$0$1.app.getAppPath();
  const rootDir = appPath.endsWith("dist-electron") ? path$7.join(appPath, "..") : appPath;
  return path$7.join(rootDir, "node_modules/@anthropic-ai/claude-agent-sdk/cli.js");
}
function getEffectiveProviderApiFormat(providerName, apiFormat) {
  const normalizedProviderName = providerName.trim().toLowerCase();
  if (normalizedProviderName === "openai" || normalizedProviderName === "gemini" || normalizedProviderName === "stepfun" || normalizedProviderName === "youdaozhiyun") {
    return "openai";
  }
  if (normalizedProviderName === "anthropic") {
    return "anthropic";
  }
  return normalizeProviderApiFormat(apiFormat);
}
function providerRequiresApiKey(providerName) {
  return providerName !== "ollama";
}
function resolveMatchedProvider(appConfig) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const providers = appConfig.providers ?? {};
  const resolveFallbackModel = () => {
    var _a4, _b2, _c2;
    for (const providerConfig of Object.values(providers)) {
      if (!(providerConfig == null ? void 0 : providerConfig.enabled)) {
        continue;
      }
      const firstModelId = (_c2 = (_b2 = (_a4 = providerConfig.models) == null ? void 0 : _a4.find((model) => model == null ? void 0 : model.id)) == null ? void 0 : _b2.id) == null ? void 0 : _c2.trim();
      if (firstModelId) {
        return firstModelId;
      }
    }
    return "";
  };
  const modelId = ((_b = (_a3 = appConfig.model) == null ? void 0 : _a3.defaultModel) == null ? void 0 : _b.trim()) || resolveFallbackModel();
  if (!modelId) {
    return {
      matched: null,
      error: "No available model configured in enabled providers."
    };
  }
  const preferredProviderName = (_d = (_c = appConfig.model) == null ? void 0 : _c.defaultModelProvider) == null ? void 0 : _d.trim();
  if (preferredProviderName) {
    const preferredProviderConfig = providers[preferredProviderName];
    const hasPreferredModel = (_e = preferredProviderConfig == null ? void 0 : preferredProviderConfig.models) == null ? void 0 : _e.some((model) => (model == null ? void 0 : model.id) === modelId);
    if ((preferredProviderConfig == null ? void 0 : preferredProviderConfig.enabled) && hasPreferredModel) {
      let apiFormat = getEffectiveProviderApiFormat(preferredProviderName, preferredProviderConfig.apiFormat);
      let baseURL = ((_f = preferredProviderConfig.baseUrl) == null ? void 0 : _f.trim()) || "";
      if (preferredProviderName === "zhipu" && preferredProviderConfig.codingPlanEnabled) {
        baseURL = ZHIPU_CODING_PLAN_BASE_URL;
        apiFormat = "openai";
      } else if (preferredProviderName === "qwen" && preferredProviderConfig.codingPlanEnabled) {
        baseURL = apiFormat === "anthropic" ? QWEN_CODING_PLAN_ANTHROPIC_BASE_URL : QWEN_CODING_PLAN_OPENAI_BASE_URL;
      } else if (preferredProviderName === "volcengine" && preferredProviderConfig.codingPlanEnabled) {
        baseURL = apiFormat === "anthropic" ? VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL : VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL;
      } else if (preferredProviderName === "moonshot" && preferredProviderConfig.codingPlanEnabled) {
        baseURL = apiFormat === "anthropic" ? MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL : MOONSHOT_CODING_PLAN_OPENAI_BASE_URL;
      }
      if (!baseURL) {
        return {
          matched: null,
          error: `Provider ${preferredProviderName} is missing base URL.`
        };
      }
      if (apiFormat === "anthropic" && providerRequiresApiKey(preferredProviderName) && !((_g = preferredProviderConfig.apiKey) == null ? void 0 : _g.trim())) {
        return {
          matched: null,
          error: `Provider ${preferredProviderName} requires API key for Anthropic-compatible mode.`
        };
      }
      return {
        matched: {
          providerName: preferredProviderName,
          providerConfig: preferredProviderConfig,
          modelId,
          apiFormat,
          baseURL
        }
      };
    }
  }
  for (const [providerName, providerConfig] of Object.entries(providers)) {
    if (!(providerConfig == null ? void 0 : providerConfig.enabled)) {
      continue;
    }
    const hasModel = (_h = providerConfig.models) == null ? void 0 : _h.some((model) => (model == null ? void 0 : model.id) === modelId);
    if (!hasModel) {
      continue;
    }
    let apiFormat = getEffectiveProviderApiFormat(providerName, providerConfig.apiFormat);
    let baseURL = ((_i = providerConfig.baseUrl) == null ? void 0 : _i.trim()) || "";
    if (providerName === "zhipu" && providerConfig.codingPlanEnabled) {
      baseURL = ZHIPU_CODING_PLAN_BASE_URL;
      apiFormat = "openai";
    } else if (providerName === "qwen" && providerConfig.codingPlanEnabled) {
      baseURL = apiFormat === "anthropic" ? QWEN_CODING_PLAN_ANTHROPIC_BASE_URL : QWEN_CODING_PLAN_OPENAI_BASE_URL;
    } else if (providerName === "volcengine" && providerConfig.codingPlanEnabled) {
      baseURL = apiFormat === "anthropic" ? VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL : VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL;
    } else if (providerName === "moonshot" && providerConfig.codingPlanEnabled) {
      baseURL = apiFormat === "anthropic" ? MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL : MOONSHOT_CODING_PLAN_OPENAI_BASE_URL;
    }
    if (!baseURL) {
      return {
        matched: null,
        error: `Provider ${providerName} is missing base URL.`
      };
    }
    if (apiFormat === "anthropic" && providerRequiresApiKey(providerName) && !((_j = providerConfig.apiKey) == null ? void 0 : _j.trim())) {
      return {
        matched: null,
        error: `Provider ${providerName} requires API key for Anthropic-compatible mode.`
      };
    }
    return {
      matched: {
        providerName,
        providerConfig,
        modelId,
        apiFormat,
        baseURL
      }
    };
  }
  return {
    matched: null,
    error: `No enabled provider found for model: ${modelId}`
  };
}
function resolveCurrentApiConfig(target = "local") {
  var _a3;
  const sqliteStore = getStore$1();
  if (!sqliteStore) {
    return {
      config: null,
      error: "Store is not initialized."
    };
  }
  const appConfig = sqliteStore.get("app_config");
  if (!appConfig) {
    return {
      config: null,
      error: "Application config not found."
    };
  }
  const { matched, error } = resolveMatchedProvider(appConfig);
  if (!matched) {
    return {
      config: null,
      error: error ?? "Failed to resolve provider configuration."
    };
  }
  const resolvedBaseURL = matched.baseURL;
  const resolvedApiKey = ((_a3 = matched.providerConfig.apiKey) == null ? void 0 : _a3.trim()) || "";
  const effectiveApiKey = matched.providerName === "ollama" && matched.apiFormat === "anthropic" && !resolvedApiKey ? "sk-ollama-local" : resolvedApiKey;
  if (matched.apiFormat === "anthropic") {
    return {
      config: {
        apiKey: effectiveApiKey,
        baseURL: resolvedBaseURL,
        model: matched.modelId,
        apiType: "anthropic"
      }
    };
  }
  const proxyStatus = getCoworkOpenAICompatProxyStatus();
  if (!proxyStatus.running) {
    return {
      config: null,
      error: "OpenAI compatibility proxy is not running."
    };
  }
  configureCoworkOpenAICompatProxy({
    baseURL: resolvedBaseURL,
    apiKey: resolvedApiKey || void 0,
    model: matched.modelId,
    provider: matched.providerName
  });
  const proxyBaseURL = getCoworkOpenAICompatProxyBaseURL(target);
  if (!proxyBaseURL) {
    return {
      config: null,
      error: "OpenAI compatibility proxy base URL is unavailable."
    };
  }
  return {
    config: {
      apiKey: resolvedApiKey || "lobsterai-openai-compat",
      baseURL: proxyBaseURL,
      model: matched.modelId,
      apiType: "openai"
    }
  };
}
function getCurrentApiConfig(target = "local") {
  return resolveCurrentApiConfig(target).config;
}
function buildEnvForConfig(config2) {
  const baseEnv = { ...process.env };
  baseEnv.ANTHROPIC_AUTH_TOKEN = config2.apiKey;
  baseEnv.ANTHROPIC_API_KEY = config2.apiKey;
  baseEnv.ANTHROPIC_BASE_URL = config2.baseURL;
  baseEnv.ANTHROPIC_MODEL = config2.model;
  return baseEnv;
}
const FACTUAL_PROFILE_RE = /(我叫|我是|我的名字|我名字|我来自|我住在|我的职业|我有(?!\s*(?:一个|个)?问题)|我养了|我喜欢|我偏好|我习惯|\bmy\s+name\s+is\b|\bi\s+am\b|\bi['’]?m\b|\bi\s+live\s+in\b|\bi['’]?m\s+from\b|\bi\s+work\s+as\b|\bi\s+have\b|\bi\s+prefer\b|\bi\s+like\b|\bi\s+usually\b)/i;
const TRANSIENT_RE = /(今天|昨日|昨天|刚刚|刚才|本周|本月|临时|暂时|这次|当前|today|yesterday|this\s+week|this\s+month|temporary|for\s+now)/i;
const PROCEDURAL_RE = /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i;
const REQUEST_STYLE_RE = /^(?:请|麻烦|帮我|请你|帮忙|请帮我|use|please|can you|could you|would you)/i;
const ASSISTANT_STYLE_RE = /((请|以后|后续|默认|请始终|不要再|请不要|优先|务必).*(回复|回答|语言|中文|英文|格式|风格|语气|简洁|详细|代码|命名|markdown|respond|reply|language|format|style|tone))/i;
const LLM_BORDERLINE_MARGIN = 0.08;
const LLM_MIN_CONFIDENCE = 0.55;
const LLM_TIMEOUT_MS = 5e3;
const LLM_CACHE_MAX_SIZE = 256;
const LLM_CACHE_TTL_MS = 10 * 60 * 1e3;
const LLM_INPUT_MAX_CHARS = 280;
const llmJudgeCache = /* @__PURE__ */ new Map();
function thresholdByGuardLevel(isExplicit, guardLevel) {
  if (isExplicit) {
    if (guardLevel === "strict") return 0.7;
    if (guardLevel === "relaxed") return 0.52;
    return 0.6;
  }
  if (guardLevel === "strict") return 0.8;
  if (guardLevel === "relaxed") return 0.62;
  return 0.72;
}
function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}
function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
function shouldCallLlmForBoundaryCase(score, threshold, reason) {
  if (reason === "empty" || reason === "question-like" || reason === "procedural-like") {
    return false;
  }
  return Math.abs(score - threshold) <= LLM_BORDERLINE_MARGIN;
}
function buildLlmCacheKey(input) {
  return `${input.guardLevel}|${input.isExplicit ? 1 : 0}|${normalizeText(input.text)}`;
}
function getCachedLlmResult(key) {
  const cached = llmJudgeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > LLM_CACHE_TTL_MS) {
    llmJudgeCache.delete(key);
    return null;
  }
  return cached.value;
}
function setCachedLlmResult(key, value) {
  llmJudgeCache.set(key, { value, createdAt: Date.now() });
  while (llmJudgeCache.size > LLM_CACHE_MAX_SIZE) {
    const oldestKey = llmJudgeCache.keys().next().value;
    if (!oldestKey || typeof oldestKey !== "string") break;
    llmJudgeCache.delete(oldestKey);
  }
}
function scoreMemoryText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return { score: 0, reason: "empty" };
  if (isQuestionLikeMemoryText(normalized)) {
    return { score: 0.05, reason: "question-like" };
  }
  let score = 0.5;
  let strongestReason = "neutral";
  if (FACTUAL_PROFILE_RE.test(normalized)) {
    score += 0.28;
    strongestReason = "factual-personal";
  }
  if (ASSISTANT_STYLE_RE.test(normalized)) {
    score += 0.1;
    strongestReason = strongestReason === "neutral" ? "assistant-preference" : strongestReason;
  }
  if (REQUEST_STYLE_RE.test(normalized)) {
    score -= 0.14;
    if (strongestReason === "neutral") strongestReason = "request-like";
  }
  if (TRANSIENT_RE.test(normalized)) {
    score -= 0.18;
    if (strongestReason === "neutral") strongestReason = "transient-like";
  }
  if (PROCEDURAL_RE.test(normalized)) {
    score -= 0.4;
    strongestReason = "procedural-like";
  }
  if (normalized.length < 6) {
    score -= 0.2;
  } else if (normalized.length <= 120) {
    score += 0.06;
  } else if (normalized.length > 240) {
    score -= 0.08;
  }
  return { score: clamp01(score), reason: strongestReason };
}
function buildAnthropicMessagesUrl$1(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (!normalized) {
    return "/v1/messages";
  }
  if (normalized.endsWith("/v1/messages")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/messages`;
  }
  return `${normalized}/v1/messages`;
}
function extractTextFromAnthropicResponse$1(payload) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload;
  const content = record.content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (!item || typeof item !== "object") return "";
      const block = item;
      return typeof block.text === "string" ? block.text : "";
    }).filter(Boolean).join("\n").trim();
  }
  if (typeof content === "string") return content.trim();
  if (typeof record.output_text === "string") return record.output_text.trim();
  return "";
}
function parseLlmJudgePayload(text) {
  var _a3;
  if (!text.trim()) return null;
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = ((_a3 = fenced == null ? void 0 : fenced[1]) == null ? void 0 : _a3.trim()) || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    const parsed = JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    const acceptedRaw = parsed.accepted;
    const decisionRaw = parsed.decision;
    const confidenceRaw = parsed.confidence;
    const reasonRaw = parsed.reason;
    const accepted = typeof acceptedRaw === "boolean" ? acceptedRaw : typeof decisionRaw === "string" ? /(accept|allow|yes|true|pass)/i.test(decisionRaw) : false;
    const confidence = clamp01(
      typeof confidenceRaw === "number" ? confidenceRaw : typeof confidenceRaw === "string" ? Number(confidenceRaw) : 0
    );
    const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "llm";
    return { accepted, confidence, reason };
  } catch {
    return null;
  }
}
async function judgeWithLlm(input, ruleScore, threshold, ruleReason) {
  const { config: config2 } = resolveCurrentApiConfig();
  if (!config2) return null;
  const url2 = buildAnthropicMessagesUrl$1(config2.baseURL);
  const normalizedText = normalizeText(input.text).slice(0, LLM_INPUT_MAX_CHARS);
  if (!normalizedText) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const systemPrompt = [
    "You classify whether a sentence is durable long-term user memory.",
    "Accept only stable personal facts or stable assistant preferences.",
    "Reject questions, temporary context, one-off tasks, and procedural command text.",
    'Return JSON only: {"accepted":boolean,"confidence":number,"reason":string}'
  ].join(" ");
  const userPrompt = JSON.stringify({
    text: normalizedText,
    is_explicit: input.isExplicit,
    guard_level: input.guardLevel,
    rule_score: Number(ruleScore.toFixed(3)),
    threshold: Number(threshold.toFixed(3)),
    rule_reason: ruleReason
  });
  try {
    const response = await fetch(url2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config2.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config2.model,
        max_tokens: 120,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const text = extractTextFromAnthropicResponse$1(payload);
    const parsed = parseLlmJudgePayload(text);
    if (!parsed || parsed.confidence < LLM_MIN_CONFIDENCE) {
      return null;
    }
    return {
      accepted: parsed.accepted,
      score: parsed.confidence,
      reason: `llm:${parsed.reason || "boundary"}`,
      source: "llm"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function judgeMemoryCandidate(input) {
  const { score, reason } = scoreMemoryText(input.text);
  const threshold = thresholdByGuardLevel(input.isExplicit, input.guardLevel);
  const ruleResult = {
    accepted: score >= threshold,
    score,
    reason,
    source: "rule"
  };
  if (!shouldCallLlmForBoundaryCase(score, threshold, reason)) {
    return ruleResult;
  }
  if (!input.llmEnabled) {
    return ruleResult;
  }
  const cacheKey = buildLlmCacheKey(input);
  const cached = getCachedLlmResult(cacheKey);
  if (cached) {
    return cached;
  }
  const llmResult = await judgeWithLlm(input, score, threshold, reason);
  if (!llmResult) {
    return ruleResult;
  }
  setCachedLlmResult(cacheKey, llmResult);
  return llmResult;
}
const getDefaultWorkingDirectory = () => {
  return path$7.join(require$$1$1.homedir(), "lobsterai", "project");
};
const TASK_WORKSPACE_CONTAINER_DIR$1 = ".lobsterai-tasks";
const normalizeRecentWorkspacePath = (cwd) => {
  const resolved = path$7.resolve(cwd);
  const marker = `${path$7.sep}${TASK_WORKSPACE_CONTAINER_DIR$1}${path$7.sep}`;
  const markerIndex = resolved.lastIndexOf(marker);
  if (markerIndex > 0) {
    return resolved.slice(0, markerIndex);
  }
  return resolved;
};
const DEFAULT_MEMORY_ENABLED = true;
const DEFAULT_MEMORY_IMPLICIT_UPDATE_ENABLED = true;
const DEFAULT_MEMORY_LLM_JUDGE_ENABLED = false;
const DEFAULT_MEMORY_GUARD_LEVEL = "strict";
const DEFAULT_MEMORY_USER_MEMORIES_MAX_ITEMS = 12;
const MIN_MEMORY_USER_MEMORIES_MAX_ITEMS$1 = 1;
const MAX_MEMORY_USER_MEMORIES_MAX_ITEMS$1 = 60;
const MEMORY_NEAR_DUPLICATE_MIN_SCORE = 0.82;
const MEMORY_PROCEDURAL_TEXT_RE$1 = /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i;
const MEMORY_ASSISTANT_STYLE_TEXT_RE$1 = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i;
function normalizeMemoryGuardLevel(value) {
  if (value === "strict" || value === "standard" || value === "relaxed") return value;
  return DEFAULT_MEMORY_GUARD_LEVEL;
}
function parseBooleanConfig(value, fallback) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}
function clampMemoryUserMemoriesMaxItems(value) {
  if (!Number.isFinite(value)) return DEFAULT_MEMORY_USER_MEMORIES_MAX_ITEMS;
  return Math.max(MIN_MEMORY_USER_MEMORIES_MAX_ITEMS$1, Math.min(MAX_MEMORY_USER_MEMORIES_MAX_ITEMS$1, Math.floor(value)));
}
function normalizeMemoryText(value) {
  return value.replace(/\s+/g, " ").trim();
}
function extractConversationSearchTerms(value) {
  const normalized = normalizeMemoryText(value).toLowerCase();
  if (!normalized) return [];
  const terms = [];
  const seen = /* @__PURE__ */ new Set();
  const addTerm = (term) => {
    const normalizedTerm = normalizeMemoryText(term).toLowerCase();
    if (!normalizedTerm) return;
    if (/^[a-z0-9]$/i.test(normalizedTerm)) return;
    if (seen.has(normalizedTerm)) return;
    seen.add(normalizedTerm);
    terms.push(normalizedTerm);
  };
  addTerm(normalized);
  const tokens = normalized.split(/[\s,，、|/\\;；]+/g).map((token) => token.replace(/^['"`]+|['"`]+$/g, "").trim()).filter(Boolean);
  for (const token of tokens) {
    addTerm(token);
    if (terms.length >= 8) break;
  }
  return terms.slice(0, 8);
}
function normalizeMemoryMatchKey(value) {
  return normalizeMemoryText(value).toLowerCase().replace(/[\u0000-\u001f]/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function normalizeMemorySemanticKey(value) {
  const key = normalizeMemoryMatchKey(value);
  if (!key) return "";
  return key.replace(/^(?:the user|user|i am|i m|i|my|me)\s+/i, "").replace(/^(?:该用户|这个用户|用户|本人|我的|我们|咱们|咱|我|你的|你)\s*/u, "").replace(/\s+/g, " ").trim();
}
function buildTokenFrequencyMap(value) {
  const tokens = value.split(/\s+/g).map((token) => token.trim()).filter(Boolean);
  const map2 = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    map2.set(token, (map2.get(token) || 0) + 1);
  }
  return map2;
}
function scoreTokenOverlap(left, right) {
  const leftMap = buildTokenFrequencyMap(left);
  const rightMap = buildTokenFrequencyMap(right);
  if (leftMap.size === 0 || rightMap.size === 0) return 0;
  let leftCount = 0;
  let rightCount = 0;
  let intersection2 = 0;
  for (const count of leftMap.values()) leftCount += count;
  for (const count of rightMap.values()) rightCount += count;
  for (const [token, leftValue] of leftMap.entries()) {
    intersection2 += Math.min(leftValue, rightMap.get(token) || 0);
  }
  const denominator = Math.min(leftCount, rightCount);
  if (denominator <= 0) return 0;
  return intersection2 / denominator;
}
function buildCharacterBigramMap(value) {
  const compact = value.replace(/\s+/g, "").trim();
  if (!compact) return /* @__PURE__ */ new Map();
  if (compact.length <= 1) return /* @__PURE__ */ new Map([[compact, 1]]);
  const map2 = /* @__PURE__ */ new Map();
  for (let index2 = 0; index2 < compact.length - 1; index2 += 1) {
    const gram = compact.slice(index2, index2 + 2);
    map2.set(gram, (map2.get(gram) || 0) + 1);
  }
  return map2;
}
function scoreCharacterBigramDice(left, right) {
  const leftMap = buildCharacterBigramMap(left);
  const rightMap = buildCharacterBigramMap(right);
  if (leftMap.size === 0 || rightMap.size === 0) return 0;
  let leftCount = 0;
  let rightCount = 0;
  let intersection2 = 0;
  for (const count of leftMap.values()) leftCount += count;
  for (const count of rightMap.values()) rightCount += count;
  for (const [gram, leftValue] of leftMap.entries()) {
    intersection2 += Math.min(leftValue, rightMap.get(gram) || 0);
  }
  const denominator = leftCount + rightCount;
  if (denominator <= 0) return 0;
  return 2 * intersection2 / denominator;
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
function isMeaningfulDeleteFragment(value) {
  if (!value) return false;
  const tokens = value.split(/\s+/g).filter(Boolean);
  if (tokens.length >= 2) return true;
  if (/[\u3400-\u9fff]/u.test(value)) return value.length >= 4;
  return value.length >= 6;
}
function includesAsBoundedPhrase(target, fragment) {
  if (!target || !fragment) return false;
  const paddedTarget = ` ${target} `;
  const paddedFragment = ` ${fragment} `;
  if (paddedTarget.includes(paddedFragment)) {
    return true;
  }
  if (/[\u3400-\u9fff]/u.test(fragment) && !fragment.includes(" ")) {
    return target.includes(fragment);
  }
  return false;
}
function scoreDeleteMatch(targetKey, queryKey) {
  if (!targetKey || !queryKey) return 0;
  if (targetKey === queryKey) {
    return 1e3 + queryKey.length;
  }
  if (!isMeaningfulDeleteFragment(queryKey)) {
    return 0;
  }
  if (!includesAsBoundedPhrase(targetKey, queryKey)) {
    return 0;
  }
  return 100 + Math.min(targetKey.length, queryKey.length);
}
function buildMemoryFingerprint(text) {
  const key = normalizeMemoryMatchKey(text);
  return crypto.createHash("sha1").update(key).digest("hex");
}
function truncate(value, maxChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1)}…`;
}
function parseTimeToMs(input) {
  if (!input) return null;
  const timestamp2 = Date.parse(input);
  if (!Number.isFinite(timestamp2)) return null;
  return timestamp2;
}
function shouldAutoDeleteMemoryText(text) {
  const normalized = normalizeMemoryText(text);
  if (!normalized) return false;
  return MEMORY_ASSISTANT_STYLE_TEXT_RE$1.test(normalized) || MEMORY_PROCEDURAL_TEXT_RE$1.test(normalized) || isQuestionLikeMemoryText(normalized);
}
let cachedDefaultSystemPrompt = null;
const getDefaultSystemPrompt = () => {
  if (cachedDefaultSystemPrompt !== null) {
    return cachedDefaultSystemPrompt;
  }
  try {
    const promptPath = path$7.join(require$$0$1.app.getAppPath(), "sandbox", "agent-runner", "AGENT_SYSTEM_PROMPT.md");
    cachedDefaultSystemPrompt = fs$a.readFileSync(promptPath, "utf-8");
  } catch (error) {
    console.warn("Failed to load default system prompt:", error);
    cachedDefaultSystemPrompt = "";
  }
  return cachedDefaultSystemPrompt;
};
class CoworkStore {
  // `saveDb` 由外部注入，Store 只负责在写操作后调用它。
  constructor(db, saveDb) {
    __publicField(this, "db");
    __publicField(this, "saveDb");
    this.db = db;
    this.saveDb = saveDb;
  }
  // 基础查询工具：取单行并映射成普通对象。
  getOne(sql, params = []) {
    var _a3;
    const result = this.db.exec(sql, params);
    if (!((_a3 = result[0]) == null ? void 0 : _a3.values[0])) return void 0;
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    return row;
  }
  // 基础查询工具：取多行并映射成普通对象数组。
  getAll(sql, params = []) {
    var _a3;
    const result = this.db.exec(sql, params);
    if (!((_a3 = result[0]) == null ? void 0 : _a3.values)) return [];
    const columns = result[0].columns;
    return result[0].values.map((values) => {
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i];
      });
      return row;
    });
  }
  // ===== 会话相关 =====
  // 创建新会话，并写入初始运行环境信息。
  createSession(title, cwd, systemPrompt = "", executionMode = "local", activeSkillIds = []) {
    const id = v4();
    const now = Date.now();
    this.db.run(
      `
      INSERT INTO cowork_sessions (id, title, claude_session_id, status, cwd, system_prompt, execution_mode, active_skill_ids, pinned, created_at, updated_at)
      VALUES (?, ?, NULL, 'idle', ?, ?, ?, ?, 0, ?, ?)
    `,
      [id, title, cwd, systemPrompt, executionMode, JSON.stringify(activeSkillIds), now, now]
    );
    this.saveDb();
    return {
      id,
      title,
      claudeSessionId: null,
      status: "idle",
      pinned: false,
      cwd,
      systemPrompt,
      executionMode,
      activeSkillIds,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  }
  // 读取单个会话，同时把该会话的消息一并装配回来。
  getSession(id) {
    const row = this.getOne(
      `
      SELECT id, title, claude_session_id, status, pinned, cwd, system_prompt, execution_mode, active_skill_ids, created_at, updated_at
      FROM cowork_sessions
      WHERE id = ?
    `,
      [id]
    );
    if (!row) return null;
    const messages = this.getSessionMessages(id);
    let activeSkillIds = [];
    if (row.active_skill_ids) {
      try {
        activeSkillIds = JSON.parse(row.active_skill_ids);
      } catch {
        activeSkillIds = [];
      }
    }
    return {
      id: row.id,
      title: row.title,
      claudeSessionId: row.claude_session_id,
      status: row.status,
      pinned: Boolean(row.pinned),
      cwd: row.cwd,
      systemPrompt: row.system_prompt,
      executionMode: row.execution_mode || "local",
      activeSkillIds,
      messages,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  // 局部更新会话，只修改显式传入的字段。
  updateSession(id, updates) {
    const now = Date.now();
    const setClauses = ["updated_at = ?"];
    const values = [now];
    if (updates.title !== void 0) {
      setClauses.push("title = ?");
      values.push(updates.title);
    }
    if (updates.claudeSessionId !== void 0) {
      setClauses.push("claude_session_id = ?");
      values.push(updates.claudeSessionId);
    }
    if (updates.status !== void 0) {
      setClauses.push("status = ?");
      values.push(updates.status);
    }
    if (updates.cwd !== void 0) {
      setClauses.push("cwd = ?");
      values.push(updates.cwd);
    }
    if (updates.systemPrompt !== void 0) {
      setClauses.push("system_prompt = ?");
      values.push(updates.systemPrompt);
    }
    if (updates.executionMode !== void 0) {
      setClauses.push("execution_mode = ?");
      values.push(updates.executionMode);
    }
    values.push(id);
    this.db.run(
      `
      UPDATE cowork_sessions
      SET ${setClauses.join(", ")}
      WHERE id = ?
    `,
      values
    );
    this.saveDb();
  }
  // 删除会话前先让它关联的 memory source 失活，避免留下悬挂来源。
  deleteSession(id) {
    this.markMemorySourcesInactiveBySession(id);
    this.db.run("DELETE FROM cowork_sessions WHERE id = ?", [id]);
    this.markOrphanImplicitMemoriesStale();
    this.saveDb();
  }
  // 批量删除版本，逻辑与 deleteSession 一致。
  deleteSessions(ids) {
    if (ids.length === 0) return;
    for (const id of ids) {
      this.markMemorySourcesInactiveBySession(id);
    }
    const placeholders = ids.map(() => "?").join(",");
    this.db.run(`DELETE FROM cowork_sessions WHERE id IN (${placeholders})`, ids);
    this.markOrphanImplicitMemoriesStale();
    this.saveDb();
  }
  // 置顶只影响排序，不影响会话内容。
  setSessionPinned(id, pinned) {
    this.db.run("UPDATE cowork_sessions SET pinned = ? WHERE id = ?", [pinned ? 1 : 0, id]);
    this.saveDb();
  }
  // 列表页只需要摘要，不需要把消息正文全部加载出来。
  listSessions() {
    const rows = this.getAll(`
      SELECT id, title, status, pinned, created_at, updated_at
      FROM cowork_sessions
      ORDER BY pinned DESC, updated_at DESC
    `);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      pinned: Boolean(row.pinned),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  // 启动时把异常留在 running 的旧会话重置成 idle，避免 UI 一直显示“运行中”。
  resetRunningSessions() {
    var _a3, _b;
    const now = Date.now();
    this.db.run(
      `
      UPDATE cowork_sessions
      SET status = 'idle', updated_at = ?
      WHERE status = 'running'
    `,
      [now]
    );
    this.saveDb();
    const changes = (_b = (_a3 = this.db).getRowsModified) == null ? void 0 : _b.call(_a3);
    return typeof changes === "number" ? changes : 0;
  }
  // 最近目录列表会做归一化和去重，避免 `.lobsterai-tasks` 子目录污染结果。
  listRecentCwds(limit = 8) {
    const rows = this.getAll(
      `
      SELECT cwd, updated_at
      FROM cowork_sessions
      WHERE cwd IS NOT NULL AND TRIM(cwd) != ''
      ORDER BY updated_at DESC
      LIMIT ?
    `,
      [Math.max(limit * 8, limit)]
    );
    const deduped = [];
    const seen = /* @__PURE__ */ new Set();
    for (const row of rows) {
      const normalized = normalizeRecentWorkspacePath(row.cwd);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      deduped.push(normalized);
      if (deduped.length >= limit) {
        break;
      }
    }
    return deduped;
  }
  // ===== 消息相关 =====
  // 按稳定顺序取出整个会话的消息流。sequence 优先，created_at / ROWID 兜底。
  getSessionMessages(sessionId) {
    const rows = this.getAll(
      `
      SELECT id, type, content, metadata, created_at, sequence
      FROM cowork_messages
      WHERE session_id = ?
      ORDER BY
        COALESCE(sequence, created_at) ASC,
        created_at ASC,
        ROWID ASC
    `,
      [sessionId]
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      timestamp: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : void 0
    }));
  }
  // 追加一条消息，并同步刷新会话更新时间。
  addMessage(sessionId, message) {
    var _a3, _b;
    const id = v4();
    const now = Date.now();
    const sequenceRow = this.db.exec(
      `
      SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq
      FROM cowork_messages
      WHERE session_id = ?
    `,
      [sessionId]
    );
    const sequence = ((_b = (_a3 = sequenceRow[0]) == null ? void 0 : _a3.values[0]) == null ? void 0 : _b[0]) || 1;
    this.db.run(
      `
      INSERT INTO cowork_messages (id, session_id, type, content, metadata, created_at, sequence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [id, sessionId, message.type, message.content, message.metadata ? JSON.stringify(message.metadata) : null, now, sequence]
    );
    this.db.run("UPDATE cowork_sessions SET updated_at = ? WHERE id = ?", [now, sessionId]);
    this.saveDb();
    return {
      id,
      type: message.type,
      content: message.content,
      timestamp: now,
      metadata: message.metadata
    };
  }
  // 更新已有消息，常用于 assistant 流式输出过程中的增量刷新。
  updateMessage(sessionId, messageId, updates) {
    const setClauses = [];
    const values = [];
    if (updates.content !== void 0) {
      setClauses.push("content = ?");
      values.push(updates.content);
    }
    if (updates.metadata !== void 0) {
      setClauses.push("metadata = ?");
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }
    if (setClauses.length === 0) return;
    values.push(messageId);
    values.push(sessionId);
    this.db.run(
      `
      UPDATE cowork_messages
      SET ${setClauses.join(", ")}
      WHERE id = ? AND session_id = ?
    `,
      values
    );
    this.saveDb();
  }
  // ===== 配置相关 =====
  // 读取 cowork 全局配置；缺失项回落到默认值。
  getConfig() {
    const workingDirRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", ["workingDirectory"]);
    const executionModeRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", ["executionMode"]);
    const memoryEnabledRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", ["memoryEnabled"]);
    const memoryImplicitUpdateEnabledRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", [
      "memoryImplicitUpdateEnabled"
    ]);
    const memoryLlmJudgeEnabledRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", ["memoryLlmJudgeEnabled"]);
    const memoryGuardLevelRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", ["memoryGuardLevel"]);
    const memoryUserMemoriesMaxItemsRow = this.getOne("SELECT value FROM cowork_config WHERE key = ?", [
      "memoryUserMemoriesMaxItems"
    ]);
    const normalizedExecutionMode = (executionModeRow == null ? void 0 : executionModeRow.value) === "container" ? "sandbox" : executionModeRow == null ? void 0 : executionModeRow.value;
    return {
      workingDirectory: (workingDirRow == null ? void 0 : workingDirRow.value) || getDefaultWorkingDirectory(),
      systemPrompt: getDefaultSystemPrompt(),
      executionMode: normalizedExecutionMode || "local",
      memoryEnabled: parseBooleanConfig(memoryEnabledRow == null ? void 0 : memoryEnabledRow.value, DEFAULT_MEMORY_ENABLED),
      memoryImplicitUpdateEnabled: parseBooleanConfig(memoryImplicitUpdateEnabledRow == null ? void 0 : memoryImplicitUpdateEnabledRow.value, DEFAULT_MEMORY_IMPLICIT_UPDATE_ENABLED),
      memoryLlmJudgeEnabled: parseBooleanConfig(memoryLlmJudgeEnabledRow == null ? void 0 : memoryLlmJudgeEnabledRow.value, DEFAULT_MEMORY_LLM_JUDGE_ENABLED),
      memoryGuardLevel: normalizeMemoryGuardLevel(memoryGuardLevelRow == null ? void 0 : memoryGuardLevelRow.value),
      memoryUserMemoriesMaxItems: clampMemoryUserMemoriesMaxItems(Number(memoryUserMemoriesMaxItemsRow == null ? void 0 : memoryUserMemoriesMaxItemsRow.value))
    };
  }
  // 局部写配置，统一使用 UPSERT，兼容新旧数据库。
  setConfig(config2) {
    const now = Date.now();
    if (config2.workingDirectory !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('workingDirectory', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config2.workingDirectory, now]
      );
    }
    if (config2.executionMode !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('executionMode', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config2.executionMode, now]
      );
    }
    if (config2.memoryEnabled !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryEnabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config2.memoryEnabled ? "1" : "0", now]
      );
    }
    if (config2.memoryImplicitUpdateEnabled !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryImplicitUpdateEnabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config2.memoryImplicitUpdateEnabled ? "1" : "0", now]
      );
    }
    if (config2.memoryLlmJudgeEnabled !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryLlmJudgeEnabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config2.memoryLlmJudgeEnabled ? "1" : "0", now]
      );
    }
    if (config2.memoryGuardLevel !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryGuardLevel', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [normalizeMemoryGuardLevel(config2.memoryGuardLevel), now]
      );
    }
    if (config2.memoryUserMemoriesMaxItems !== void 0) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryUserMemoriesMaxItems', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [String(clampMemoryUserMemoriesMaxItems(config2.memoryUserMemoriesMaxItems)), now]
      );
    }
    this.saveDb();
  }
  // app 语言仍然放在通用 kv 表，这里只是提供一个便捷读取入口。
  getAppLanguage() {
    const row = this.getOne("SELECT value FROM kv WHERE key = ?", ["app_config"]);
    if (!(row == null ? void 0 : row.value)) {
      return "zh";
    }
    try {
      const config2 = JSON.parse(row.value);
      return config2.language === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  }
  // ===== 用户记忆相关 =====
  // 把数据库 row 映射成对外的领域对象，并顺手做数字 / 状态兜底。
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
  // 为一条记忆追加来源链路，用于回溯它来自哪个会话、哪条消息。
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
  /**
   * 记忆写入核心入口：
   * 1. 归一化文本
   * 2. 先按 fingerprint 精确去重
   * 3. 再按语义相似度做近重复合并
   * 4. 命中就“复活并更新”，否则新建
   */
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
  // 按状态、关键字和分页列出记忆，主要给设置页和调试面板用。
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
  // 显式创建一条记忆，属于直接写入入口。
  createUserMemory(input) {
    const result = this.createOrReviveUserMemory(input);
    this.saveDb();
    return result.memory;
  }
  // 直接编辑单条记忆，不做抽取和判重。
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
  // 软删除记忆，并把它的所有来源全部置为 inactive。
  deleteUserMemory(id) {
    var _a3, _b;
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
    return (((_b = (_a3 = this.db).getRowsModified) == null ? void 0 : _b.call(_a3)) || 0) > 0;
  }
  // 聚合统计信息，方便 UI 展示 created / stale / deleted / explicit / implicit。
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
  // 自动清掉明显不是“用户画像”的记忆，例如命令、问题句和助手话术。
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
  // 某个会话被删掉后，它挂过来的 source 也应该全部失效。
  markMemorySourcesInactiveBySession(sessionId) {
    this.db.run(
      `
      UPDATE user_memory_sources
      SET is_active = 0
      WHERE session_id = ? AND is_active = 1
    `,
      [sessionId]
    );
  }
  // 失去所有 active source 的隐式记忆会降级为 stale。
  markOrphanImplicitMemoriesStale() {
    const now = Date.now();
    this.db.run(
      `
      UPDATE user_memories
      SET status = 'stale', updated_at = ?
      WHERE is_explicit = 0
        AND status = 'created'
        AND NOT EXISTS (
          SELECT 1
          FROM user_memory_sources s
          WHERE s.memory_id = user_memories.id AND s.is_active = 1
        )
    `,
      [now]
    );
  }
  /**
   * 处理一整轮对话带来的记忆变更：
   * - 从 user / assistant 文本中抽取 add / delete 候选
   * - add 候选先过 judge，再写入或合并
   * - delete 候选按模糊匹配找到目标并软删除
   * - 最后把失去来源的隐式记忆降为 stale
   */
  async applyTurnMemoryUpdates(options) {
    const result = {
      totalChanges: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      judgeRejected: 0,
      llmReviewed: 0,
      skipped: 0
    };
    const extracted = extractTurnMemoryChanges({
      userText: options.userText,
      assistantText: options.assistantText,
      guardLevel: options.guardLevel,
      maxImplicitAdds: options.implicitEnabled ? 2 : 0
    });
    result.totalChanges = extracted.length;
    for (const change of extracted) {
      if (change.action === "add") {
        if (!options.implicitEnabled && !change.isExplicit) {
          result.skipped += 1;
          continue;
        }
        const judge = await judgeMemoryCandidate({
          text: change.text,
          isExplicit: change.isExplicit,
          guardLevel: options.guardLevel,
          llmEnabled: options.memoryLlmJudgeEnabled
        });
        if (judge.source === "llm") {
          result.llmReviewed += 1;
        }
        if (!judge.accepted) {
          result.judgeRejected += 1;
          result.skipped += 1;
          continue;
        }
        const write = this.createOrReviveUserMemory({
          text: change.text,
          confidence: change.confidence,
          isExplicit: change.isExplicit,
          source: {
            role: "user",
            sessionId: options.sessionId,
            messageId: options.userMessageId
          }
        });
        if (!change.isExplicit && options.assistantMessageId) {
          this.addMemorySource(write.memory.id, {
            role: "assistant",
            sessionId: options.sessionId,
            messageId: options.assistantMessageId
          });
        }
        if (write.created) result.created += 1;
        else if (write.updated) result.updated += 1;
        else result.skipped += 1;
        continue;
      }
      const key = normalizeMemoryMatchKey(change.text);
      if (!key) {
        result.skipped += 1;
        continue;
      }
      const candidates = this.listUserMemories({ status: "all", includeDeleted: false, limit: 100 });
      let target = null;
      let bestScore = 0;
      for (const entry of candidates) {
        const currentKey = normalizeMemoryMatchKey(entry.text);
        if (!currentKey) continue;
        const score = scoreDeleteMatch(currentKey, key);
        if (score <= bestScore) continue;
        bestScore = score;
        target = entry;
      }
      if (!target) {
        result.skipped += 1;
        continue;
      }
      const deleted = this.deleteUserMemory(target.id);
      if (deleted) result.deleted += 1;
      else result.skipped += 1;
    }
    this.markOrphanImplicitMemoriesStale();
    this.saveDb();
    return result;
  }
  // ===== 检索相关 =====
  // 给搜索结果或最近会话补一条最后的 user / assistant 摘要。
  getLatestMessageByType(sessionId, type2) {
    const row = this.getOne(
      `
      SELECT content
      FROM cowork_messages
      WHERE session_id = ? AND type = ?
      ORDER BY created_at DESC, ROWID DESC
      LIMIT 1
    `,
      [sessionId, type2]
    );
    return truncate(((row == null ? void 0 : row.content) || "").replace(/\s+/g, " ").trim(), 280);
  }
  // 按消息正文做关键词搜索，再按 session 聚合成展示记录。
  conversationSearch(options) {
    const terms = extractConversationSearchTerms(options.query);
    if (terms.length === 0) return [];
    const maxResults = Math.max(1, Math.min(10, Math.floor(options.maxResults ?? 5)));
    const beforeMs = parseTimeToMs(options.before);
    const afterMs = parseTimeToMs(options.after);
    const likeClauses = terms.map(() => "LOWER(m.content) LIKE ?");
    const clauses = ["m.type IN ('user', 'assistant')", `(${likeClauses.join(" OR ")})`];
    const params = terms.map((term) => `%${term}%`);
    if (beforeMs !== null) {
      clauses.push("m.created_at < ?");
      params.push(beforeMs);
    }
    if (afterMs !== null) {
      clauses.push("m.created_at > ?");
      params.push(afterMs);
    }
    const rows = this.getAll(
      `
      SELECT m.session_id, s.title, s.updated_at, m.type, m.content, m.created_at
      FROM cowork_messages m
      INNER JOIN cowork_sessions s ON s.id = m.session_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY m.created_at DESC
      LIMIT ?
    `,
      [...params, maxResults * 40]
    );
    const bySession = /* @__PURE__ */ new Map();
    for (const row of rows) {
      if (!row.session_id) continue;
      let current = bySession.get(row.session_id);
      if (!current) {
        current = {
          sessionId: row.session_id,
          title: row.title || "Untitled",
          updatedAt: Number(row.updated_at) || 0,
          url: `https://claude.ai/chat/${row.session_id}`,
          human: "",
          assistant: ""
        };
        bySession.set(row.session_id, current);
      }
      const snippet2 = truncate((row.content || "").replace(/\s+/g, " ").trim(), 280);
      if (row.type === "user" && !current.human) {
        current.human = snippet2;
      }
      if (row.type === "assistant" && !current.assistant) {
        current.assistant = snippet2;
      }
      if (bySession.size >= maxResults) {
        const complete = Array.from(bySession.values()).every((entry) => entry.human && entry.assistant);
        if (complete) break;
      }
    }
    const records = Array.from(bySession.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, maxResults).map((entry) => ({
      ...entry,
      human: entry.human || this.getLatestMessageByType(entry.sessionId, "user"),
      assistant: entry.assistant || this.getLatestMessageByType(entry.sessionId, "assistant")
    }));
    return records;
  }
  // 直接按会话更新时间取最近聊天，并补齐最后的人类/助手消息摘要。
  recentChats(options) {
    const n = Math.max(1, Math.min(20, Math.floor(options.n ?? 3)));
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";
    const beforeMs = parseTimeToMs(options.before);
    const afterMs = parseTimeToMs(options.after);
    const clauses = [];
    const params = [];
    if (beforeMs !== null) {
      clauses.push("updated_at < ?");
      params.push(beforeMs);
    }
    if (afterMs !== null) {
      clauses.push("updated_at > ?");
      params.push(afterMs);
    }
    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.getAll(
      `
      SELECT id, title, updated_at
      FROM cowork_sessions
      ${whereClause}
      ORDER BY updated_at ${sortOrder.toUpperCase()}
      LIMIT ?
    `,
      [...params, n]
    );
    return rows.map((row) => ({
      sessionId: row.id,
      title: row.title || "Untitled",
      updatedAt: Number(row.updated_at) || 0,
      url: `https://claude.ai/chat/${row.id}`,
      human: this.getLatestMessageByType(row.id, "user"),
      assistant: this.getLatestMessageByType(row.id, "assistant")
    }));
  }
}
const MAX_LOG_SIZE = 5 * 1024 * 1024;
let logFilePath = null;
function getLogFilePath$1() {
  if (!logFilePath) {
    const logDir = path$7.join(require$$0$1.app.getPath("userData"), "logs");
    if (!fs$a.existsSync(logDir)) {
      fs$a.mkdirSync(logDir, { recursive: true });
    }
    logFilePath = path$7.join(logDir, "cowork.log");
  }
  return logFilePath;
}
function rotateIfNeeded() {
  try {
    const filePath = getLogFilePath$1();
    if (!fs$a.existsSync(filePath)) return;
    const stat = fs$a.statSync(filePath);
    if (stat.size > MAX_LOG_SIZE) {
      const backupPath = filePath + ".old";
      if (fs$a.existsSync(backupPath)) {
        fs$a.unlinkSync(backupPath);
      }
      fs$a.renameSync(filePath, backupPath);
    }
  } catch {
  }
}
function formatTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function coworkLog(level, tag, message, extra) {
  try {
    rotateIfNeeded();
    const parts = [`[${formatTimestamp()}] [${level}] [${tag}] ${message}`];
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        parts.push(`  ${key}: ${serialized}`);
      }
    }
    parts.push("");
    fs$a.appendFileSync(getLogFilePath$1(), parts.join("\n"), "utf-8");
  } catch {
  }
}
function getCoworkLogPath() {
  return getLogFilePath$1();
}
const SANDBOX_BASE_URL = process.env.COWORK_SANDBOX_BASE_URL || "";
const SANDBOX_RUNTIME_VERSION = process.env.COWORK_SANDBOX_RUNTIME_VERSION || "v0.1.3";
const SANDBOX_IMAGE_VERSION = process.env.COWORK_SANDBOX_IMAGE_VERSION || "v0.1.4";
const SANDBOX_RUNTIME_URL = process.env.COWORK_SANDBOX_RUNTIME_URL;
const SANDBOX_IMAGE_URL = process.env.COWORK_SANDBOX_IMAGE_URL;
const SANDBOX_IMAGE_URL_ARM64 = process.env.COWORK_SANDBOX_IMAGE_URL_ARM64;
const SANDBOX_IMAGE_URL_AMD64 = process.env.COWORK_SANDBOX_IMAGE_URL_AMD64;
const SANDBOX_KERNEL_URL = process.env.COWORK_SANDBOX_KERNEL_URL;
const SANDBOX_KERNEL_URL_ARM64 = process.env.COWORK_SANDBOX_KERNEL_URL_ARM64;
const SANDBOX_KERNEL_URL_AMD64 = process.env.COWORK_SANDBOX_KERNEL_URL_AMD64;
const SANDBOX_INITRD_URL = process.env.COWORK_SANDBOX_INITRD_URL;
const SANDBOX_INITRD_URL_ARM64 = process.env.COWORK_SANDBOX_INITRD_URL_ARM64;
const SANDBOX_INITRD_URL_AMD64 = process.env.COWORK_SANDBOX_INITRD_URL_AMD64;
const SANDBOX_KERNEL_PATH = process.env.COWORK_SANDBOX_KERNEL_PATH;
const SANDBOX_KERNEL_PATH_ARM64 = process.env.COWORK_SANDBOX_KERNEL_PATH_ARM64;
const SANDBOX_KERNEL_PATH_AMD64 = process.env.COWORK_SANDBOX_KERNEL_PATH_AMD64;
const SANDBOX_INITRD_PATH = process.env.COWORK_SANDBOX_INITRD_PATH;
const SANDBOX_INITRD_PATH_ARM64 = process.env.COWORK_SANDBOX_INITRD_PATH_ARM64;
const SANDBOX_INITRD_PATH_AMD64 = process.env.COWORK_SANDBOX_INITRD_PATH_AMD64;
const SANDBOX_RUNTIME_SHA256 = process.env.COWORK_SANDBOX_RUNTIME_SHA256;
const SANDBOX_IMAGE_SHA256 = process.env.COWORK_SANDBOX_IMAGE_SHA256;
const SANDBOX_IMAGE_SHA256_ARM64 = process.env.COWORK_SANDBOX_IMAGE_SHA256_ARM64;
const SANDBOX_IMAGE_SHA256_AMD64 = process.env.COWORK_SANDBOX_IMAGE_SHA256_AMD64;
const DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_ARM64 = "https://ydhardwarecommon.nosdn.127.net/f23e57c47e4356c31b5bf1012f10a53e.gz";
const DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_AMD64 = "https://ydhardwarecommon.nosdn.127.net/20a9f6a34705ca51dbd9fb8c7695c1e5.gz";
const DEFAULT_SANDBOX_RUNTIME_URL_WIN32_AMD64 = "https://ydhardwarecommon.nosdn.127.net/02a016878c4457bd819e11e55b7b6884.gz";
const DEFAULT_SANDBOX_IMAGE_URL_ARM64 = "https://ydhardwarecommon.nosdn.127.net/59d9df60ce9c0463c54e3043af60cb10.qcow2";
const DEFAULT_SANDBOX_IMAGE_URL_AMD64 = "https://ydhardwarebusiness.nosdn.127.net/3ba0e509b60aaf8b5a969618d1b4e170.qcow2";
const downloadState = {
  runtime: null,
  image: null,
  progress: void 0,
  error: null
};
let _resolvedSystemQemuPath = null;
const sandboxEvents = new require$$4.EventEmitter();
function emitProgress(progress) {
  downloadState.progress = progress;
  sandboxEvents.emit("progress", progress);
}
function getPlatformKey() {
  if (!["darwin", "win32", "linux"].includes(process.platform)) {
    return null;
  }
  if (!["x64", "arm64"].includes(process.arch)) {
    return null;
  }
  return `${process.platform}-${process.arch}`;
}
function getRuntimeBinaryName() {
  const isWindows2 = process.platform === "win32";
  if (process.arch === "arm64") {
    return isWindows2 ? "qemu-system-aarch64.exe" : "qemu-system-aarch64";
  }
  return isWindows2 ? "qemu-system-x86_64.exe" : "qemu-system-x86_64";
}
function getSandboxPaths() {
  const baseDir = path$7.join(require$$0$1.app.getPath("userData"), "cowork", "sandbox");
  const runtimeDir = path$7.join(baseDir, "runtime", `${SANDBOX_RUNTIME_VERSION}`);
  const imageDir = path$7.join(baseDir, "images", `${SANDBOX_IMAGE_VERSION}`);
  const runtimeBinary = path$7.join(runtimeDir, getRuntimeBinaryName());
  const imagePath = path$7.join(imageDir, `linux-${process.arch}.qcow2`);
  return { baseDir, runtimeDir, imageDir, runtimeBinary, imagePath };
}
function getRuntimeUrl(platformKey) {
  if (SANDBOX_RUNTIME_URL) {
    return SANDBOX_RUNTIME_URL;
  }
  if (platformKey === "darwin-arm64" && DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_ARM64) {
    return DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_ARM64;
  }
  if (platformKey === "darwin-x64" && DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_AMD64) {
    return DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_AMD64;
  }
  if (platformKey === "win32-x64" && DEFAULT_SANDBOX_RUNTIME_URL_WIN32_AMD64) {
    return DEFAULT_SANDBOX_RUNTIME_URL_WIN32_AMD64;
  }
  if (platformKey.startsWith("win32")) {
    return null;
  }
  if (!SANDBOX_BASE_URL) {
    return null;
  }
  return `${SANDBOX_BASE_URL}/${SANDBOX_RUNTIME_VERSION}/runtime-${platformKey}.tar.gz`;
}
function getArchVariant() {
  if (process.arch === "x64") {
    return "amd64";
  }
  if (process.arch === "arm64") {
    return "arm64";
  }
  return null;
}
function getImageUrl() {
  const archVariant = getArchVariant();
  if (archVariant === "arm64" && (SANDBOX_IMAGE_URL_ARM64 || DEFAULT_SANDBOX_IMAGE_URL_ARM64)) {
    return SANDBOX_IMAGE_URL_ARM64 || DEFAULT_SANDBOX_IMAGE_URL_ARM64;
  }
  if (archVariant === "amd64" && (SANDBOX_IMAGE_URL_AMD64 || DEFAULT_SANDBOX_IMAGE_URL_AMD64)) {
    return SANDBOX_IMAGE_URL_AMD64 || DEFAULT_SANDBOX_IMAGE_URL_AMD64;
  }
  if (SANDBOX_IMAGE_URL) {
    return SANDBOX_IMAGE_URL;
  }
  if (!SANDBOX_BASE_URL) {
    return null;
  }
  return `${SANDBOX_BASE_URL}/${SANDBOX_IMAGE_VERSION}/image-linux-${process.arch}.qcow2`;
}
function getImageSha256() {
  const archVariant = getArchVariant();
  if (archVariant === "arm64" && SANDBOX_IMAGE_SHA256_ARM64) {
    return SANDBOX_IMAGE_SHA256_ARM64;
  }
  if (archVariant === "amd64" && SANDBOX_IMAGE_SHA256_AMD64) {
    return SANDBOX_IMAGE_SHA256_AMD64;
  }
  return SANDBOX_IMAGE_SHA256 || null;
}
function getKernelUrl() {
  const archVariant = getArchVariant();
  if (archVariant === "arm64" && SANDBOX_KERNEL_URL_ARM64) {
    return SANDBOX_KERNEL_URL_ARM64;
  }
  if (archVariant === "amd64" && SANDBOX_KERNEL_URL_AMD64) {
    return SANDBOX_KERNEL_URL_AMD64;
  }
  return SANDBOX_KERNEL_URL || null;
}
function getInitrdUrl() {
  const archVariant = getArchVariant();
  if (archVariant === "arm64" && SANDBOX_INITRD_URL_ARM64) {
    return SANDBOX_INITRD_URL_ARM64;
  }
  if (archVariant === "amd64" && SANDBOX_INITRD_URL_AMD64) {
    return SANDBOX_INITRD_URL_AMD64;
  }
  return SANDBOX_INITRD_URL || null;
}
function getKernelPathOverride() {
  const archVariant = getArchVariant();
  if (archVariant === "arm64" && SANDBOX_KERNEL_PATH_ARM64) {
    return SANDBOX_KERNEL_PATH_ARM64;
  }
  if (archVariant === "amd64" && SANDBOX_KERNEL_PATH_AMD64) {
    return SANDBOX_KERNEL_PATH_AMD64;
  }
  return SANDBOX_KERNEL_PATH || null;
}
function getInitrdPathOverride() {
  const archVariant = getArchVariant();
  if (archVariant === "arm64" && SANDBOX_INITRD_PATH_ARM64) {
    return SANDBOX_INITRD_PATH_ARM64;
  }
  if (archVariant === "amd64" && SANDBOX_INITRD_PATH_AMD64) {
    return SANDBOX_INITRD_PATH_AMD64;
  }
  return SANDBOX_INITRD_PATH || null;
}
async function downloadFile(url2, destination, stage) {
  const response = await require$$0$1.session.defaultSession.fetch(url2);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url2}`);
  }
  await fs$a.promises.mkdir(path$7.dirname(destination), { recursive: true });
  if (!response.body) {
    const data = Buffer.from(await response.arrayBuffer());
    await fs$a.promises.writeFile(destination, data);
    emitProgress({
      stage,
      received: data.length,
      total: data.length,
      percent: 1,
      url: url2
    });
    return;
  }
  const totalHeader = response.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : void 0;
  let received = 0;
  emitProgress({
    stage,
    received,
    total: total && Number.isFinite(total) ? total : void 0,
    percent: total && Number.isFinite(total) ? 0 : void 0,
    url: url2
  });
  const nodeStream = require$$6.Readable.fromWeb(response.body);
  nodeStream.on("data", (chunk) => {
    received += chunk.length;
    emitProgress({
      stage,
      received,
      total: total && Number.isFinite(total) ? total : void 0,
      percent: total && Number.isFinite(total) ? received / total : void 0,
      url: url2
    });
  });
  await promises.pipeline(nodeStream, fs$a.createWriteStream(destination));
  emitProgress({
    stage,
    received,
    total: total && Number.isFinite(total) ? total : void 0,
    percent: total && Number.isFinite(total) ? 1 : void 0,
    url: url2
  });
}
async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const stream2 = fs$a.createReadStream(filePath);
  await new Promise((resolve, reject) => {
    stream2.on("data", (chunk) => hash.update(chunk));
    stream2.on("end", () => resolve());
    stream2.on("error", reject);
  });
  return hash.digest("hex");
}
async function verifySha256(filePath, expected) {
  if (!expected) return;
  const actual = await sha256File(filePath);
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Checksum mismatch for ${path$7.basename(filePath)}`);
  }
}
function extractTarArchive(archivePath, destDir) {
  var _a3;
  const result = require$$0$2.spawnSync("tar", ["-xf", archivePath, "-C", destDir], { stdio: "pipe" });
  if (result.status !== 0) {
    throw new Error(((_a3 = result.stderr) == null ? void 0 : _a3.toString()) || "Failed to extract tar archive");
  }
}
function extractArchive(archivePath, destDir) {
  var _a3, _b, _c;
  if (archivePath.endsWith(".zip")) {
    if (process.platform === "win32") {
      const result = require$$0$2.spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force "${archivePath}" "${destDir}"`], {
        stdio: "pipe"
      });
      if (result.status !== 0) {
        throw new Error(((_a3 = result.stderr) == null ? void 0 : _a3.toString()) || "Failed to extract zip archive");
      }
    } else {
      const result = require$$0$2.spawnSync("unzip", ["-q", archivePath, "-d", destDir], { stdio: "pipe" });
      if (result.status !== 0) {
        throw new Error(((_b = result.stderr) == null ? void 0 : _b.toString()) || "Failed to extract zip archive");
      }
    }
    return;
  }
  if (archivePath.endsWith(".tar")) {
    extractTarArchive(archivePath, destDir);
    return;
  }
  if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
    const result = require$$0$2.spawnSync("tar", ["-xzf", archivePath, "-C", destDir], { stdio: "pipe" });
    if (result.status !== 0) {
      throw new Error(((_c = result.stderr) == null ? void 0 : _c.toString()) || "Failed to extract tar archive");
    }
    return;
  }
  throw new Error("Unsupported runtime archive format");
}
async function extractGzipBinary(archivePath, targetPath) {
  await promises.pipeline(fs$a.createReadStream(archivePath), require$$1$3.createGunzip(), fs$a.createWriteStream(targetPath));
}
async function isTarFile(filePath) {
  try {
    const handle = await fs$a.promises.open(filePath, "r");
    const buffer = Buffer.alloc(262);
    await handle.read(buffer, 0, 262, 0);
    await handle.close();
    const magic = buffer.subarray(257, 262).toString("utf8");
    return magic === "ustar";
  } catch (error) {
    console.warn("Failed to probe sandbox runtime archive:", error);
    return false;
  }
}
async function isGzipFile(filePath) {
  try {
    const handle = await fs$a.promises.open(filePath, "r");
    const buffer = Buffer.alloc(2);
    await handle.read(buffer, 0, 2, 0);
    await handle.close();
    return buffer[0] === 31 && buffer[1] === 139;
  } catch (error) {
    console.warn("Failed to probe sandbox runtime binary:", error);
    return false;
  }
}
async function isPEFile(filePath) {
  try {
    const handle = await fs$a.promises.open(filePath, "r");
    const buffer = Buffer.alloc(2);
    await handle.read(buffer, 0, 2, 0);
    await handle.close();
    return buffer[0] === 77 && buffer[1] === 90;
  } catch (error) {
    console.warn("Failed to probe file for PE header:", error);
    return false;
  }
}
async function runNsisInstaller(installerPath, targetDir) {
  var _a3;
  await fs$a.promises.mkdir(targetDir, { recursive: true });
  console.log(`[Sandbox] Launching QEMU installer interactively: ${installerPath}`);
  console.log(`[Sandbox] Suggested install directory: ${targetDir}`);
  const result = require$$0$2.spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", `Start-Process -FilePath '${installerPath}' -ArgumentList '/D=${targetDir}' -Wait`],
    { stdio: "pipe", timeout: 6e5 }
  );
  if (result.error) {
    throw new Error(`Failed to launch installer: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = ((_a3 = result.stderr) == null ? void 0 : _a3.toString().trim()) || "";
    throw new Error(
      `Installer failed (exit code ${result.status}): ${stderr || "User may have cancelled the installation or denied elevation."}`
    );
  }
  console.log("[Sandbox] QEMU installer process completed");
}
function resolveRuntimeBinary(runtimeDir, expectedPath) {
  if (fs$a.existsSync(expectedPath)) {
    return expectedPath;
  }
  if (!fs$a.existsSync(runtimeDir)) {
    return null;
  }
  const targetName = path$7.basename(expectedPath);
  const stack = [runtimeDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs$a.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path$7.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name === targetName) {
        return entryPath;
      }
    }
  }
  return null;
}
function findSystemQemu() {
  if (process.platform !== "win32") {
    return null;
  }
  const qemuName = getRuntimeBinaryName();
  const result = require$$0$2.spawnSync("where", [qemuName], { stdio: "pipe" });
  if (result.status === 0 && result.stdout) {
    const paths = result.stdout.toString().trim().split("\n");
    for (const qemuPath of paths) {
      const trimmedPath = qemuPath.trim();
      if (fs$a.existsSync(trimmedPath)) {
        const testResult = require$$0$2.spawnSync(trimmedPath, ["--version"], { stdio: "pipe", timeout: 5e3 });
        if (testResult.status === 0 || testResult.status === 3221225781) {
          return trimmedPath;
        }
      }
    }
  }
  const commonPaths = [
    "C:\\Program Files\\qemu",
    "C:\\Program Files (x86)\\qemu",
    path$7.join(process.env.LOCALAPPDATA || "", "Programs", "qemu")
  ];
  for (const basePath of commonPaths) {
    const qemuPath = path$7.join(basePath, qemuName);
    if (fs$a.existsSync(qemuPath)) {
      return qemuPath;
    }
  }
  return null;
}
function validateQemuBinary(binaryPath) {
  var _a3;
  if (!fs$a.existsSync(binaryPath)) {
    return { valid: false, error: "Binary not found" };
  }
  const result = require$$0$2.spawnSync(binaryPath, ["--version"], { stdio: "pipe", timeout: 5e3 });
  if (result.status === 0) {
    return { valid: true };
  }
  if (result.status === 3221225781) {
    return {
      valid: false,
      error: "QEMU binary is missing required DLL files. Please install QEMU properly or use a complete QEMU package."
    };
  }
  if (result.status !== null && result.status !== 0) {
    return {
      valid: false,
      error: `QEMU binary failed to run (exit code: ${result.status}). ${((_a3 = result.stderr) == null ? void 0 : _a3.toString()) || ""}`.trim()
    };
  }
  if (result.error) {
    return {
      valid: false,
      error: `Failed to run QEMU: ${result.error.message}`
    };
  }
  return { valid: false, error: "Unknown error validating QEMU binary" };
}
function checkQemuVirtfsSupport(binaryPath) {
  if (process.platform === "win32") {
    return true;
  }
  const result = require$$0$2.spawnSync(binaryPath, ["-help"], { stdio: "pipe", timeout: 5e3 });
  if (result.status === 0 && result.stdout) {
    return result.stdout.toString().includes("-virtfs");
  }
  return false;
}
function hasHypervisorEntitlement(output) {
  return output.includes("com.apple.security.hypervisor");
}
function ensureHypervisorEntitlement(binaryPath, runtimeDir) {
  var _a3, _b, _c, _d;
  if (process.platform !== "darwin") return;
  const probe = require$$0$2.spawnSync("codesign", ["-d", "--entitlements", ":-", binaryPath], { stdio: "pipe" });
  if (probe.status === 0) {
    const stdout = ((_a3 = probe.stdout) == null ? void 0 : _a3.toString()) || "";
    const stderr = ((_b = probe.stderr) == null ? void 0 : _b.toString()) || "";
    if (hasHypervisorEntitlement(stdout) || hasHypervisorEntitlement(stderr)) {
      return;
    }
  }
  const entitlementsPath = path$7.join(runtimeDir, "entitlements.hypervisor.plist");
  const entitlements = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>com.apple.security.hypervisor</key>",
    "  <true/>",
    "</dict>",
    "</plist>",
    ""
  ].join("\n");
  try {
    fs$a.writeFileSync(entitlementsPath, entitlements);
  } catch (error) {
    console.warn("Failed to write hypervisor entitlements file:", error);
    return;
  }
  const sign = require$$0$2.spawnSync("codesign", ["-s", "-", "--force", "--entitlements", entitlementsPath, binaryPath], { stdio: "pipe" });
  if (sign.status !== 0) {
    const stderr = ((_c = sign.stderr) == null ? void 0 : _c.toString()) || ((_d = sign.stdout) == null ? void 0 : _d.toString()) || "Unknown codesign error";
    console.warn("Failed to codesign sandbox runtime for HVF:", stderr.trim());
  }
}
async function ensureRuntime() {
  var _a3;
  const platformKey = getPlatformKey();
  if (!platformKey) {
    throw new Error("Sandbox VM is not supported on this platform.");
  }
  const { runtimeDir, runtimeBinary } = getSandboxPaths();
  const resolvedBinary = resolveRuntimeBinary(runtimeDir, runtimeBinary);
  if (resolvedBinary) {
    if (await isGzipFile(resolvedBinary)) {
      const tempPath = `${resolvedBinary}.tmp`;
      await extractGzipBinary(resolvedBinary, tempPath);
      if (await isTarFile(tempPath)) {
        extractTarArchive(tempPath, runtimeDir);
        await fs$a.promises.unlink(tempPath);
        try {
          await fs$a.promises.unlink(resolvedBinary);
        } catch (error) {
          console.warn("Failed to remove sandbox runtime gzip archive:", error);
        }
      } else {
        await fs$a.promises.rename(tempPath, resolvedBinary);
      }
    } else if (await isTarFile(resolvedBinary)) {
      extractTarArchive(resolvedBinary, runtimeDir);
      try {
        await fs$a.promises.unlink(resolvedBinary);
      } catch (error) {
        console.warn("Failed to remove sandbox runtime tar archive:", error);
      }
    }
    const finalResolved = resolveRuntimeBinary(runtimeDir, runtimeBinary);
    if (!finalResolved) {
      throw new Error("Sandbox runtime binary not found after extraction.");
    }
    const validation2 = validateQemuBinary(finalResolved);
    if (!validation2.valid) {
      console.warn(`[Sandbox] QEMU binary validation warning: ${validation2.error}`);
    }
    if (process.platform !== "win32") {
      try {
        fs$a.chmodSync(finalResolved, 493);
      } catch (error) {
        console.warn("Failed to chmod sandbox runtime binary:", error);
      }
    }
    ensureHypervisorEntitlement(finalResolved, runtimeDir);
    return finalResolved;
  }
  if (process.platform === "win32") {
    const systemQemu = findSystemQemu();
    if (systemQemu) {
      console.log(`[Sandbox] Found system QEMU at: ${systemQemu}`);
      const validation2 = validateQemuBinary(systemQemu);
      if (validation2.valid) {
        if (checkQemuVirtfsSupport(systemQemu)) {
          console.log("[Sandbox] Using system QEMU installation");
          _resolvedSystemQemuPath = systemQemu;
          return systemQemu;
        }
        console.warn("[Sandbox] System QEMU lacks virtfs (9p) support, will download a compatible build");
      } else {
        console.warn(`[Sandbox] System QEMU found but invalid: ${validation2.error}`);
      }
    }
  }
  const url2 = getRuntimeUrl(platformKey);
  if (!url2) {
    let errorMsg;
    if (platformKey === "win32-x64" || platformKey === "win32-arm64") {
      errorMsg = [
        "Windows sandbox requires QEMU to be installed.",
        "",
        "Please install QEMU using one of these methods:",
        "1. Download and install from: https://qemu.weilnetz.de/w64/",
        "2. Install via scoop: scoop install qemu",
        "3. Install via chocolatey: choco install qemu",
        "",
        "After installation, QEMU should be available in your system PATH.",
        "Alternatively, set the COWORK_SANDBOX_RUNTIME_URL environment variable to a QEMU package URL."
      ].join("\n");
    } else {
      errorMsg = "Sandbox runtime download URL is not configured.";
    }
    throw new Error(errorMsg);
  }
  const archivePath = path$7.join(runtimeDir, `runtime-${platformKey}.download`);
  await fs$a.promises.mkdir(runtimeDir, { recursive: true });
  await downloadFile(url2, archivePath, "runtime");
  await verifySha256(archivePath, SANDBOX_RUNTIME_SHA256);
  if (url2.endsWith(".zip") || url2.endsWith(".tar.gz") || url2.endsWith(".tgz")) {
    extractArchive(archivePath, runtimeDir);
    await fs$a.promises.unlink(archivePath);
  } else if (url2.endsWith(".gz")) {
    const tempPath = `${runtimeBinary}.download`;
    await extractGzipBinary(archivePath, tempPath);
    await fs$a.promises.unlink(archivePath);
    if (await isTarFile(tempPath)) {
      extractTarArchive(tempPath, runtimeDir);
      await fs$a.promises.unlink(tempPath);
    } else if (process.platform === "win32" && await isPEFile(tempPath)) {
      const fileStats = await fs$a.promises.stat(tempPath);
      console.log(`[Sandbox] Decompressed PE file: ${fileStats.size} bytes`);
      const versionProbe = require$$0$2.spawnSync(tempPath, ["--version"], { stdio: "pipe", timeout: 5e3 });
      const versionOutput = ((_a3 = versionProbe.stdout) == null ? void 0 : _a3.toString().trim()) || "";
      console.log(`[Sandbox] PE --version probe: exit=${versionProbe.status}, stdout="${versionOutput.slice(0, 120)}"`);
      if (versionProbe.status === 0 && versionOutput.toLowerCase().includes("qemu")) {
        console.log("[Sandbox] Downloaded file is a QEMU binary, renaming directly");
        await fs$a.promises.rename(tempPath, runtimeBinary);
      } else {
        const installerPath = path$7.join(runtimeDir, "qemu-installer.exe");
        await fs$a.promises.rename(tempPath, installerPath);
        try {
          console.log(`[Sandbox] Running QEMU NSIS installer to: ${runtimeDir}`);
          await runNsisInstaller(installerPath, runtimeDir);
          console.log("[Sandbox] QEMU NSIS installer completed successfully");
        } catch (error) {
          try {
            const entries = fs$a.readdirSync(runtimeDir);
            console.log(`[Sandbox] Runtime dir contents after failed install: ${JSON.stringify(entries)}`);
          } catch {
          }
          try {
            await fs$a.promises.unlink(installerPath);
          } catch {
          }
          throw new Error(`Failed to install QEMU: ${error instanceof Error ? error.message : String(error)}`);
        }
        try {
          const entries = fs$a.readdirSync(runtimeDir);
          console.log(`[Sandbox] Runtime dir contents after install: ${JSON.stringify(entries)}`);
        } catch {
        }
        try {
          await fs$a.promises.unlink(installerPath);
        } catch (error) {
          console.warn("[Sandbox] Failed to remove QEMU installer after installation:", error);
        }
      }
    } else {
      await fs$a.promises.rename(tempPath, runtimeBinary);
    }
  } else {
    const targetPath = runtimeBinary;
    await fs$a.promises.rename(archivePath, targetPath);
  }
  const finalBinary = resolveRuntimeBinary(runtimeDir, runtimeBinary);
  if (!finalBinary) {
    try {
      const listDir = (dir, prefix = "") => {
        const results = [];
        for (const entry of fs$a.readdirSync(dir, { withFileTypes: true })) {
          const full = path$7.join(dir, entry.name);
          results.push(`${prefix}${entry.name}${entry.isDirectory() ? "/" : ""}`);
          if (entry.isDirectory()) {
            results.push(...listDir(full, prefix + "  "));
          }
        }
        return results;
      };
      console.log(`[Sandbox] Binary not found. Looking for: ${path$7.basename(runtimeBinary)}`);
      console.log(`[Sandbox] Runtime dir tree:
${listDir(runtimeDir).join("\n")}`);
    } catch {
    }
    throw new Error("Sandbox runtime binary not found after extraction.");
  }
  console.log(`[Sandbox] Resolved runtime binary: ${finalBinary}`);
  const validation = validateQemuBinary(finalBinary);
  if (!validation.valid) {
    console.warn(`[Sandbox] QEMU binary validation warning: ${validation.error}`);
  }
  if (process.platform !== "win32") {
    try {
      fs$a.chmodSync(finalBinary, 493);
    } catch (error) {
      console.warn("Failed to chmod sandbox runtime binary:", error);
    }
  }
  ensureHypervisorEntitlement(finalBinary, runtimeDir);
  return finalBinary;
}
async function ensureImage() {
  const { imageDir, imagePath } = getSandboxPaths();
  if (fs$a.existsSync(imagePath)) {
    return imagePath;
  }
  const url2 = getImageUrl();
  if (!url2) {
    const errorMsg = process.platform === "win32" ? "Windows sandbox image is not yet configured. Please set COWORK_SANDBOX_IMAGE_URL or COWORK_SANDBOX_BASE_URL environment variable, or wait for default Windows image support." : "Sandbox image download URL is not configured.";
    throw new Error(errorMsg);
  }
  await fs$a.promises.mkdir(imageDir, { recursive: true });
  const downloadPath = `${imagePath}.download`;
  await downloadFile(url2, downloadPath, "image");
  await verifySha256(downloadPath, getImageSha256());
  await fs$a.promises.rename(downloadPath, imagePath);
  return imagePath;
}
async function ensureKernel() {
  const override = getKernelPathOverride();
  if (override && fs$a.existsSync(override)) {
    return override;
  }
  const archVariant = getArchVariant();
  if (!archVariant) return null;
  const { imageDir } = getSandboxPaths();
  const kernelPath = path$7.join(imageDir, `vmlinuz-virt-${archVariant}`);
  if (fs$a.existsSync(kernelPath)) {
    return kernelPath;
  }
  const url2 = getKernelUrl();
  if (!url2) return null;
  await fs$a.promises.mkdir(imageDir, { recursive: true });
  const downloadPath = `${kernelPath}.download`;
  await downloadFile(url2, downloadPath, "image");
  await fs$a.promises.rename(downloadPath, kernelPath);
  return kernelPath;
}
async function ensureInitrd() {
  const override = getInitrdPathOverride();
  if (override && fs$a.existsSync(override)) {
    return override;
  }
  const archVariant = getArchVariant();
  if (!archVariant) return null;
  const { imageDir } = getSandboxPaths();
  const initrdPath = path$7.join(imageDir, `initramfs-virt-${archVariant}`);
  if (fs$a.existsSync(initrdPath)) {
    return initrdPath;
  }
  const url2 = getInitrdUrl();
  if (!url2) return null;
  await fs$a.promises.mkdir(imageDir, { recursive: true });
  const downloadPath = `${initrdPath}.download`;
  await downloadFile(url2, downloadPath, "image");
  await fs$a.promises.rename(downloadPath, initrdPath);
  return initrdPath;
}
function getExistingKernelPath() {
  const override = getKernelPathOverride();
  if (override && fs$a.existsSync(override)) {
    return override;
  }
  const archVariant = getArchVariant();
  if (!archVariant) return null;
  const { imageDir } = getSandboxPaths();
  const kernelPath = path$7.join(imageDir, `vmlinuz-virt-${archVariant}`);
  return fs$a.existsSync(kernelPath) ? kernelPath : null;
}
function getExistingInitrdPath() {
  const override = getInitrdPathOverride();
  if (override && fs$a.existsSync(override)) {
    return override;
  }
  const archVariant = getArchVariant();
  if (!archVariant) return null;
  const { imageDir } = getSandboxPaths();
  const initrdPath = path$7.join(imageDir, `initramfs-virt-${archVariant}`);
  return fs$a.existsSync(initrdPath) ? initrdPath : null;
}
function resolveAvailableRuntimeBinary() {
  const { runtimeDir, runtimeBinary } = getSandboxPaths();
  const localRuntime = resolveRuntimeBinary(runtimeDir, runtimeBinary);
  if (localRuntime) {
    return localRuntime;
  }
  if (process.platform === "win32") {
    if (_resolvedSystemQemuPath && fs$a.existsSync(_resolvedSystemQemuPath)) {
      return _resolvedSystemQemuPath;
    }
    const systemQemu = findSystemQemu();
    if (systemQemu) {
      const validation = validateQemuBinary(systemQemu);
      if (validation.valid && checkQemuVirtfsSupport(systemQemu)) {
        _resolvedSystemQemuPath = systemQemu;
        return systemQemu;
      }
    }
  }
  return null;
}
let _ensureSandboxReadyPromise = null;
function ensureSandboxReady() {
  if (_ensureSandboxReadyPromise) {
    return _ensureSandboxReadyPromise;
  }
  _ensureSandboxReadyPromise = _ensureSandboxReadyImpl();
  _ensureSandboxReadyPromise.finally(() => {
    _ensureSandboxReadyPromise = null;
  });
  return _ensureSandboxReadyPromise;
}
async function _ensureSandboxReadyImpl() {
  const platformKey = getPlatformKey();
  if (!platformKey) {
    return { ok: false, error: "Sandbox VM is not supported on this platform." };
  }
  coworkLog("INFO", "ensureSandboxReady", "Checking sandbox readiness", {
    platformKey,
    platform: process.platform,
    arch: process.arch
  });
  try {
    if (!downloadState.runtime) {
      downloadState.runtime = ensureRuntime();
    }
    const runtimeBinary = await downloadState.runtime;
    downloadState.runtime = null;
    if (!downloadState.image) {
      downloadState.image = ensureImage();
    }
    const imagePath = await downloadState.image;
    downloadState.image = null;
    let kernelPath = null;
    let initrdPath = null;
    try {
      kernelPath = await ensureKernel();
      initrdPath = await ensureInitrd();
    } catch (error) {
      console.warn("Failed to download sandbox kernel/initrd:", error);
    }
    const { baseDir } = getSandboxPaths();
    downloadState.error = null;
    downloadState.progress = void 0;
    coworkLog("INFO", "ensureSandboxReady", "Sandbox ready", {
      runtimeBinary,
      runtimeExists: fs$a.existsSync(runtimeBinary),
      imagePath,
      imageExists: fs$a.existsSync(imagePath),
      kernelPath,
      initrdPath
    });
    return {
      ok: true,
      runtimeInfo: {
        platform: process.platform,
        arch: process.arch,
        runtimeBinary,
        imagePath,
        kernelPath,
        initrdPath,
        baseDir
      }
    };
  } catch (error) {
    downloadState.error = error instanceof Error ? error.message : String(error);
    downloadState.runtime = null;
    downloadState.image = null;
    coworkLog("ERROR", "ensureSandboxReady", "Sandbox not ready", {
      error: downloadState.error
    });
    return { ok: false, error: downloadState.error };
  }
}
function getSandboxRuntimeInfoIfReady() {
  const platformKey = getPlatformKey();
  if (!platformKey) {
    return { ok: false, error: "Sandbox VM is not supported on this platform." };
  }
  const runtimeBinary = resolveAvailableRuntimeBinary();
  if (!runtimeBinary) {
    return { ok: false, error: "Sandbox runtime is not installed." };
  }
  const { baseDir, imagePath } = getSandboxPaths();
  if (!fs$a.existsSync(imagePath)) {
    return { ok: false, error: "Sandbox image is not installed." };
  }
  return {
    ok: true,
    runtimeInfo: {
      platform: process.platform,
      arch: process.arch,
      runtimeBinary,
      imagePath,
      kernelPath: getExistingKernelPath(),
      initrdPath: getExistingInitrdPath(),
      baseDir
    }
  };
}
function getSandboxStatus() {
  const platformKey = getPlatformKey();
  if (!platformKey) {
    return {
      supported: false,
      runtimeReady: false,
      imageReady: false,
      downloading: Boolean(downloadState.runtime || downloadState.image),
      error: downloadState.error
    };
  }
  const { imagePath } = getSandboxPaths();
  const runtimeReady = Boolean(resolveAvailableRuntimeBinary());
  const imageReady = fs$a.existsSync(imagePath);
  return {
    supported: true,
    runtimeReady,
    imageReady,
    downloading: Boolean(downloadState.runtime || downloadState.image),
    progress: downloadState.progress,
    error: downloadState.error
  };
}
const fs$5 = fs$a;
const path$5 = path$7;
var packageJson$1 = {
  findAndReadPackageJson,
  tryReadJsonAt
};
function findAndReadPackageJson() {
  return tryReadJsonAt(getMainModulePath()) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || { name: void 0, version: void 0 };
}
function tryReadJsonAt(...searchPaths) {
  if (!searchPaths[0]) {
    return void 0;
  }
  try {
    const searchPath = path$5.join(...searchPaths);
    const fileName = findUp("package.json", searchPath);
    if (!fileName) {
      return void 0;
    }
    const json2 = JSON.parse(fs$5.readFileSync(fileName, "utf8"));
    const name = (json2 == null ? void 0 : json2.productName) || (json2 == null ? void 0 : json2.name);
    if (!name || name.toLowerCase() === "electron") {
      return void 0;
    }
    if (name) {
      return { name, version: json2 == null ? void 0 : json2.version };
    }
    return void 0;
  } catch (e) {
    return void 0;
  }
}
function findUp(fileName, cwd) {
  let currentPath = cwd;
  while (true) {
    const parsedPath = path$5.parse(currentPath);
    const root = parsedPath.root;
    const dir = parsedPath.dir;
    if (fs$5.existsSync(path$5.join(currentPath, fileName))) {
      return path$5.resolve(path$5.join(currentPath, fileName));
    }
    if (currentPath === root) {
      return null;
    }
    currentPath = dir;
  }
}
function extractPathFromArgs() {
  const matchedArgs = process.argv.filter((arg) => {
    return arg.indexOf("--user-data-dir=") === 0;
  });
  if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") {
    return null;
  }
  const userDataDir = matchedArgs[0];
  return userDataDir.replace("--user-data-dir=", "");
}
function getMainModulePath() {
  var _a3;
  try {
    return (_a3 = require.main) == null ? void 0 : _a3.filename;
  } catch {
    return void 0;
  }
}
const childProcess = require$$0$2;
const os$3 = require$$1$1;
const path$4 = path$7;
const packageJson = packageJson$1;
let NodeExternalApi$1 = class NodeExternalApi {
  constructor() {
    __publicField(this, "appName");
    __publicField(this, "appPackageJson");
    __publicField(this, "platform", process.platform);
  }
  getAppLogPath(appName = this.getAppName()) {
    if (this.platform === "darwin") {
      return path$4.join(this.getSystemPathHome(), "Library/Logs", appName);
    }
    return path$4.join(this.getAppUserDataPath(appName), "logs");
  }
  getAppName() {
    var _a3;
    const appName = this.appName || ((_a3 = this.getAppPackageJson()) == null ? void 0 : _a3.name);
    if (!appName) {
      throw new Error(
        "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
      );
    }
    return appName;
  }
  /**
   * @private
   * @returns {undefined}
   */
  getAppPackageJson() {
    if (typeof this.appPackageJson !== "object") {
      this.appPackageJson = packageJson.findAndReadPackageJson();
    }
    return this.appPackageJson;
  }
  getAppUserDataPath(appName = this.getAppName()) {
    return appName ? path$4.join(this.getSystemPathAppData(), appName) : void 0;
  }
  getAppVersion() {
    var _a3;
    return (_a3 = this.getAppPackageJson()) == null ? void 0 : _a3.version;
  }
  getElectronLogPath() {
    return this.getAppLogPath();
  }
  getMacOsVersion() {
    const release = Number(os$3.release().split(".")[0]);
    if (release <= 19) {
      return `10.${release - 4}`;
    }
    return release - 9;
  }
  /**
   * @protected
   * @returns {string}
   */
  getOsVersion() {
    let osName = os$3.type().replace("_", " ");
    let osVersion = os$3.release();
    if (osName === "Darwin") {
      osName = "macOS";
      osVersion = this.getMacOsVersion();
    }
    return `${osName} ${osVersion}`;
  }
  /**
   * @return {PathVariables}
   */
  getPathVariables() {
    const appName = this.getAppName();
    const appVersion = this.getAppVersion();
    const self2 = this;
    return {
      appData: this.getSystemPathAppData(),
      appName,
      appVersion,
      get electronDefaultDir() {
        return self2.getElectronLogPath();
      },
      home: this.getSystemPathHome(),
      libraryDefaultDir: this.getAppLogPath(appName),
      libraryTemplate: this.getAppLogPath("{appName}"),
      temp: this.getSystemPathTemp(),
      userData: this.getAppUserDataPath(appName)
    };
  }
  getSystemPathAppData() {
    const home = this.getSystemPathHome();
    switch (this.platform) {
      case "darwin": {
        return path$4.join(home, "Library/Application Support");
      }
      case "win32": {
        return process.env.APPDATA || path$4.join(home, "AppData/Roaming");
      }
      default: {
        return process.env.XDG_CONFIG_HOME || path$4.join(home, ".config");
      }
    }
  }
  getSystemPathHome() {
    var _a3;
    return ((_a3 = os$3.homedir) == null ? void 0 : _a3.call(os$3)) || process.env.HOME;
  }
  getSystemPathTemp() {
    return os$3.tmpdir();
  }
  getVersions() {
    return {
      app: `${this.getAppName()} ${this.getAppVersion()}`,
      electron: void 0,
      os: this.getOsVersion()
    };
  }
  isDev() {
    return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
  }
  isElectron() {
    return Boolean(process.versions.electron);
  }
  onAppEvent(_eventName, _handler) {
  }
  onAppReady(handler) {
    handler();
  }
  onEveryWebContentsEvent(eventName, handler) {
  }
  /**
   * Listen to async messages sent from opposite process
   * @param {string} channel
   * @param {function} listener
   */
  onIpc(channel, listener) {
  }
  onIpcInvoke(channel, listener) {
  }
  /**
   * @param {string} url
   * @param {Function} [logFunction]
   */
  openUrl(url2, logFunction = console.error) {
    const startMap = { darwin: "open", win32: "start", linux: "xdg-open" };
    const start = startMap[process.platform] || "xdg-open";
    childProcess.exec(`${start} ${url2}`, {}, (err) => {
      if (err) {
        logFunction(err);
      }
    });
  }
  setAppName(appName) {
    this.appName = appName;
  }
  setPlatform(platform) {
    this.platform = platform;
  }
  setPreloadFileForSessions({
    filePath,
    // eslint-disable-line no-unused-vars
    includeFutureSession = true,
    // eslint-disable-line no-unused-vars
    getSessions = () => []
    // eslint-disable-line no-unused-vars
  }) {
  }
  /**
   * Sent a message to opposite process
   * @param {string} channel
   * @param {any} message
   */
  sendIpc(channel, message) {
  }
  showErrorBox(title, message) {
  }
};
var NodeExternalApi_1 = NodeExternalApi$1;
const path$3 = path$7;
const NodeExternalApi2 = NodeExternalApi_1;
let ElectronExternalApi$1 = class ElectronExternalApi extends NodeExternalApi2 {
  /**
   * @param {object} options
   * @param {typeof Electron} [options.electron]
   */
  constructor({ electron: electron2 } = {}) {
    super();
    /**
     * @type {typeof Electron}
     */
    __publicField(this, "electron");
    this.electron = electron2;
  }
  getAppName() {
    var _a3, _b;
    let appName;
    try {
      appName = this.appName || ((_a3 = this.electron.app) == null ? void 0 : _a3.name) || ((_b = this.electron.app) == null ? void 0 : _b.getName());
    } catch {
    }
    return appName || super.getAppName();
  }
  getAppUserDataPath(appName) {
    return this.getPath("userData") || super.getAppUserDataPath(appName);
  }
  getAppVersion() {
    var _a3;
    let appVersion;
    try {
      appVersion = (_a3 = this.electron.app) == null ? void 0 : _a3.getVersion();
    } catch {
    }
    return appVersion || super.getAppVersion();
  }
  getElectronLogPath() {
    return this.getPath("logs") || super.getElectronLogPath();
  }
  /**
   * @private
   * @param {any} name
   * @returns {string|undefined}
   */
  getPath(name) {
    var _a3;
    try {
      return (_a3 = this.electron.app) == null ? void 0 : _a3.getPath(name);
    } catch {
      return void 0;
    }
  }
  getVersions() {
    return {
      app: `${this.getAppName()} ${this.getAppVersion()}`,
      electron: `Electron ${process.versions.electron}`,
      os: this.getOsVersion()
    };
  }
  getSystemPathAppData() {
    return this.getPath("appData") || super.getSystemPathAppData();
  }
  isDev() {
    var _a3;
    if (((_a3 = this.electron.app) == null ? void 0 : _a3.isPackaged) !== void 0) {
      return !this.electron.app.isPackaged;
    }
    if (typeof process.execPath === "string") {
      const execFileName = path$3.basename(process.execPath).toLowerCase();
      return execFileName.startsWith("electron");
    }
    return super.isDev();
  }
  onAppEvent(eventName, handler) {
    var _a3;
    (_a3 = this.electron.app) == null ? void 0 : _a3.on(eventName, handler);
    return () => {
      var _a4;
      (_a4 = this.electron.app) == null ? void 0 : _a4.off(eventName, handler);
    };
  }
  onAppReady(handler) {
    var _a3, _b, _c;
    if ((_a3 = this.electron.app) == null ? void 0 : _a3.isReady()) {
      handler();
    } else if ((_b = this.electron.app) == null ? void 0 : _b.once) {
      (_c = this.electron.app) == null ? void 0 : _c.once("ready", handler);
    } else {
      handler();
    }
  }
  onEveryWebContentsEvent(eventName, handler) {
    var _a3, _b, _c;
    (_b = (_a3 = this.electron.webContents) == null ? void 0 : _a3.getAllWebContents()) == null ? void 0 : _b.forEach((webContents) => {
      webContents.on(eventName, handler);
    });
    (_c = this.electron.app) == null ? void 0 : _c.on("web-contents-created", onWebContentsCreated);
    return () => {
      var _a4, _b2;
      (_a4 = this.electron.webContents) == null ? void 0 : _a4.getAllWebContents().forEach((webContents) => {
        webContents.off(eventName, handler);
      });
      (_b2 = this.electron.app) == null ? void 0 : _b2.off("web-contents-created", onWebContentsCreated);
    };
    function onWebContentsCreated(_, webContents) {
      webContents.on(eventName, handler);
    }
  }
  /**
   * Listen to async messages sent from opposite process
   * @param {string} channel
   * @param {function} listener
   */
  onIpc(channel, listener) {
    var _a3;
    (_a3 = this.electron.ipcMain) == null ? void 0 : _a3.on(channel, listener);
  }
  onIpcInvoke(channel, listener) {
    var _a3, _b;
    (_b = (_a3 = this.electron.ipcMain) == null ? void 0 : _a3.handle) == null ? void 0 : _b.call(_a3, channel, listener);
  }
  /**
   * @param {string} url
   * @param {Function} [logFunction]
   */
  openUrl(url2, logFunction = console.error) {
    var _a3;
    (_a3 = this.electron.shell) == null ? void 0 : _a3.openExternal(url2).catch(logFunction);
  }
  setPreloadFileForSessions({
    filePath,
    includeFutureSession = true,
    getSessions = () => {
      var _a3;
      return [(_a3 = this.electron.session) == null ? void 0 : _a3.defaultSession];
    }
  }) {
    for (const session of getSessions().filter(Boolean)) {
      setPreload(session);
    }
    if (includeFutureSession) {
      this.onAppEvent("session-created", (session) => {
        setPreload(session);
      });
    }
    function setPreload(session) {
      if (typeof session.registerPreloadScript === "function") {
        session.registerPreloadScript({
          filePath,
          id: "electron-log-preload",
          type: "frame"
        });
      } else {
        session.setPreloads([...session.getPreloads(), filePath]);
      }
    }
  }
  /**
   * Sent a message to opposite process
   * @param {string} channel
   * @param {any} message
   */
  sendIpc(channel, message) {
    var _a3, _b;
    (_b = (_a3 = this.electron.BrowserWindow) == null ? void 0 : _a3.getAllWindows()) == null ? void 0 : _b.forEach((wnd) => {
      var _a4, _b2;
      if (((_a4 = wnd.webContents) == null ? void 0 : _a4.isDestroyed()) === false && ((_b2 = wnd.webContents) == null ? void 0 : _b2.isCrashed()) === false) {
        wnd.webContents.send(channel, message);
      }
    });
  }
  showErrorBox(title, message) {
    var _a3;
    (_a3 = this.electron.dialog) == null ? void 0 : _a3.showErrorBox(title, message);
  }
};
var ElectronExternalApi_1 = ElectronExternalApi$1;
var electronLogPreload = { exports: {} };
(function(module2) {
  let electron2 = {};
  try {
    electron2 = require("electron");
  } catch (e) {
  }
  if (electron2.ipcRenderer) {
    initialize2(electron2);
  }
  {
    module2.exports = initialize2;
  }
  function initialize2({ contextBridge, ipcRenderer }) {
    if (!ipcRenderer) {
      return;
    }
    ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
      window.postMessage({ cmd: "message", ...message });
    });
    ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
      `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
    )));
    const electronLog = {
      sendToMain(message) {
        try {
          ipcRenderer.send("__ELECTRON_LOG__", message);
        } catch (e) {
          console.error("electronLog.sendToMain ", e, "data:", message);
          ipcRenderer.send("__ELECTRON_LOG__", {
            cmd: "errorHandler",
            error: { message: e == null ? void 0 : e.message, stack: e == null ? void 0 : e.stack },
            errorName: "sendToMain"
          });
        }
      },
      log(...data) {
        electronLog.sendToMain({ data, level: "info" });
      }
    };
    for (const level of ["error", "warn", "info", "verbose", "debug", "silly"]) {
      electronLog[level] = (...data) => electronLog.sendToMain({
        data,
        level
      });
    }
    if (contextBridge && process.contextIsolated) {
      try {
        contextBridge.exposeInMainWorld("__electronLog", electronLog);
      } catch {
      }
    }
    if (typeof window === "object") {
      window.__electronLog = electronLog;
    } else {
      __electronLog = electronLog;
    }
  }
})(electronLogPreload);
var electronLogPreloadExports = electronLogPreload.exports;
const fs$4 = fs$a;
const os$2 = require$$1$1;
const path$2 = path$7;
const preloadInitializeFn = electronLogPreloadExports;
let preloadInitialized = false;
let spyConsoleInitialized = false;
var initialize$1 = {
  initialize({
    externalApi: externalApi2,
    getSessions,
    includeFutureSession,
    logger,
    preload = true,
    spyRendererConsole = false
  }) {
    externalApi2.onAppReady(() => {
      try {
        if (preload) {
          initializePreload({
            externalApi: externalApi2,
            getSessions,
            includeFutureSession,
            logger,
            preloadOption: preload
          });
        }
        if (spyRendererConsole) {
          initializeSpyRendererConsole({ externalApi: externalApi2, logger });
        }
      } catch (err) {
        logger.warn(err);
      }
    });
  }
};
function initializePreload({
  externalApi: externalApi2,
  getSessions,
  includeFutureSession,
  logger,
  preloadOption
}) {
  let preloadPath = typeof preloadOption === "string" ? preloadOption : void 0;
  if (preloadInitialized) {
    logger.warn(new Error("log.initialize({ preload }) already called").stack);
    return;
  }
  preloadInitialized = true;
  try {
    preloadPath = path$2.resolve(
      __dirname,
      "../renderer/electron-log-preload.js"
    );
  } catch {
  }
  if (!preloadPath || !fs$4.existsSync(preloadPath)) {
    preloadPath = path$2.join(
      externalApi2.getAppUserDataPath() || os$2.tmpdir(),
      "electron-log-preload.js"
    );
    const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
    fs$4.writeFileSync(preloadPath, preloadCode, "utf8");
  }
  externalApi2.setPreloadFileForSessions({
    filePath: preloadPath,
    includeFutureSession,
    getSessions
  });
}
function initializeSpyRendererConsole({ externalApi: externalApi2, logger }) {
  if (spyConsoleInitialized) {
    logger.warn(
      new Error("log.initialize({ spyRendererConsole }) already called").stack
    );
    return;
  }
  spyConsoleInitialized = true;
  const levels = ["debug", "info", "warn", "error"];
  externalApi2.onEveryWebContentsEvent(
    "console-message",
    (event, level, message) => {
      logger.processMessage({
        data: [message],
        level: levels[level],
        variables: { processType: "renderer" }
      });
    }
  );
}
var scope = scopeFactory$1;
function scopeFactory$1(logger) {
  return Object.defineProperties(scope2, {
    defaultLabel: { value: "", writable: true },
    labelPadding: { value: true, writable: true },
    maxLabelLength: { value: 0, writable: true },
    labelLength: {
      get() {
        switch (typeof scope2.labelPadding) {
          case "boolean":
            return scope2.labelPadding ? scope2.maxLabelLength : 0;
          case "number":
            return scope2.labelPadding;
          default:
            return 0;
        }
      }
    }
  });
  function scope2(label) {
    scope2.maxLabelLength = Math.max(scope2.maxLabelLength, label.length);
    const newScope = {};
    for (const level of logger.levels) {
      newScope[level] = (...d) => logger.logData(d, { level, scope: label });
    }
    newScope.log = newScope.info;
    return newScope;
  }
}
let Buffering$1 = class Buffering {
  constructor({ processMessage: processMessage2 }) {
    this.processMessage = processMessage2;
    this.buffer = [];
    this.enabled = false;
    this.begin = this.begin.bind(this);
    this.commit = this.commit.bind(this);
    this.reject = this.reject.bind(this);
  }
  addMessage(message) {
    this.buffer.push(message);
  }
  begin() {
    this.enabled = [];
  }
  commit() {
    this.enabled = false;
    this.buffer.forEach((item) => this.processMessage(item));
    this.buffer = [];
  }
  reject() {
    this.enabled = false;
    this.buffer = [];
  }
};
var Buffering_1 = Buffering$1;
const scopeFactory = scope;
const Buffering2 = Buffering_1;
let Logger$1 = (_a = class {
  constructor({
    allowUnknownLevel = false,
    dependencies = {},
    errorHandler,
    eventLogger,
    initializeFn,
    isDev: isDev2 = false,
    levels = ["error", "warn", "info", "verbose", "debug", "silly"],
    logId,
    transportFactories = {},
    variables
  } = {}) {
    __publicField(this, "dependencies", {});
    __publicField(this, "errorHandler", null);
    __publicField(this, "eventLogger", null);
    __publicField(this, "functions", {});
    __publicField(this, "hooks", []);
    __publicField(this, "isDev", false);
    __publicField(this, "levels", null);
    __publicField(this, "logId", null);
    __publicField(this, "scope", null);
    __publicField(this, "transports", {});
    __publicField(this, "variables", {});
    this.addLevel = this.addLevel.bind(this);
    this.create = this.create.bind(this);
    this.initialize = this.initialize.bind(this);
    this.logData = this.logData.bind(this);
    this.processMessage = this.processMessage.bind(this);
    this.allowUnknownLevel = allowUnknownLevel;
    this.buffering = new Buffering2(this);
    this.dependencies = dependencies;
    this.initializeFn = initializeFn;
    this.isDev = isDev2;
    this.levels = levels;
    this.logId = logId;
    this.scope = scopeFactory(this);
    this.transportFactories = transportFactories;
    this.variables = variables || {};
    for (const name of this.levels) {
      this.addLevel(name, false);
    }
    this.log = this.info;
    this.functions.log = this.log;
    this.errorHandler = errorHandler;
    errorHandler == null ? void 0 : errorHandler.setOptions({ ...dependencies, logFn: this.error });
    this.eventLogger = eventLogger;
    eventLogger == null ? void 0 : eventLogger.setOptions({ ...dependencies, logger: this });
    for (const [name, factory] of Object.entries(transportFactories)) {
      this.transports[name] = factory(this, dependencies);
    }
    _a.instances[logId] = this;
  }
  static getInstance({ logId }) {
    return this.instances[logId] || this.instances.default;
  }
  addLevel(level, index2 = this.levels.length) {
    if (index2 !== false) {
      this.levels.splice(index2, 0, level);
    }
    this[level] = (...args) => this.logData(args, { level });
    this.functions[level] = this[level];
  }
  catchErrors(options) {
    this.processMessage(
      {
        data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
        level: "warn"
      },
      { transports: ["console"] }
    );
    return this.errorHandler.startCatching(options);
  }
  create(options) {
    if (typeof options === "string") {
      options = { logId: options };
    }
    return new _a({
      dependencies: this.dependencies,
      errorHandler: this.errorHandler,
      initializeFn: this.initializeFn,
      isDev: this.isDev,
      transportFactories: this.transportFactories,
      variables: { ...this.variables },
      ...options
    });
  }
  compareLevels(passLevel, checkLevel, levels = this.levels) {
    const pass = levels.indexOf(passLevel);
    const check = levels.indexOf(checkLevel);
    if (check === -1 || pass === -1) {
      return true;
    }
    return check <= pass;
  }
  initialize(options = {}) {
    this.initializeFn({ logger: this, ...this.dependencies, ...options });
  }
  logData(data, options = {}) {
    if (this.buffering.enabled) {
      this.buffering.addMessage({ data, date: /* @__PURE__ */ new Date(), ...options });
    } else {
      this.processMessage({ data, ...options });
    }
  }
  processMessage(message, { transports = this.transports } = {}) {
    if (message.cmd === "errorHandler") {
      this.errorHandler.handle(message.error, {
        errorName: message.errorName,
        processType: "renderer",
        showDialog: Boolean(message.showDialog)
      });
      return;
    }
    let level = message.level;
    if (!this.allowUnknownLevel) {
      level = this.levels.includes(message.level) ? message.level : "info";
    }
    const normalizedMessage = {
      date: /* @__PURE__ */ new Date(),
      logId: this.logId,
      ...message,
      level,
      variables: {
        ...this.variables,
        ...message.variables
      }
    };
    for (const [transName, transFn] of this.transportEntries(transports)) {
      if (typeof transFn !== "function" || transFn.level === false) {
        continue;
      }
      if (!this.compareLevels(transFn.level, message.level)) {
        continue;
      }
      try {
        const transformedMsg = this.hooks.reduce((msg, hook) => {
          return msg ? hook(msg, transFn, transName) : msg;
        }, normalizedMessage);
        if (transformedMsg) {
          transFn({ ...transformedMsg, data: [...transformedMsg.data] });
        }
      } catch (e) {
        this.processInternalErrorFn(e);
      }
    }
  }
  processInternalErrorFn(_e) {
  }
  transportEntries(transports = this.transports) {
    const transportArray = Array.isArray(transports) ? transports : Object.entries(transports);
    return transportArray.map((item) => {
      switch (typeof item) {
        case "string":
          return this.transports[item] ? [item, this.transports[item]] : null;
        case "function":
          return [item.name, item];
        default:
          return Array.isArray(item) ? item : null;
      }
    }).filter(Boolean);
  }
}, __publicField(_a, "instances", {}), _a);
var Logger_1 = Logger$1;
let ErrorHandler$1 = class ErrorHandler {
  constructor({
    externalApi: externalApi2,
    logFn = void 0,
    onError = void 0,
    showDialog = void 0
  } = {}) {
    __publicField(this, "externalApi");
    __publicField(this, "isActive", false);
    __publicField(this, "logFn");
    __publicField(this, "onError");
    __publicField(this, "showDialog", true);
    this.createIssue = this.createIssue.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleRejection = this.handleRejection.bind(this);
    this.setOptions({ externalApi: externalApi2, logFn, onError, showDialog });
    this.startCatching = this.startCatching.bind(this);
    this.stopCatching = this.stopCatching.bind(this);
  }
  handle(error, {
    logFn = this.logFn,
    onError = this.onError,
    processType = "browser",
    showDialog = this.showDialog,
    errorName = ""
  } = {}) {
    var _a3;
    error = normalizeError(error);
    try {
      if (typeof onError === "function") {
        const versions = ((_a3 = this.externalApi) == null ? void 0 : _a3.getVersions()) || {};
        const createIssue = this.createIssue;
        const result = onError({
          createIssue,
          error,
          errorName,
          processType,
          versions
        });
        if (result === false) {
          return;
        }
      }
      errorName ? logFn(errorName, error) : logFn(error);
      if (showDialog && !errorName.includes("rejection") && this.externalApi) {
        this.externalApi.showErrorBox(
          `A JavaScript error occurred in the ${processType} process`,
          error.stack
        );
      }
    } catch {
      console.error(error);
    }
  }
  setOptions({ externalApi: externalApi2, logFn, onError, showDialog }) {
    if (typeof externalApi2 === "object") {
      this.externalApi = externalApi2;
    }
    if (typeof logFn === "function") {
      this.logFn = logFn;
    }
    if (typeof onError === "function") {
      this.onError = onError;
    }
    if (typeof showDialog === "boolean") {
      this.showDialog = showDialog;
    }
  }
  startCatching({ onError, showDialog } = {}) {
    if (this.isActive) {
      return;
    }
    this.isActive = true;
    this.setOptions({ onError, showDialog });
    process.on("uncaughtException", this.handleError);
    process.on("unhandledRejection", this.handleRejection);
  }
  stopCatching() {
    this.isActive = false;
    process.removeListener("uncaughtException", this.handleError);
    process.removeListener("unhandledRejection", this.handleRejection);
  }
  createIssue(pageUrl, queryParams) {
    var _a3;
    (_a3 = this.externalApi) == null ? void 0 : _a3.openUrl(
      `${pageUrl}?${new URLSearchParams(queryParams).toString()}`
    );
  }
  handleError(error) {
    this.handle(error, { errorName: "Unhandled" });
  }
  handleRejection(reason) {
    const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
    this.handle(error, { errorName: "Unhandled rejection" });
  }
};
function normalizeError(e) {
  if (e instanceof Error) {
    return e;
  }
  if (e && typeof e === "object") {
    if (e.message) {
      return Object.assign(new Error(e.message), e);
    }
    try {
      return new Error(JSON.stringify(e));
    } catch (serErr) {
      return new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
    }
  }
  return new Error(`Can't normalize error ${String(e)}`);
}
var ErrorHandler_1 = ErrorHandler$1;
let EventLogger$1 = class EventLogger {
  constructor(options = {}) {
    __publicField(this, "disposers", []);
    __publicField(this, "format", "{eventSource}#{eventName}:");
    __publicField(this, "formatters", {
      app: {
        "certificate-error": ({ args }) => {
          return this.arrayToObject(args.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]);
        },
        "child-process-gone": ({ args }) => {
          return args.length === 1 ? args[0] : args;
        },
        "render-process-gone": ({ args: [webContents, details] }) => {
          return details && typeof details === "object" ? { ...details, ...this.getWebContentsDetails(webContents) } : [];
        }
      },
      webContents: {
        "console-message": ({ args: [level, message, line, sourceId] }) => {
          if (level < 3) {
            return void 0;
          }
          return { message, source: `${sourceId}:${line}` };
        },
        "did-fail-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "did-fail-provisional-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "plugin-crashed": ({ args }) => {
          return this.arrayToObject(args, ["name", "version"]);
        },
        "preload-error": ({ args }) => {
          return this.arrayToObject(args, ["preloadPath", "error"]);
        }
      }
    });
    __publicField(this, "events", {
      app: {
        "certificate-error": true,
        "child-process-gone": true,
        "render-process-gone": true
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": true,
        "did-fail-provisional-load": true,
        "plugin-crashed": true,
        "preload-error": true,
        "unresponsive": true
      }
    });
    __publicField(this, "externalApi");
    __publicField(this, "level", "error");
    __publicField(this, "scope", "");
    this.setOptions(options);
  }
  setOptions({
    events,
    externalApi: externalApi2,
    level,
    logger,
    format: format2,
    formatters,
    scope: scope2
  }) {
    if (typeof events === "object") {
      this.events = events;
    }
    if (typeof externalApi2 === "object") {
      this.externalApi = externalApi2;
    }
    if (typeof level === "string") {
      this.level = level;
    }
    if (typeof logger === "object") {
      this.logger = logger;
    }
    if (typeof format2 === "string" || typeof format2 === "function") {
      this.format = format2;
    }
    if (typeof formatters === "object") {
      this.formatters = formatters;
    }
    if (typeof scope2 === "string") {
      this.scope = scope2;
    }
  }
  startLogging(options = {}) {
    this.setOptions(options);
    this.disposeListeners();
    for (const eventName of this.getEventNames(this.events.app)) {
      this.disposers.push(
        this.externalApi.onAppEvent(eventName, (...handlerArgs) => {
          this.handleEvent({ eventSource: "app", eventName, handlerArgs });
        })
      );
    }
    for (const eventName of this.getEventNames(this.events.webContents)) {
      this.disposers.push(
        this.externalApi.onEveryWebContentsEvent(
          eventName,
          (...handlerArgs) => {
            this.handleEvent(
              { eventSource: "webContents", eventName, handlerArgs }
            );
          }
        )
      );
    }
  }
  stopLogging() {
    this.disposeListeners();
  }
  arrayToObject(array2, fieldNames) {
    const obj = {};
    fieldNames.forEach((fieldName, index2) => {
      obj[fieldName] = array2[index2];
    });
    if (array2.length > fieldNames.length) {
      obj.unknownArgs = array2.slice(fieldNames.length);
    }
    return obj;
  }
  disposeListeners() {
    this.disposers.forEach((disposer) => disposer());
    this.disposers = [];
  }
  formatEventLog({ eventName, eventSource, handlerArgs }) {
    var _a3;
    const [event, ...args] = handlerArgs;
    if (typeof this.format === "function") {
      return this.format({ args, event, eventName, eventSource });
    }
    const formatter = (_a3 = this.formatters[eventSource]) == null ? void 0 : _a3[eventName];
    let formattedArgs = args;
    if (typeof formatter === "function") {
      formattedArgs = formatter({ args, event, eventName, eventSource });
    }
    if (!formattedArgs) {
      return void 0;
    }
    const eventData = {};
    if (Array.isArray(formattedArgs)) {
      eventData.args = formattedArgs;
    } else if (typeof formattedArgs === "object") {
      Object.assign(eventData, formattedArgs);
    }
    if (eventSource === "webContents") {
      Object.assign(eventData, this.getWebContentsDetails(event == null ? void 0 : event.sender));
    }
    const title = this.format.replace("{eventSource}", eventSource === "app" ? "App" : "WebContents").replace("{eventName}", eventName);
    return [title, eventData];
  }
  getEventNames(eventMap) {
    if (!eventMap || typeof eventMap !== "object") {
      return [];
    }
    return Object.entries(eventMap).filter(([_, listen]) => listen).map(([eventName]) => eventName);
  }
  getWebContentsDetails(webContents) {
    if (!(webContents == null ? void 0 : webContents.loadURL)) {
      return {};
    }
    try {
      return {
        webContents: {
          id: webContents.id,
          url: webContents.getURL()
        }
      };
    } catch {
      return {};
    }
  }
  handleEvent({ eventName, eventSource, handlerArgs }) {
    var _a3;
    const log2 = this.formatEventLog({ eventName, eventSource, handlerArgs });
    if (log2) {
      const logFns = this.scope ? this.logger.scope(this.scope) : this.logger;
      (_a3 = logFns == null ? void 0 : logFns[this.level]) == null ? void 0 : _a3.call(logFns, ...log2);
    }
  }
};
var EventLogger_1 = EventLogger$1;
var transform_1 = { transform: transform$6 };
function transform$6({
  logger,
  message,
  transport,
  initialData = (message == null ? void 0 : message.data) || [],
  transforms = transport == null ? void 0 : transport.transforms
}) {
  return transforms.reduce((data, trans) => {
    if (typeof trans === "function") {
      return trans({ data, logger, message, transport });
    }
    return data;
  }, initialData);
}
const { transform: transform$5 } = transform_1;
var format$2 = {
  concatFirstStringElements: concatFirstStringElements$2,
  format({ message, logger, transport, data = message == null ? void 0 : message.data }) {
    switch (typeof transport.format) {
      case "string": {
        return transform$5({
          message,
          logger,
          transforms: [formatVariables, formatScope, formatText],
          transport,
          initialData: [transport.format, ...data]
        });
      }
      case "function": {
        return transport.format({
          data,
          level: (message == null ? void 0 : message.level) || "info",
          logger,
          message,
          transport
        });
      }
      default: {
        return data;
      }
    }
  }
};
function concatFirstStringElements$2({ data }) {
  if (typeof data[0] !== "string" || typeof data[1] !== "string") {
    return data;
  }
  if (data[0].match(/%[1cdfiOos]/)) {
    return data;
  }
  return [`${data[0]} ${data[1]}`, ...data.slice(2)];
}
function timeZoneFromOffset(minutesOffset) {
  const minutesPositive = Math.abs(minutesOffset);
  const sign = minutesOffset > 0 ? "-" : "+";
  const hours = Math.floor(minutesPositive / 60).toString().padStart(2, "0");
  const minutes = (minutesPositive % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}
function formatScope({ data, logger, message }) {
  const { defaultLabel, labelLength } = (logger == null ? void 0 : logger.scope) || {};
  const template = data[0];
  let label = message.scope;
  if (!label) {
    label = defaultLabel;
  }
  let scopeText;
  if (label === "") {
    scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
  } else if (typeof label === "string") {
    scopeText = ` (${label})`.padEnd(labelLength + 3);
  } else {
    scopeText = "";
  }
  data[0] = template.replace("{scope}", scopeText);
  return data;
}
function formatVariables({ data, message }) {
  let template = data[0];
  if (typeof template !== "string") {
    return data;
  }
  template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
  const date2 = message.date || /* @__PURE__ */ new Date();
  data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
    var _a3;
    switch (name) {
      case "level":
        return message.level || "info";
      case "logId":
        return message.logId;
      case "y":
        return date2.getFullYear().toString(10);
      case "m":
        return (date2.getMonth() + 1).toString(10).padStart(2, "0");
      case "d":
        return date2.getDate().toString(10).padStart(2, "0");
      case "h":
        return date2.getHours().toString(10).padStart(2, "0");
      case "i":
        return date2.getMinutes().toString(10).padStart(2, "0");
      case "s":
        return date2.getSeconds().toString(10).padStart(2, "0");
      case "ms":
        return date2.getMilliseconds().toString(10).padStart(3, "0");
      case "z":
        return timeZoneFromOffset(date2.getTimezoneOffset());
      case "iso":
        return date2.toISOString();
      default: {
        return ((_a3 = message.variables) == null ? void 0 : _a3[name]) || substring;
      }
    }
  }).trim();
  return data;
}
function formatText({ data }) {
  const template = data[0];
  if (typeof template !== "string") {
    return data;
  }
  const textTplPosition = template.lastIndexOf("{text}");
  if (textTplPosition === template.length - 6) {
    data[0] = template.replace(/\s?{text}/, "");
    if (data[0] === "") {
      data.shift();
    }
    return data;
  }
  const templatePieces = template.split("{text}");
  let result = [];
  if (templatePieces[0] !== "") {
    result.push(templatePieces[0]);
  }
  result = result.concat(data.slice(1));
  if (templatePieces[1] !== "") {
    result.push(templatePieces[1]);
  }
  return result;
}
var object = { exports: {} };
(function(module2) {
  const util2 = require$$1$2;
  module2.exports = {
    serialize,
    maxDepth({ data, transport, depth = (transport == null ? void 0 : transport.depth) ?? 6 }) {
      if (!data) {
        return data;
      }
      if (depth < 1) {
        if (Array.isArray(data)) return "[array]";
        if (typeof data === "object" && data) return "[object]";
        return data;
      }
      if (Array.isArray(data)) {
        return data.map((child) => module2.exports.maxDepth({
          data: child,
          depth: depth - 1
        }));
      }
      if (typeof data !== "object") {
        return data;
      }
      if (data && typeof data.toISOString === "function") {
        return data;
      }
      if (data === null) {
        return null;
      }
      if (data instanceof Error) {
        return data;
      }
      const newJson = {};
      for (const i in data) {
        if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
        newJson[i] = module2.exports.maxDepth({
          data: data[i],
          depth: depth - 1
        });
      }
      return newJson;
    },
    toJSON({ data }) {
      return JSON.parse(JSON.stringify(data, createSerializer()));
    },
    toString({ data, transport }) {
      const inspectOptions = (transport == null ? void 0 : transport.inspectOptions) || {};
      const simplifiedData = data.map((item) => {
        if (item === void 0) {
          return void 0;
        }
        try {
          const str2 = JSON.stringify(item, createSerializer(), "  ");
          return str2 === void 0 ? void 0 : JSON.parse(str2);
        } catch (e) {
          return item;
        }
      });
      return util2.formatWithOptions(inspectOptions, ...simplifiedData);
    }
  };
  function createSerializer(options = {}) {
    const seen = /* @__PURE__ */ new WeakSet();
    return function(key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return void 0;
        }
        seen.add(value);
      }
      return serialize(key, value, options);
    };
  }
  function serialize(key, value, options = {}) {
    const serializeMapAndSet = (options == null ? void 0 : options.serializeMapAndSet) !== false;
    if (value instanceof Error) {
      return value.stack;
    }
    if (!value) {
      return value;
    }
    if (typeof value === "function") {
      return `[function] ${value.toString()}`;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
      return Object.fromEntries(value);
    }
    if (serializeMapAndSet && value instanceof Set && Array.from) {
      return Array.from(value);
    }
    return value;
  }
})(object);
var objectExports = object.exports;
var style = {
  applyAnsiStyles({ data }) {
    return transformStyles(data, styleToAnsi, resetAnsiStyle);
  },
  removeStyles({ data }) {
    return transformStyles(data, () => "");
  }
};
const ANSI_COLORS = {
  unset: "\x1B[0m",
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m"
};
function styleToAnsi(style2) {
  const color = style2.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
  return ANSI_COLORS[color] || "";
}
function resetAnsiStyle(string2) {
  return string2 + ANSI_COLORS.unset;
}
function transformStyles(data, onStyleFound, onStyleApplied) {
  const foundStyles = {};
  return data.reduce((result, item, index2, array2) => {
    if (foundStyles[index2]) {
      return result;
    }
    if (typeof item === "string") {
      let valueIndex = index2;
      let styleApplied = false;
      item = item.replace(/%[1cdfiOos]/g, (match) => {
        valueIndex += 1;
        if (match !== "%c") {
          return match;
        }
        const style2 = array2[valueIndex];
        if (typeof style2 === "string") {
          foundStyles[valueIndex] = true;
          styleApplied = true;
          return onStyleFound(style2, item);
        }
        return match;
      });
      if (styleApplied && onStyleApplied) {
        item = onStyleApplied(item);
      }
    }
    result.push(item);
    return result;
  }, []);
}
const {
  concatFirstStringElements: concatFirstStringElements$1,
  format: format$1
} = format$2;
const { maxDepth: maxDepth$2, toJSON: toJSON$2 } = objectExports;
const {
  applyAnsiStyles,
  removeStyles: removeStyles$2
} = style;
const { transform: transform$4 } = transform_1;
const consoleMethods = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  verbose: console.info,
  debug: console.debug,
  silly: console.debug,
  log: console.log
};
var console_1 = consoleTransportFactory;
const separator = process.platform === "win32" ? ">" : "›";
const DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${separator} {text}`;
Object.assign(consoleTransportFactory, {
  DEFAULT_FORMAT
});
function consoleTransportFactory(logger) {
  return Object.assign(transport, {
    colorMap: {
      error: "red",
      warn: "yellow",
      info: "cyan",
      verbose: "unset",
      debug: "gray",
      silly: "gray",
      default: "unset"
    },
    format: DEFAULT_FORMAT,
    level: "silly",
    transforms: [
      addTemplateColors,
      format$1,
      formatStyles,
      concatFirstStringElements$1,
      maxDepth$2,
      toJSON$2
    ],
    useStyles: process.env.FORCE_STYLES,
    writeFn({ message }) {
      const consoleLogFn = consoleMethods[message.level] || consoleMethods.info;
      consoleLogFn(...message.data);
    }
  });
  function transport(message) {
    const data = transform$4({ logger, message, transport });
    transport.writeFn({
      message: { ...message, data }
    });
  }
}
function addTemplateColors({ data, message, transport }) {
  if (typeof transport.format !== "string" || !transport.format.includes("%c")) {
    return data;
  }
  return [
    `color:${levelToStyle(message.level, transport)}`,
    "color:unset",
    ...data
  ];
}
function canUseStyles(useStyleValue, level) {
  if (typeof useStyleValue === "boolean") {
    return useStyleValue;
  }
  const useStderr = level === "error" || level === "warn";
  const stream2 = useStderr ? process.stderr : process.stdout;
  return stream2 && stream2.isTTY;
}
function formatStyles(args) {
  const { message, transport } = args;
  const useStyles = canUseStyles(transport.useStyles, message.level);
  const nextTransform = useStyles ? applyAnsiStyles : removeStyles$2;
  return nextTransform(args);
}
function levelToStyle(level, transport) {
  return transport.colorMap[level] || transport.colorMap.default;
}
const EventEmitter$2 = require$$4;
const fs$3 = fs$a;
const os$1 = require$$1$1;
let File$2 = class File extends EventEmitter$2 {
  constructor({
    path: path2,
    writeOptions = { encoding: "utf8", flag: "a", mode: 438 },
    writeAsync = false
  }) {
    super();
    __publicField(this, "asyncWriteQueue", []);
    __publicField(this, "bytesWritten", 0);
    __publicField(this, "hasActiveAsyncWriting", false);
    __publicField(this, "path", null);
    __publicField(this, "initialSize");
    __publicField(this, "writeOptions", null);
    __publicField(this, "writeAsync", false);
    this.path = path2;
    this.writeOptions = writeOptions;
    this.writeAsync = writeAsync;
  }
  get size() {
    return this.getSize();
  }
  clear() {
    try {
      fs$3.writeFileSync(this.path, "", {
        mode: this.writeOptions.mode,
        flag: "w"
      });
      this.reset();
      return true;
    } catch (e) {
      if (e.code === "ENOENT") {
        return true;
      }
      this.emit("error", e, this);
      return false;
    }
  }
  crop(bytesAfter) {
    try {
      const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
      this.clear();
      this.writeLine(`[log cropped]${os$1.EOL}${content}`);
    } catch (e) {
      this.emit(
        "error",
        new Error(`Couldn't crop file ${this.path}. ${e.message}`),
        this
      );
    }
  }
  getSize() {
    if (this.initialSize === void 0) {
      try {
        const stats = fs$3.statSync(this.path);
        this.initialSize = stats.size;
      } catch (e) {
        this.initialSize = 0;
      }
    }
    return this.initialSize + this.bytesWritten;
  }
  increaseBytesWrittenCounter(text) {
    this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
  }
  isNull() {
    return false;
  }
  nextAsyncWrite() {
    const file2 = this;
    if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) {
      return;
    }
    const text = this.asyncWriteQueue.join("");
    this.asyncWriteQueue = [];
    this.hasActiveAsyncWriting = true;
    fs$3.writeFile(this.path, text, this.writeOptions, (e) => {
      file2.hasActiveAsyncWriting = false;
      if (e) {
        file2.emit(
          "error",
          new Error(`Couldn't write to ${file2.path}. ${e.message}`),
          this
        );
      } else {
        file2.increaseBytesWrittenCounter(text);
      }
      file2.nextAsyncWrite();
    });
  }
  reset() {
    this.initialSize = void 0;
    this.bytesWritten = 0;
  }
  toString() {
    return this.path;
  }
  writeLine(text) {
    text += os$1.EOL;
    if (this.writeAsync) {
      this.asyncWriteQueue.push(text);
      this.nextAsyncWrite();
      return;
    }
    try {
      fs$3.writeFileSync(this.path, text, this.writeOptions);
      this.increaseBytesWrittenCounter(text);
    } catch (e) {
      this.emit(
        "error",
        new Error(`Couldn't write to ${this.path}. ${e.message}`),
        this
      );
    }
  }
};
var File_1 = File$2;
function readFileSyncFromEnd(filePath, bytesCount) {
  const buffer = Buffer.alloc(bytesCount);
  const stats = fs$3.statSync(filePath);
  const readLength = Math.min(stats.size, bytesCount);
  const offset = Math.max(0, stats.size - bytesCount);
  const fd = fs$3.openSync(filePath, "r");
  const totalBytes = fs$3.readSync(fd, buffer, 0, readLength, offset);
  fs$3.closeSync(fd);
  return buffer.toString("utf8", 0, totalBytes);
}
const File$1 = File_1;
let NullFile$1 = class NullFile extends File$1 {
  clear() {
  }
  crop() {
  }
  getSize() {
    return 0;
  }
  isNull() {
    return true;
  }
  writeLine() {
  }
};
var NullFile_1 = NullFile$1;
const EventEmitter$1 = require$$4;
const fs$2 = fs$a;
const path$1 = path$7;
const File2 = File_1;
const NullFile2 = NullFile_1;
let FileRegistry$1 = class FileRegistry extends EventEmitter$1 {
  constructor() {
    super();
    __publicField(this, "store", {});
    this.emitError = this.emitError.bind(this);
  }
  /**
   * Provide a File object corresponding to the filePath
   * @param {string} filePath
   * @param {WriteOptions} [writeOptions]
   * @param {boolean} [writeAsync]
   * @return {File}
   */
  provide({ filePath, writeOptions = {}, writeAsync = false }) {
    let file2;
    try {
      filePath = path$1.resolve(filePath);
      if (this.store[filePath]) {
        return this.store[filePath];
      }
      file2 = this.createFile({ filePath, writeOptions, writeAsync });
    } catch (e) {
      file2 = new NullFile2({ path: filePath });
      this.emitError(e, file2);
    }
    file2.on("error", this.emitError);
    this.store[filePath] = file2;
    return file2;
  }
  /**
   * @param {string} filePath
   * @param {WriteOptions} writeOptions
   * @param {boolean} async
   * @return {File}
   * @private
   */
  createFile({ filePath, writeOptions, writeAsync }) {
    this.testFileWriting({ filePath, writeOptions });
    return new File2({ path: filePath, writeOptions, writeAsync });
  }
  /**
   * @param {Error} error
   * @param {File} file
   * @private
   */
  emitError(error, file2) {
    this.emit("error", error, file2);
  }
  /**
   * @param {string} filePath
   * @param {WriteOptions} writeOptions
   * @private
   */
  testFileWriting({ filePath, writeOptions }) {
    fs$2.mkdirSync(path$1.dirname(filePath), { recursive: true });
    fs$2.writeFileSync(filePath, "", { flag: "a", mode: writeOptions.mode });
  }
};
var FileRegistry_1 = FileRegistry$1;
const fs$1 = fs$a;
const os = require$$1$1;
const path = path$7;
const FileRegistry2 = FileRegistry_1;
const { transform: transform$3 } = transform_1;
const { removeStyles: removeStyles$1 } = style;
const {
  format,
  concatFirstStringElements
} = format$2;
const { toString: toString2 } = objectExports;
var file = fileTransportFactory;
const globalRegistry$1 = new FileRegistry2();
function fileTransportFactory(logger, { registry: registry2 = globalRegistry$1, externalApi: externalApi2 } = {}) {
  let pathVariables;
  if (registry2.listenerCount("error") < 1) {
    registry2.on("error", (e, file2) => {
      logConsole(`Can't write to ${file2}`, e);
    });
  }
  return Object.assign(transport, {
    fileName: getDefaultFileName(logger.variables.processType),
    format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
    getFile,
    inspectOptions: { depth: 5 },
    level: "silly",
    maxSize: 1024 ** 2,
    readAllLogs,
    sync: true,
    transforms: [removeStyles$1, format, concatFirstStringElements, toString2],
    writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
    archiveLogFn(file2) {
      const oldPath = file2.toString();
      const inf = path.parse(oldPath);
      try {
        fs$1.renameSync(oldPath, path.join(inf.dir, `${inf.name}.old${inf.ext}`));
      } catch (e) {
        logConsole("Could not rotate log", e);
        const quarterOfMaxSize = Math.round(transport.maxSize / 4);
        file2.crop(Math.min(quarterOfMaxSize, 256 * 1024));
      }
    },
    resolvePathFn(vars) {
      return path.join(vars.libraryDefaultDir, vars.fileName);
    },
    setAppName(name) {
      logger.dependencies.externalApi.setAppName(name);
    }
  });
  function transport(message) {
    const file2 = getFile(message);
    const needLogRotation = transport.maxSize > 0 && file2.size > transport.maxSize;
    if (needLogRotation) {
      transport.archiveLogFn(file2);
      file2.reset();
    }
    const content = transform$3({ logger, message, transport });
    file2.writeLine(content);
  }
  function initializeOnFirstAccess() {
    if (pathVariables) {
      return;
    }
    pathVariables = Object.create(
      Object.prototype,
      {
        ...Object.getOwnPropertyDescriptors(
          externalApi2.getPathVariables()
        ),
        fileName: {
          get() {
            return transport.fileName;
          },
          enumerable: true
        }
      }
    );
    if (typeof transport.archiveLog === "function") {
      transport.archiveLogFn = transport.archiveLog;
      logConsole("archiveLog is deprecated. Use archiveLogFn instead");
    }
    if (typeof transport.resolvePath === "function") {
      transport.resolvePathFn = transport.resolvePath;
      logConsole("resolvePath is deprecated. Use resolvePathFn instead");
    }
  }
  function logConsole(message, error = null, level = "error") {
    const data = [`electron-log.transports.file: ${message}`];
    if (error) {
      data.push(error);
    }
    logger.transports.console({ data, date: /* @__PURE__ */ new Date(), level });
  }
  function getFile(msg) {
    initializeOnFirstAccess();
    const filePath = transport.resolvePathFn(pathVariables, msg);
    return registry2.provide({
      filePath,
      writeAsync: !transport.sync,
      writeOptions: transport.writeOptions
    });
  }
  function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
    initializeOnFirstAccess();
    const logsPath = path.dirname(transport.resolvePathFn(pathVariables));
    if (!fs$1.existsSync(logsPath)) {
      return [];
    }
    return fs$1.readdirSync(logsPath).map((fileName) => path.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
      try {
        return {
          path: logPath,
          lines: fs$1.readFileSync(logPath, "utf8").split(os.EOL)
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
}
function getDefaultFileName(processType = process.type) {
  switch (processType) {
    case "renderer":
      return "renderer.log";
    case "worker":
      return "worker.log";
    default:
      return "main.log";
  }
}
const { maxDepth: maxDepth$1, toJSON: toJSON$1 } = objectExports;
const { transform: transform$2 } = transform_1;
var ipc = ipcTransportFactory;
function ipcTransportFactory(logger, { externalApi: externalApi2 }) {
  Object.assign(transport, {
    depth: 3,
    eventId: "__ELECTRON_LOG_IPC__",
    level: logger.isDev ? "silly" : false,
    transforms: [toJSON$1, maxDepth$1]
  });
  return (externalApi2 == null ? void 0 : externalApi2.isElectron()) ? transport : void 0;
  function transport(message) {
    var _a3;
    if (((_a3 = message == null ? void 0 : message.variables) == null ? void 0 : _a3.processType) === "renderer") {
      return;
    }
    externalApi2 == null ? void 0 : externalApi2.sendIpc(transport.eventId, {
      ...message,
      data: transform$2({ logger, message, transport })
    });
  }
}
const http = http$1;
const https = require$$1$4;
const { transform: transform$1 } = transform_1;
const { removeStyles } = style;
const { toJSON, maxDepth } = objectExports;
var remote = remoteTransportFactory;
function remoteTransportFactory(logger) {
  return Object.assign(transport, {
    client: { name: "electron-application" },
    depth: 6,
    level: false,
    requestOptions: {},
    transforms: [removeStyles, toJSON, maxDepth],
    makeBodyFn({ message }) {
      return JSON.stringify({
        client: transport.client,
        data: message.data,
        date: message.date.getTime(),
        level: message.level,
        scope: message.scope,
        variables: message.variables
      });
    },
    processErrorFn({ error }) {
      logger.processMessage(
        {
          data: [`electron-log: can't POST ${transport.url}`, error],
          level: "warn"
        },
        { transports: ["console", "file"] }
      );
    },
    sendRequestFn({ serverUrl, requestOptions, body }) {
      const httpTransport = serverUrl.startsWith("https:") ? https : http;
      const request = httpTransport.request(serverUrl, {
        method: "POST",
        ...requestOptions,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
          ...requestOptions.headers
        }
      });
      request.write(body);
      request.end();
      return request;
    }
  });
  function transport(message) {
    if (!transport.url) {
      return;
    }
    const body = transport.makeBodyFn({
      logger,
      message: { ...message, data: transform$1({ logger, message, transport }) },
      transport
    });
    const request = transport.sendRequestFn({
      serverUrl: transport.url,
      requestOptions: transport.requestOptions,
      body: Buffer.from(body, "utf8")
    });
    request.on("error", (error) => transport.processErrorFn({
      error,
      logger,
      message,
      request,
      transport
    }));
  }
}
const Logger = Logger_1;
const ErrorHandler2 = ErrorHandler_1;
const EventLogger2 = EventLogger_1;
const transportConsole = console_1;
const transportFile = file;
const transportIpc = ipc;
const transportRemote = remote;
var createDefaultLogger_1 = createDefaultLogger$1;
function createDefaultLogger$1({ dependencies, initializeFn }) {
  var _a3;
  const defaultLogger2 = new Logger({
    dependencies,
    errorHandler: new ErrorHandler2(),
    eventLogger: new EventLogger2(),
    initializeFn,
    isDev: (_a3 = dependencies.externalApi) == null ? void 0 : _a3.isDev(),
    logId: "default",
    transportFactories: {
      console: transportConsole,
      file: transportFile,
      ipc: transportIpc,
      remote: transportRemote
    },
    variables: {
      processType: "main"
    }
  });
  defaultLogger2.default = defaultLogger2;
  defaultLogger2.Logger = Logger;
  defaultLogger2.processInternalErrorFn = (e) => {
    defaultLogger2.transports.console.writeFn({
      message: {
        data: ["Unhandled electron-log error", e],
        level: "error"
      }
    });
  };
  return defaultLogger2;
}
const electron = require$$0$1;
const ElectronExternalApi2 = ElectronExternalApi_1;
const { initialize } = initialize$1;
const createDefaultLogger = createDefaultLogger_1;
const externalApi = new ElectronExternalApi2({ electron });
const defaultLogger = createDefaultLogger({
  dependencies: { externalApi },
  initializeFn: initialize
});
var main$1 = defaultLogger;
externalApi.onIpc("__ELECTRON_LOG__", (_, message) => {
  if (message.scope) {
    defaultLogger.Logger.getInstance(message).scope(message.scope);
  }
  const date2 = new Date(message.date);
  processMessage({
    ...message,
    date: date2.getTime() ? date2 : /* @__PURE__ */ new Date()
  });
});
externalApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
  switch (cmd) {
    case "getOptions": {
      const logger = defaultLogger.Logger.getInstance({ logId });
      return {
        levels: logger.levels,
        logId
      };
    }
    default: {
      processMessage({ data: [`Unknown cmd '${cmd}'`], level: "error" });
      return {};
    }
  }
});
function processMessage(message) {
  var _a3;
  (_a3 = defaultLogger.Logger.getInstance(message)) == null ? void 0 : _a3.processMessage(message);
}
const main = main$1;
var main_1 = main;
const log = /* @__PURE__ */ getDefaultExportFromCjs$1(main_1);
function getLogFilePath() {
  return log.transports.file.getFile().path;
}
var yazl = {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
const CRC_TABLE = new Int32Array([
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
]);
function ensureBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (typeof input === "number") {
    return Buffer.alloc(input);
  } else if (typeof input === "string") {
    return Buffer.from(input);
  } else {
    throw new Error("input must be buffer, number, or string, received " + typeof input);
  }
}
function bufferizeInt(num) {
  const tmp = ensureBuffer(4);
  tmp.writeInt32BE(num, 0);
  return tmp;
}
function _crc32(buf, previous) {
  buf = ensureBuffer(buf);
  if (Buffer.isBuffer(previous)) {
    previous = previous.readUInt32BE(0);
  }
  let crc = ~~previous ^ -1;
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
const index = /* @__PURE__ */ getDefaultExportFromCjs(bufferCrc32);
var dist = index;
var fs = fs$a;
var Transform = require$$6.Transform;
var PassThrough = require$$6.PassThrough;
var zlib = require$$1$3;
var util = require$$1$2;
var EventEmitter = require$$4.EventEmitter;
var errorMonitor = require$$4.errorMonitor;
var crc32 = dist;
yazl.ZipFile = ZipFile;
yazl.dateToDosDateTime = dateToDosDateTime;
util.inherits(ZipFile, EventEmitter);
function ZipFile() {
  this.outputStream = new PassThrough();
  this.entries = [];
  this.outputStreamCursor = 0;
  this.ended = false;
  this.allDone = false;
  this.forceZip64Eocd = false;
  this.errored = false;
  this.on(errorMonitor, function() {
    this.errored = true;
  });
}
ZipFile.prototype.addFile = function(realPath, metadataPath, options) {
  var self2 = this;
  metadataPath = validateMetadataPath(metadataPath, false);
  if (options == null) options = {};
  if (shouldIgnoreAdding(self2)) return;
  var entry = new Entry(metadataPath, false, options);
  self2.entries.push(entry);
  fs.stat(realPath, function(err, stats) {
    if (err) return self2.emit("error", err);
    if (!stats.isFile()) return self2.emit("error", new Error("not a file: " + realPath));
    entry.uncompressedSize = stats.size;
    if (options.mtime == null) entry.setLastModDate(stats.mtime);
    if (options.mode == null) entry.setFileAttributesMode(stats.mode);
    entry.setFileDataPumpFunction(function() {
      var readStream = fs.createReadStream(realPath);
      entry.state = Entry.FILE_DATA_IN_PROGRESS;
      readStream.on("error", function(err2) {
        self2.emit("error", err2);
      });
      pumpFileDataReadStream(self2, entry, readStream);
    });
    pumpEntries(self2);
  });
};
ZipFile.prototype.addReadStream = function(readStream, metadataPath, options) {
  this.addReadStreamLazy(metadataPath, options, function(cb) {
    cb(null, readStream);
  });
};
ZipFile.prototype.addReadStreamLazy = function(metadataPath, options, getReadStreamFunction) {
  var self2 = this;
  if (typeof options === "function") {
    getReadStreamFunction = options;
    options = null;
  }
  if (options == null) options = {};
  metadataPath = validateMetadataPath(metadataPath, false);
  if (shouldIgnoreAdding(self2)) return;
  var entry = new Entry(metadataPath, false, options);
  self2.entries.push(entry);
  entry.setFileDataPumpFunction(function() {
    entry.state = Entry.FILE_DATA_IN_PROGRESS;
    getReadStreamFunction(function(err, readStream) {
      if (err) return self2.emit("error", err);
      pumpFileDataReadStream(self2, entry, readStream);
    });
  });
  pumpEntries(self2);
};
ZipFile.prototype.addBuffer = function(buffer, metadataPath, options) {
  var self2 = this;
  metadataPath = validateMetadataPath(metadataPath, false);
  if (buffer.length > 1073741823) throw new Error("buffer too large: " + buffer.length + " > 1073741823");
  if (options == null) options = {};
  if (options.size != null) throw new Error("options.size not allowed");
  if (shouldIgnoreAdding(self2)) return;
  var entry = new Entry(metadataPath, false, options);
  entry.uncompressedSize = buffer.length;
  entry.crc32 = crc32.unsigned(buffer);
  entry.crcAndFileSizeKnown = true;
  self2.entries.push(entry);
  if (entry.compressionLevel === 0) {
    setCompressedBuffer(buffer);
  } else {
    zlib.deflateRaw(buffer, { level: entry.compressionLevel }, function(err, compressedBuffer) {
      setCompressedBuffer(compressedBuffer);
    });
  }
  function setCompressedBuffer(compressedBuffer) {
    entry.compressedSize = compressedBuffer.length;
    entry.setFileDataPumpFunction(function() {
      writeToOutputStream(self2, compressedBuffer);
      writeToOutputStream(self2, entry.getDataDescriptor());
      entry.state = Entry.FILE_DATA_DONE;
      setImmediate(function() {
        pumpEntries(self2);
      });
    });
    pumpEntries(self2);
  }
};
ZipFile.prototype.addEmptyDirectory = function(metadataPath, options) {
  var self2 = this;
  metadataPath = validateMetadataPath(metadataPath, true);
  if (options == null) options = {};
  if (options.size != null) throw new Error("options.size not allowed");
  if (options.compress != null) throw new Error("options.compress not allowed");
  if (options.compressionLevel != null) throw new Error("options.compressionLevel not allowed");
  if (shouldIgnoreAdding(self2)) return;
  var entry = new Entry(metadataPath, true, options);
  self2.entries.push(entry);
  entry.setFileDataPumpFunction(function() {
    writeToOutputStream(self2, entry.getDataDescriptor());
    entry.state = Entry.FILE_DATA_DONE;
    pumpEntries(self2);
  });
  pumpEntries(self2);
};
var eocdrSignatureBuffer = bufferFrom([80, 75, 5, 6]);
ZipFile.prototype.end = function(options, calculatedTotalSizeCallback) {
  if (typeof options === "function") {
    calculatedTotalSizeCallback = options;
    options = null;
  }
  if (options == null) options = {};
  if (this.ended) return;
  this.ended = true;
  if (this.errored) return;
  this.calculatedTotalSizeCallback = calculatedTotalSizeCallback;
  this.forceZip64Eocd = !!options.forceZip64Format;
  if (options.comment) {
    if (typeof options.comment === "string") {
      this.comment = encodeCp437(options.comment);
    } else {
      this.comment = options.comment;
    }
    if (this.comment.length > 65535) throw new Error("comment is too large");
    if (bufferIncludes(this.comment, eocdrSignatureBuffer)) throw new Error("comment contains end of central directory record signature");
  } else {
    this.comment = EMPTY_BUFFER;
  }
  pumpEntries(this);
};
function writeToOutputStream(self2, buffer) {
  self2.outputStream.write(buffer);
  self2.outputStreamCursor += buffer.length;
}
function pumpFileDataReadStream(self2, entry, readStream) {
  var crc32Watcher = new Crc32Watcher();
  var uncompressedSizeCounter = new ByteCounter();
  var compressor = entry.compressionLevel !== 0 ? new zlib.DeflateRaw({ level: entry.compressionLevel }) : new PassThrough();
  var compressedSizeCounter = new ByteCounter();
  readStream.pipe(crc32Watcher).pipe(uncompressedSizeCounter).pipe(compressor).pipe(compressedSizeCounter).pipe(self2.outputStream, { end: false });
  compressedSizeCounter.on("end", function() {
    entry.crc32 = crc32Watcher.crc32;
    if (entry.uncompressedSize == null) {
      entry.uncompressedSize = uncompressedSizeCounter.byteCount;
    } else {
      if (entry.uncompressedSize !== uncompressedSizeCounter.byteCount) return self2.emit("error", new Error("file data stream has unexpected number of bytes"));
    }
    entry.compressedSize = compressedSizeCounter.byteCount;
    self2.outputStreamCursor += entry.compressedSize;
    writeToOutputStream(self2, entry.getDataDescriptor());
    entry.state = Entry.FILE_DATA_DONE;
    pumpEntries(self2);
  });
}
function determineCompressionLevel(options) {
  if (options.compress != null && options.compressionLevel != null) {
    if (!!options.compress !== !!options.compressionLevel) throw new Error("conflicting settings for compress and compressionLevel");
  }
  if (options.compressionLevel != null) return options.compressionLevel;
  if (options.compress === false) return 0;
  return 6;
}
function pumpEntries(self2) {
  if (self2.allDone || self2.errored) return;
  if (self2.ended && self2.calculatedTotalSizeCallback != null) {
    var calculatedTotalSize = calculateTotalSize(self2);
    if (calculatedTotalSize != null) {
      self2.calculatedTotalSizeCallback(calculatedTotalSize);
      self2.calculatedTotalSizeCallback = null;
    }
  }
  var entry = getFirstNotDoneEntry();
  function getFirstNotDoneEntry() {
    for (var i = 0; i < self2.entries.length; i++) {
      var entry2 = self2.entries[i];
      if (entry2.state < Entry.FILE_DATA_DONE) return entry2;
    }
    return null;
  }
  if (entry != null) {
    if (entry.state < Entry.READY_TO_PUMP_FILE_DATA) return;
    if (entry.state === Entry.FILE_DATA_IN_PROGRESS) return;
    entry.relativeOffsetOfLocalHeader = self2.outputStreamCursor;
    var localFileHeader = entry.getLocalFileHeader();
    writeToOutputStream(self2, localFileHeader);
    entry.doFileDataPump();
  } else {
    if (self2.ended) {
      self2.offsetOfStartOfCentralDirectory = self2.outputStreamCursor;
      self2.entries.forEach(function(entry2) {
        var centralDirectoryRecord = entry2.getCentralDirectoryRecord();
        writeToOutputStream(self2, centralDirectoryRecord);
      });
      writeToOutputStream(self2, getEndOfCentralDirectoryRecord(self2));
      self2.outputStream.end();
      self2.allDone = true;
    }
  }
}
function calculateTotalSize(self2) {
  var pretendOutputCursor = 0;
  var centralDirectorySize = 0;
  for (var i = 0; i < self2.entries.length; i++) {
    var entry = self2.entries[i];
    if (entry.compressionLevel !== 0) return -1;
    if (entry.state >= Entry.READY_TO_PUMP_FILE_DATA) {
      if (entry.uncompressedSize == null) return -1;
    } else {
      if (entry.uncompressedSize == null) return null;
    }
    entry.relativeOffsetOfLocalHeader = pretendOutputCursor;
    var useZip64Format = entry.useZip64Format();
    pretendOutputCursor += LOCAL_FILE_HEADER_FIXED_SIZE + entry.utf8FileName.length;
    pretendOutputCursor += entry.uncompressedSize;
    if (!entry.crcAndFileSizeKnown) {
      if (useZip64Format) {
        pretendOutputCursor += ZIP64_DATA_DESCRIPTOR_SIZE;
      } else {
        pretendOutputCursor += DATA_DESCRIPTOR_SIZE;
      }
    }
    centralDirectorySize += CENTRAL_DIRECTORY_RECORD_FIXED_SIZE + entry.utf8FileName.length + entry.fileComment.length;
    if (!entry.forceDosTimestamp) {
      centralDirectorySize += INFO_ZIP_UNIVERSAL_TIMESTAMP_EXTRA_FIELD_SIZE;
    }
    if (useZip64Format) {
      centralDirectorySize += ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE;
    }
  }
  var endOfCentralDirectorySize = 0;
  if (self2.forceZip64Eocd || self2.entries.length >= 65535 || centralDirectorySize >= 65535 || pretendOutputCursor >= 4294967295) {
    endOfCentralDirectorySize += ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE;
  }
  endOfCentralDirectorySize += END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + self2.comment.length;
  return pretendOutputCursor + centralDirectorySize + endOfCentralDirectorySize;
}
function shouldIgnoreAdding(self2) {
  if (self2.ended) throw new Error("cannot add entries after calling end()");
  if (self2.errored) return true;
  return false;
}
var ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 56;
var ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE = 20;
var END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 22;
function getEndOfCentralDirectoryRecord(self2, actuallyJustTellMeHowLongItWouldBe) {
  var needZip64Format = false;
  var normalEntriesLength = self2.entries.length;
  if (self2.forceZip64Eocd || self2.entries.length >= 65535) {
    normalEntriesLength = 65535;
    needZip64Format = true;
  }
  var sizeOfCentralDirectory = self2.outputStreamCursor - self2.offsetOfStartOfCentralDirectory;
  var normalSizeOfCentralDirectory = sizeOfCentralDirectory;
  if (self2.forceZip64Eocd || sizeOfCentralDirectory >= 4294967295) {
    normalSizeOfCentralDirectory = 4294967295;
    needZip64Format = true;
  }
  var normalOffsetOfStartOfCentralDirectory = self2.offsetOfStartOfCentralDirectory;
  if (self2.forceZip64Eocd || self2.offsetOfStartOfCentralDirectory >= 4294967295) {
    normalOffsetOfStartOfCentralDirectory = 4294967295;
    needZip64Format = true;
  }
  var eocdrBuffer = bufferAlloc(END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + self2.comment.length);
  eocdrBuffer.writeUInt32LE(101010256, 0);
  eocdrBuffer.writeUInt16LE(0, 4);
  eocdrBuffer.writeUInt16LE(0, 6);
  eocdrBuffer.writeUInt16LE(normalEntriesLength, 8);
  eocdrBuffer.writeUInt16LE(normalEntriesLength, 10);
  eocdrBuffer.writeUInt32LE(normalSizeOfCentralDirectory, 12);
  eocdrBuffer.writeUInt32LE(normalOffsetOfStartOfCentralDirectory, 16);
  eocdrBuffer.writeUInt16LE(self2.comment.length, 20);
  self2.comment.copy(eocdrBuffer, 22);
  if (!needZip64Format) return eocdrBuffer;
  var zip64EocdrBuffer = bufferAlloc(ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE);
  zip64EocdrBuffer.writeUInt32LE(101075792, 0);
  writeUInt64LE(zip64EocdrBuffer, ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE - 12, 4);
  zip64EocdrBuffer.writeUInt16LE(VERSION_MADE_BY, 12);
  zip64EocdrBuffer.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_ZIP64, 14);
  zip64EocdrBuffer.writeUInt32LE(0, 16);
  zip64EocdrBuffer.writeUInt32LE(0, 20);
  writeUInt64LE(zip64EocdrBuffer, self2.entries.length, 24);
  writeUInt64LE(zip64EocdrBuffer, self2.entries.length, 32);
  writeUInt64LE(zip64EocdrBuffer, sizeOfCentralDirectory, 40);
  writeUInt64LE(zip64EocdrBuffer, self2.offsetOfStartOfCentralDirectory, 48);
  var zip64EocdlBuffer = bufferAlloc(ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE);
  zip64EocdlBuffer.writeUInt32LE(117853008, 0);
  zip64EocdlBuffer.writeUInt32LE(0, 4);
  writeUInt64LE(zip64EocdlBuffer, self2.outputStreamCursor, 8);
  zip64EocdlBuffer.writeUInt32LE(1, 16);
  return Buffer.concat([
    zip64EocdrBuffer,
    zip64EocdlBuffer,
    eocdrBuffer
  ]);
}
function validateMetadataPath(metadataPath, isDirectory) {
  if (metadataPath === "") throw new Error("empty metadataPath");
  metadataPath = metadataPath.replace(/\\/g, "/");
  if (/^[a-zA-Z]:/.test(metadataPath) || /^\//.test(metadataPath)) throw new Error("absolute path: " + metadataPath);
  if (metadataPath.split("/").indexOf("..") !== -1) throw new Error("invalid relative path: " + metadataPath);
  var looksLikeDirectory = /\/$/.test(metadataPath);
  if (isDirectory) {
    if (!looksLikeDirectory) metadataPath += "/";
  } else {
    if (looksLikeDirectory) throw new Error("file path cannot end with '/': " + metadataPath);
  }
  return metadataPath;
}
var EMPTY_BUFFER = bufferAlloc(0);
function Entry(metadataPath, isDirectory, options) {
  this.utf8FileName = bufferFrom(metadataPath);
  if (this.utf8FileName.length > 65535) throw new Error("utf8 file name too long. " + utf8FileName.length + " > 65535");
  this.isDirectory = isDirectory;
  this.state = Entry.WAITING_FOR_METADATA;
  this.setLastModDate(options.mtime != null ? options.mtime : /* @__PURE__ */ new Date());
  this.forceDosTimestamp = !!options.forceDosTimestamp;
  if (options.mode != null) {
    this.setFileAttributesMode(options.mode);
  } else {
    this.setFileAttributesMode(isDirectory ? 16893 : 33204);
  }
  if (isDirectory) {
    this.crcAndFileSizeKnown = true;
    this.crc32 = 0;
    this.uncompressedSize = 0;
    this.compressedSize = 0;
  } else {
    this.crcAndFileSizeKnown = false;
    this.crc32 = null;
    this.uncompressedSize = null;
    this.compressedSize = null;
    if (options.size != null) this.uncompressedSize = options.size;
  }
  if (isDirectory) {
    this.compressionLevel = 0;
  } else {
    this.compressionLevel = determineCompressionLevel(options);
  }
  this.forceZip64Format = !!options.forceZip64Format;
  if (options.fileComment) {
    if (typeof options.fileComment === "string") {
      this.fileComment = bufferFrom(options.fileComment, "utf-8");
    } else {
      this.fileComment = options.fileComment;
    }
    if (this.fileComment.length > 65535) throw new Error("fileComment is too large");
  } else {
    this.fileComment = EMPTY_BUFFER;
  }
}
Entry.WAITING_FOR_METADATA = 0;
Entry.READY_TO_PUMP_FILE_DATA = 1;
Entry.FILE_DATA_IN_PROGRESS = 2;
Entry.FILE_DATA_DONE = 3;
Entry.prototype.setLastModDate = function(date2) {
  this.mtime = date2;
  var dosDateTime = dateToDosDateTime(date2);
  this.lastModFileTime = dosDateTime.time;
  this.lastModFileDate = dosDateTime.date;
};
Entry.prototype.setFileAttributesMode = function(mode) {
  if ((mode & 65535) !== mode) throw new Error("invalid mode. expected: 0 <= " + mode + " <= 65535");
  this.externalFileAttributes = mode << 16 >>> 0;
};
Entry.prototype.setFileDataPumpFunction = function(doFileDataPump) {
  this.doFileDataPump = doFileDataPump;
  this.state = Entry.READY_TO_PUMP_FILE_DATA;
};
Entry.prototype.useZip64Format = function() {
  return this.forceZip64Format || this.uncompressedSize != null && this.uncompressedSize > 4294967294 || this.compressedSize != null && this.compressedSize > 4294967294 || this.relativeOffsetOfLocalHeader != null && this.relativeOffsetOfLocalHeader > 4294967294;
};
var LOCAL_FILE_HEADER_FIXED_SIZE = 30;
var VERSION_NEEDED_TO_EXTRACT_UTF8 = 20;
var VERSION_NEEDED_TO_EXTRACT_ZIP64 = 45;
var VERSION_MADE_BY = 3 << 8 | 63;
var FILE_NAME_IS_UTF8 = 1 << 11;
var UNKNOWN_CRC32_AND_FILE_SIZES = 1 << 3;
Entry.prototype.getLocalFileHeader = function() {
  var crc322 = 0;
  var compressedSize = 0;
  var uncompressedSize = 0;
  if (this.crcAndFileSizeKnown) {
    crc322 = this.crc32;
    compressedSize = this.compressedSize;
    uncompressedSize = this.uncompressedSize;
  }
  var fixedSizeStuff = bufferAlloc(LOCAL_FILE_HEADER_FIXED_SIZE);
  var generalPurposeBitFlag = FILE_NAME_IS_UTF8;
  if (!this.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;
  fixedSizeStuff.writeUInt32LE(67324752, 0);
  fixedSizeStuff.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_UTF8, 4);
  fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 6);
  fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 8);
  fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 10);
  fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 12);
  fixedSizeStuff.writeUInt32LE(crc322, 14);
  fixedSizeStuff.writeUInt32LE(compressedSize, 18);
  fixedSizeStuff.writeUInt32LE(uncompressedSize, 22);
  fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 26);
  fixedSizeStuff.writeUInt16LE(0, 28);
  return Buffer.concat([
    fixedSizeStuff,
    // file name (variable size)
    this.utf8FileName
    // extra field (variable size)
    // no extra fields
  ]);
};
var DATA_DESCRIPTOR_SIZE = 16;
var ZIP64_DATA_DESCRIPTOR_SIZE = 24;
Entry.prototype.getDataDescriptor = function() {
  if (this.crcAndFileSizeKnown) {
    return EMPTY_BUFFER;
  }
  if (!this.useZip64Format()) {
    var buffer = bufferAlloc(DATA_DESCRIPTOR_SIZE);
    buffer.writeUInt32LE(134695760, 0);
    buffer.writeUInt32LE(this.crc32, 4);
    buffer.writeUInt32LE(this.compressedSize, 8);
    buffer.writeUInt32LE(this.uncompressedSize, 12);
    return buffer;
  } else {
    var buffer = bufferAlloc(ZIP64_DATA_DESCRIPTOR_SIZE);
    buffer.writeUInt32LE(134695760, 0);
    buffer.writeUInt32LE(this.crc32, 4);
    writeUInt64LE(buffer, this.compressedSize, 8);
    writeUInt64LE(buffer, this.uncompressedSize, 16);
    return buffer;
  }
};
var CENTRAL_DIRECTORY_RECORD_FIXED_SIZE = 46;
var INFO_ZIP_UNIVERSAL_TIMESTAMP_EXTRA_FIELD_SIZE = 9;
var ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE = 28;
Entry.prototype.getCentralDirectoryRecord = function() {
  var fixedSizeStuff = bufferAlloc(CENTRAL_DIRECTORY_RECORD_FIXED_SIZE);
  var generalPurposeBitFlag = FILE_NAME_IS_UTF8;
  if (!this.crcAndFileSizeKnown) generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;
  var izutefBuffer = EMPTY_BUFFER;
  if (!this.forceDosTimestamp) {
    izutefBuffer = bufferAlloc(INFO_ZIP_UNIVERSAL_TIMESTAMP_EXTRA_FIELD_SIZE);
    izutefBuffer.writeUInt16LE(21589, 0);
    izutefBuffer.writeUInt16LE(INFO_ZIP_UNIVERSAL_TIMESTAMP_EXTRA_FIELD_SIZE - 4, 2);
    var EB_UT_FL_MTIME = 1 << 0;
    var EB_UT_FL_ATIME = 1 << 1;
    izutefBuffer.writeUInt8(EB_UT_FL_MTIME | EB_UT_FL_ATIME, 4);
    var timestamp2 = Math.floor(this.mtime.getTime() / 1e3);
    if (timestamp2 < -2147483648) timestamp2 = -2147483648;
    if (timestamp2 > 2147483647) timestamp2 = 2147483647;
    izutefBuffer.writeUInt32LE(timestamp2, 5);
  }
  var normalCompressedSize = this.compressedSize;
  var normalUncompressedSize = this.uncompressedSize;
  var normalRelativeOffsetOfLocalHeader = this.relativeOffsetOfLocalHeader;
  var versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_UTF8;
  var zeiefBuffer = EMPTY_BUFFER;
  if (this.useZip64Format()) {
    normalCompressedSize = 4294967295;
    normalUncompressedSize = 4294967295;
    normalRelativeOffsetOfLocalHeader = 4294967295;
    versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_ZIP64;
    zeiefBuffer = bufferAlloc(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE);
    zeiefBuffer.writeUInt16LE(1, 0);
    zeiefBuffer.writeUInt16LE(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE - 4, 2);
    writeUInt64LE(zeiefBuffer, this.uncompressedSize, 4);
    writeUInt64LE(zeiefBuffer, this.compressedSize, 12);
    writeUInt64LE(zeiefBuffer, this.relativeOffsetOfLocalHeader, 20);
  }
  fixedSizeStuff.writeUInt32LE(33639248, 0);
  fixedSizeStuff.writeUInt16LE(VERSION_MADE_BY, 4);
  fixedSizeStuff.writeUInt16LE(versionNeededToExtract, 6);
  fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 8);
  fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 10);
  fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 12);
  fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 14);
  fixedSizeStuff.writeUInt32LE(this.crc32, 16);
  fixedSizeStuff.writeUInt32LE(normalCompressedSize, 20);
  fixedSizeStuff.writeUInt32LE(normalUncompressedSize, 24);
  fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 28);
  fixedSizeStuff.writeUInt16LE(izutefBuffer.length + zeiefBuffer.length, 30);
  fixedSizeStuff.writeUInt16LE(this.fileComment.length, 32);
  fixedSizeStuff.writeUInt16LE(0, 34);
  fixedSizeStuff.writeUInt16LE(0, 36);
  fixedSizeStuff.writeUInt32LE(this.externalFileAttributes, 38);
  fixedSizeStuff.writeUInt32LE(normalRelativeOffsetOfLocalHeader, 42);
  return Buffer.concat([
    fixedSizeStuff,
    // file name (variable size)
    this.utf8FileName,
    // extra field (variable size)
    izutefBuffer,
    zeiefBuffer,
    // file comment (variable size)
    this.fileComment
  ]);
};
Entry.prototype.getCompressionMethod = function() {
  var NO_COMPRESSION = 0;
  var DEFLATE_COMPRESSION = 8;
  return this.compressionLevel === 0 ? NO_COMPRESSION : DEFLATE_COMPRESSION;
};
var minDosDate = new Date(1980, 0, 1);
var maxDosDate = new Date(2107, 11, 31, 23, 59, 58);
function dateToDosDateTime(jsDate) {
  if (jsDate < minDosDate) jsDate = minDosDate;
  else if (jsDate > maxDosDate) jsDate = maxDosDate;
  var date2 = 0;
  date2 |= jsDate.getDate() & 31;
  date2 |= (jsDate.getMonth() + 1 & 15) << 5;
  date2 |= (jsDate.getFullYear() - 1980 & 127) << 9;
  var time2 = 0;
  time2 |= Math.floor(jsDate.getSeconds() / 2);
  time2 |= (jsDate.getMinutes() & 63) << 5;
  time2 |= (jsDate.getHours() & 31) << 11;
  return { date: date2, time: time2 };
}
function writeUInt64LE(buffer, n, offset) {
  var high = Math.floor(n / 4294967296);
  var low = n % 4294967296;
  buffer.writeUInt32LE(low, offset);
  buffer.writeUInt32LE(high, offset + 4);
}
util.inherits(ByteCounter, Transform);
function ByteCounter(options) {
  Transform.call(this, options);
  this.byteCount = 0;
}
ByteCounter.prototype._transform = function(chunk, encoding, cb) {
  this.byteCount += chunk.length;
  cb(null, chunk);
};
util.inherits(Crc32Watcher, Transform);
function Crc32Watcher(options) {
  Transform.call(this, options);
  this.crc32 = 0;
}
Crc32Watcher.prototype._transform = function(chunk, encoding, cb) {
  this.crc32 = crc32.unsigned(chunk, this.crc32);
  cb(null, chunk);
};
var cp437 = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
if (cp437.length !== 256) throw new Error("assertion failure");
var reverseCp437 = null;
function encodeCp437(string2) {
  if (/^[\x20-\x7e]*$/.test(string2)) {
    return bufferFrom(string2, "utf-8");
  }
  if (reverseCp437 == null) {
    reverseCp437 = {};
    for (var i = 0; i < cp437.length; i++) {
      reverseCp437[cp437[i]] = i;
    }
  }
  var result = bufferAlloc(string2.length);
  for (var i = 0; i < string2.length; i++) {
    var b = reverseCp437[string2[i]];
    if (b == null) throw new Error("character not encodable in CP437: " + JSON.stringify(string2[i]));
    result[i] = b;
  }
  return result;
}
function bufferAlloc(size) {
  bufferAlloc = modern;
  try {
    return bufferAlloc(size);
  } catch (e) {
    bufferAlloc = legacy;
    return bufferAlloc(size);
  }
  function modern(size2) {
    return Buffer.allocUnsafe(size2);
  }
  function legacy(size2) {
    return new Buffer(size2);
  }
}
function bufferFrom(something, encoding) {
  bufferFrom = modern;
  try {
    return bufferFrom(something, encoding);
  } catch (e) {
    bufferFrom = legacy;
    return bufferFrom(something, encoding);
  }
  function modern(something2, encoding2) {
    return Buffer.from(something2, encoding2);
  }
  function legacy(something2, encoding2) {
    return new Buffer(something2, encoding2);
  }
}
function bufferIncludes(buffer, content) {
  bufferIncludes = modern;
  try {
    return bufferIncludes(buffer, content);
  } catch (e) {
    bufferIncludes = legacy;
    return bufferIncludes(buffer, content);
  }
  function modern(buffer2, content2) {
    return buffer2.includes(content2);
  }
  function legacy(buffer2, content2) {
    for (var i = 0; i <= buffer2.length - content2.length; i++) {
      for (var j = 0; ; j++) {
        if (j === content2.length) return true;
        if (buffer2[i + j] !== content2[j]) break;
      }
    }
    return false;
  }
}
async function exportLogsZip(input) {
  const zipFile = new yazl.ZipFile();
  const missingEntries = [];
  for (const entry of input.entries) {
    if (fs$a.existsSync(entry.filePath) && fs$a.statSync(entry.filePath).isFile()) {
      zipFile.addFile(entry.filePath, entry.archiveName);
      continue;
    }
    missingEntries.push(entry.archiveName);
    zipFile.addBuffer(Buffer.alloc(0), entry.archiveName);
  }
  const outputStream = fs$a.createWriteStream(input.outputPath);
  const pipelinePromise = promises.pipeline(zipFile.outputStream, outputStream);
  zipFile.end();
  await pipelinePromise;
  return { missingEntries };
}
function getAutoLaunchEnabled() {
  try {
    const settings = require$$0$1.app.getLoginItemSettings({
      args: ["--auto-launched"]
    });
    return settings.openAtLogin;
  } catch (error) {
    console.error("Failed to get auto-launch settings:", error);
    return false;
  }
}
function setAutoLaunchEnabled(enabled) {
  const isMac2 = process.platform === "darwin";
  try {
    require$$0$1.app.setLoginItemSettings({
      openAtLogin: enabled,
      // macOS: 自启后窗口不显示，M芯片和Intel均兼容
      openAsHidden: isMac2 ? enabled : false,
      // Windows: 通过命令行参数标记自启动
      args: enabled ? ["--auto-launched"] : []
    });
  } catch (error) {
    console.error("Failed to set auto-launch settings:", error);
    throw error;
  }
}
class McpStore {
  constructor(db, saveDb) {
    __publicField(this, "db");
    __publicField(this, "saveDb");
    this.db = db;
    this.saveDb = saveDb;
  }
  deserializeRow(values) {
    const row = {
      id: values[0],
      name: values[1],
      description: values[2],
      enabled: values[3],
      transport_type: values[4],
      config_json: values[5],
      created_at: values[6],
      updated_at: values[7]
    };
    let config2 = {};
    try {
      config2 = JSON.parse(row.config_json);
    } catch {
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: row.enabled === 1,
      transportType: row.transport_type,
      command: config2.command,
      args: config2.args,
      env: config2.env,
      url: config2.url,
      headers: config2.headers,
      isBuiltIn: config2.isBuiltIn === true,
      githubUrl: config2.githubUrl,
      registryId: config2.registryId,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  serializeConfig(data) {
    const config2 = {};
    if (data.command !== void 0) config2.command = data.command;
    if (data.args !== void 0) config2.args = data.args;
    if (data.env !== void 0 && Object.keys(data.env).length > 0) config2.env = data.env;
    if (data.url !== void 0) config2.url = data.url;
    if (data.headers !== void 0 && Object.keys(data.headers).length > 0) config2.headers = data.headers;
    if (data.isBuiltIn) config2.isBuiltIn = true;
    if (data.githubUrl) config2.githubUrl = data.githubUrl;
    if (data.registryId) config2.registryId = data.registryId;
    return JSON.stringify(config2);
  }
  listServers() {
    const result = this.db.exec(
      "SELECT id, name, description, enabled, transport_type, config_json, created_at, updated_at FROM mcp_servers ORDER BY created_at ASC"
    );
    if (!result[0]) return [];
    return result[0].values.map((row) => this.deserializeRow(row));
  }
  getServer(id) {
    var _a3;
    const result = this.db.exec(
      "SELECT id, name, description, enabled, transport_type, config_json, created_at, updated_at FROM mcp_servers WHERE id = ?",
      [id]
    );
    if (!((_a3 = result[0]) == null ? void 0 : _a3.values[0])) return null;
    return this.deserializeRow(result[0].values[0]);
  }
  createServer(data) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const configJson = this.serializeConfig(data);
    this.db.run(
      `INSERT INTO mcp_servers (id, name, description, enabled, transport_type, config_json, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      [id, data.name, data.description, data.transportType, configJson, now, now]
    );
    this.saveDb();
    return this.getServer(id);
  }
  updateServer(id, data) {
    const existing = this.getServer(id);
    if (!existing) return null;
    const now = Date.now();
    const merged = {
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      transportType: data.transportType ?? existing.transportType,
      command: data.command !== void 0 ? data.command : existing.command,
      args: data.args !== void 0 ? data.args : existing.args,
      env: data.env !== void 0 ? data.env : existing.env,
      url: data.url !== void 0 ? data.url : existing.url,
      headers: data.headers !== void 0 ? data.headers : existing.headers,
      isBuiltIn: data.isBuiltIn !== void 0 ? data.isBuiltIn : existing.isBuiltIn,
      githubUrl: data.githubUrl !== void 0 ? data.githubUrl : existing.githubUrl,
      registryId: data.registryId !== void 0 ? data.registryId : existing.registryId
    };
    const configJson = this.serializeConfig(merged);
    this.db.run(`UPDATE mcp_servers SET name = ?, description = ?, transport_type = ?, config_json = ?, updated_at = ? WHERE id = ?`, [
      merged.name,
      merged.description,
      merged.transportType,
      configJson,
      now,
      id
    ]);
    this.saveDb();
    return this.getServer(id);
  }
  deleteServer(id) {
    const existing = this.getServer(id);
    if (!existing) return false;
    this.db.run("DELETE FROM mcp_servers WHERE id = ?", [id]);
    this.saveDb();
    return true;
  }
  setEnabled(id, enabled) {
    const existing = this.getServer(id);
    if (!existing) return false;
    const now = Date.now();
    this.db.run("UPDATE mcp_servers SET enabled = ?, updated_at = ? WHERE id = ?", [enabled ? 1 : 0, now, id]);
    this.saveDb();
    return true;
  }
  getEnabledServers() {
    const result = this.db.exec(
      "SELECT id, name, description, enabled, transport_type, config_json, created_at, updated_at FROM mcp_servers WHERE enabled = 1 ORDER BY created_at ASC"
    );
    if (!result[0]) return [];
    return result[0].values.map((row) => this.deserializeRow(row));
  }
}
const PROXY_ENV_KEYS = ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "no_proxy", "NO_PROXY"];
PROXY_ENV_KEYS.reduce((acc, key) => {
  acc[key] = process.env[key];
  return acc;
}, {});
function appendEnvPath(current, additions) {
  const items = /* @__PURE__ */ new Set();
  for (const entry of additions) {
    if (entry) {
      items.add(entry);
    }
  }
  if (current) {
    for (const entry of current.split(path$7.delimiter)) {
      if (entry) {
        items.add(entry);
      }
    }
  }
  return items.size > 0 ? Array.from(items).join(path$7.delimiter) : current;
}
function hasCommandInEnv(command, env) {
  const whichCmd = process.platform === "win32" ? "where" : "which";
  try {
    const result = require$$0$2.spawnSync(whichCmd, [command], {
      env: { ...env },
      encoding: "utf-8",
      timeout: 5e3,
      windowsHide: process.platform === "win32"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
let cachedElectronNodeRuntimePath = null;
function resolveElectronNodeRuntimePath() {
  if (!require$$0$1.app.isPackaged || process.platform !== "darwin") {
    return process.execPath;
  }
  try {
    const appName = require$$0$1.app.getName();
    const frameworksDir = path$7.join(process.resourcesPath, "..", "Frameworks");
    if (!fs$a.existsSync(frameworksDir)) {
      return process.execPath;
    }
    const helperApps = fs$a.readdirSync(frameworksDir).filter((entry) => entry.startsWith(`${appName} Helper`) && entry.endsWith(".app")).sort((a, b) => {
      const score = (name) => {
        if (name === `${appName} Helper.app`) return 0;
        if (name === `${appName} Helper (Renderer).app`) return 1;
        if (name === `${appName} Helper (Plugin).app`) return 2;
        if (name === `${appName} Helper (GPU).app`) return 3;
        return 10;
      };
      return score(a) - score(b);
    });
    for (const helperApp of helperApps) {
      const helperExeName = helperApp.replace(/\.app$/, "");
      const helperExePath = path$7.join(frameworksDir, helperApp, "Contents", "MacOS", helperExeName);
      if (fs$a.existsSync(helperExePath)) {
        coworkLog("INFO", "resolveNodeShim", `Using Electron helper runtime for node shim: ${helperExePath}`);
        return helperExePath;
      }
    }
  } catch (error) {
    coworkLog(
      "WARN",
      "resolveNodeShim",
      `Failed to resolve Electron helper runtime: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return process.execPath;
}
function getElectronNodeRuntimePath() {
  if (!cachedElectronNodeRuntimePath) {
    cachedElectronNodeRuntimePath = resolveElectronNodeRuntimePath();
  }
  return cachedElectronNodeRuntimePath;
}
let cachedUserShellPath;
function resolveUserShellPath() {
  if (cachedUserShellPath !== void 0) return cachedUserShellPath;
  if (process.platform === "win32") {
    cachedUserShellPath = null;
    return null;
  }
  try {
    const shell = process.env.SHELL || "/bin/bash";
    const pathProbes = [`${shell} -lc 'echo __PATH__=$PATH'`];
    let resolved = null;
    for (const probe of pathProbes) {
      try {
        const result = require$$0$2.execSync(probe, {
          encoding: "utf-8",
          timeout: 5e3,
          env: { ...process.env }
        });
        const match = result.match(/__PATH__=(.+)/);
        if (match == null ? void 0 : match[1]) {
          resolved = match[1].trim();
          break;
        }
      } catch {
      }
    }
    cachedUserShellPath = resolved;
  } catch (error) {
    console.warn("[coworkUtil] Failed to resolve user shell PATH:", error);
    cachedUserShellPath = null;
  }
  return cachedUserShellPath;
}
let cachedWindowsRegistryPath;
function readWindowsRegistryPathValue(registryKey) {
  try {
    const output = require$$0$2.execSync(`reg query "${registryKey}" /v Path`, {
      encoding: "utf-8",
      timeout: 8e3,
      windowsHide: true
    });
    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/^\s*Path\s+REG_\w+\s+(.+)$/i);
      if (match == null ? void 0 : match[1]) {
        return match[1].trim();
      }
    }
  } catch {
  }
  return "";
}
function resolveWindowsRegistryPath() {
  if (cachedWindowsRegistryPath !== void 0) return cachedWindowsRegistryPath;
  if (process.platform !== "win32") {
    cachedWindowsRegistryPath = null;
    return null;
  }
  try {
    const machinePath = readWindowsRegistryPathValue("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment");
    const userPath = readWindowsRegistryPathValue("HKCU\\Environment");
    const registryPath = [machinePath, userPath].filter(Boolean).join(";");
    if (registryPath.trim()) {
      const entries = registryPath.split(";").map((entry) => entry.trim()).filter(Boolean);
      const unique = Array.from(new Set(entries));
      cachedWindowsRegistryPath = unique.join(";");
      coworkLog("INFO", "resolveWindowsRegistryPath", `Resolved ${unique.length} PATH entries from Windows registry`);
    } else {
      cachedWindowsRegistryPath = null;
    }
  } catch (error) {
    coworkLog(
      "WARN",
      "resolveWindowsRegistryPath",
      `Failed to read PATH from Windows registry: ${error instanceof Error ? error.message : String(error)}`
    );
    cachedWindowsRegistryPath = null;
  }
  return cachedWindowsRegistryPath;
}
function ensureWindowsRegistryPathEntries(env) {
  const registryPath = resolveWindowsRegistryPath();
  if (!registryPath) return;
  const currentPath = env.PATH || "";
  const currentEntriesLower = new Set(currentPath.split(path$7.delimiter).map((entry) => entry.toLowerCase().replace(/\\$/, "")));
  const missingEntries = [];
  for (const entry of registryPath.split(";")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const normalizedLower = trimmed.toLowerCase().replace(/\\$/, "");
    if (!currentEntriesLower.has(normalizedLower)) {
      missingEntries.push(trimmed);
      currentEntriesLower.add(normalizedLower);
    }
  }
  if (missingEntries.length > 0) {
    env.PATH = currentPath ? `${currentPath}${path$7.delimiter}${missingEntries.join(path$7.delimiter)}` : missingEntries.join(path$7.delimiter);
    coworkLog(
      "INFO",
      "ensureWindowsRegistryPathEntries",
      `Appended ${missingEntries.length} missing PATH entries from Windows registry: ${missingEntries.join(", ")}`
    );
  }
}
let cachedGitBashPath;
let cachedGitBashResolutionError;
function normalizeWindowsPath(input) {
  if (!input) return null;
  const trimmed = input.trim().replace(/\r/g, "");
  if (!trimmed) return null;
  const unquoted = trimmed.replace(/^["']+|["']+$/g, "");
  if (!unquoted) return null;
  return unquoted.replace(/\//g, "\\");
}
function listWindowsCommandPaths(command) {
  try {
    const output = require$$0$2.execSync(command, { encoding: "utf-8", timeout: 5e3 });
    const parsed = output.split(/\r?\n/).map((line) => normalizeWindowsPath(line)).filter((line) => Boolean(line && fs$a.existsSync(line)));
    return Array.from(new Set(parsed));
  } catch {
    return [];
  }
}
function listGitInstallPathsFromRegistry() {
  const registryKeys = ["HKCU\\Software\\GitForWindows", "HKLM\\Software\\GitForWindows", "HKLM\\Software\\WOW6432Node\\GitForWindows"];
  const installRoots = [];
  for (const key of registryKeys) {
    try {
      const output = require$$0$2.execSync(`reg query "${key}" /v InstallPath`, { encoding: "utf-8", timeout: 5e3 });
      for (const line of output.split(/\r?\n/)) {
        const match = line.match(/InstallPath\s+REG_\w+\s+(.+)$/i);
        const root = normalizeWindowsPath(match == null ? void 0 : match[1]);
        if (root) {
          installRoots.push(root);
        }
      }
    } catch {
    }
  }
  return Array.from(new Set(installRoots));
}
function getBundledGitBashCandidates() {
  const bundledRoots = require$$0$1.app.isPackaged ? [path$7.join(process.resourcesPath, "mingit")] : [path$7.join(__dirname, "..", "..", "resources", "mingit"), path$7.join(process.cwd(), "resources", "mingit")];
  const candidates = [];
  for (const root of bundledRoots) {
    candidates.push(path$7.join(root, "bin", "bash.exe"));
    candidates.push(path$7.join(root, "usr", "bin", "bash.exe"));
  }
  return candidates;
}
function checkWindowsGitBashHealth(bashPath) {
  try {
    if (!fs$a.existsSync(bashPath)) {
      return { ok: false, reason: "path does not exist" };
    }
    const healthEnv = {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || process.env.SystemRoot || "C:\\Windows",
      HOME: process.env.HOME || process.env.USERPROFILE || ""
    };
    const fastResult = require$$0$2.spawnSync(bashPath, ["-c", 'cygpath -u "C:\\\\Windows"'], {
      encoding: "utf-8",
      timeout: 5e3,
      windowsHide: true,
      env: healthEnv
    });
    const result = fastResult.error || typeof fastResult.status === "number" && fastResult.status !== 0 ? (
      // Non-login shell failed — retry with login shell and a longer timeout.
      // Some Git Bash builds require login shell to set up PATH for cygpath.
      require$$0$2.spawnSync(bashPath, ["-lc", 'cygpath -u "C:\\\\Windows"'], {
        encoding: "utf-8",
        timeout: 15e3,
        windowsHide: true,
        env: healthEnv
      })
    ) : fastResult;
    if (result.error) {
      return { ok: false, reason: result.error.message };
    }
    if (typeof result.status === "number" && result.status !== 0) {
      const stderr2 = (result.stderr || "").trim();
      const stdout2 = (result.stdout || "").trim();
      return {
        ok: false,
        reason: `exit ${result.status}${stderr2 ? `, stderr: ${stderr2}` : ""}${stdout2 ? `, stdout: ${stdout2}` : ""}`
      };
    }
    const stdout = (result.stdout || "").trim();
    const stderr = (result.stderr || "").trim();
    const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const lastNonEmptyLine = lines.length > 0 ? lines[lines.length - 1] : "";
    if (!/^\/[a-zA-Z]\//.test(lastNonEmptyLine)) {
      const diagnosticStdout = truncateDiagnostic(stdout || "(empty)");
      const diagnosticStderr = stderr ? `, stderr: ${truncateDiagnostic(stderr)}` : "";
      return { ok: false, reason: `unexpected cygpath output: ${diagnosticStdout}${diagnosticStderr}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
function truncateDiagnostic(message, maxLength = 500) {
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength - 3)}...`;
}
function getWindowsGitToolDirs(bashPath) {
  const normalized = bashPath.replace(/\//g, "\\");
  const lower = normalized.toLowerCase();
  let gitRoot = null;
  if (lower.endsWith("\\usr\\bin\\bash.exe")) {
    gitRoot = normalized.slice(0, -"\\usr\\bin\\bash.exe".length);
  } else if (lower.endsWith("\\bin\\bash.exe")) {
    gitRoot = normalized.slice(0, -"\\bin\\bash.exe".length);
  }
  if (!gitRoot) {
    const bashDir = path$7.dirname(normalized);
    return [bashDir].filter((dir) => fs$a.existsSync(dir));
  }
  const candidates = [path$7.join(gitRoot, "cmd"), path$7.join(gitRoot, "mingw64", "bin"), path$7.join(gitRoot, "usr", "bin"), path$7.join(gitRoot, "bin")];
  return candidates.filter((dir) => fs$a.existsSync(dir));
}
function ensureElectronNodeShim(electronPath, npmBinDir) {
  try {
    const shimDir = path$7.join(require$$0$1.app.getPath("userData"), "cowork", "bin");
    fs$a.mkdirSync(shimDir, { recursive: true });
    coworkLog("INFO", "resolveNodeShim", `Shim directory: ${shimDir}, electronPath: ${electronPath}, npmBinDir: ${npmBinDir || "(none)"}`);
    const nodeSh = path$7.join(shimDir, "node");
    const nodeShContent = [
      "#!/usr/bin/env bash",
      'if [ -z "${LOBSTERAI_ELECTRON_PATH:-}" ]; then',
      '  echo "LOBSTERAI_ELECTRON_PATH is not set" >&2',
      "  exit 127",
      "fi",
      'exec env ELECTRON_RUN_AS_NODE=1 "${LOBSTERAI_ELECTRON_PATH}" "$@"',
      ""
    ].join("\n");
    fs$a.writeFileSync(nodeSh, nodeShContent, "utf8");
    try {
      fs$a.chmodSync(nodeSh, 493);
    } catch {
    }
    coworkLog("INFO", "resolveNodeShim", `Created node bash shim: ${nodeSh}`);
    if (process.platform === "win32") {
      const nodeCmd = path$7.join(shimDir, "node.cmd");
      const nodeCmdContent = [
        "@echo off",
        'if "%LOBSTERAI_ELECTRON_PATH%"=="" (',
        "  echo LOBSTERAI_ELECTRON_PATH is not set 1>&2",
        "  exit /b 127",
        ")",
        "set ELECTRON_RUN_AS_NODE=1",
        '"%LOBSTERAI_ELECTRON_PATH%" %*',
        ""
      ].join("\r\n");
      fs$a.writeFileSync(nodeCmd, nodeCmdContent, "utf8");
      coworkLog("INFO", "resolveNodeShim", `Created node.cmd shim: ${nodeCmd}`);
    }
    if (npmBinDir && fs$a.existsSync(npmBinDir)) {
      const npxCliJs = path$7.join(npmBinDir, "npx-cli.js");
      const npmCliJs = path$7.join(npmBinDir, "npm-cli.js");
      const npxCliJsPosix = npxCliJs.replace(/\\/g, "/");
      const npmCliJsPosix = npmCliJs.replace(/\\/g, "/");
      coworkLog(
        "INFO",
        "resolveNodeShim",
        `npmBinDir exists: true, npx-cli.js exists: ${fs$a.existsSync(npxCliJs)}, npm-cli.js exists: ${fs$a.existsSync(npmCliJs)}`
      );
      if (fs$a.existsSync(npxCliJs)) {
        const npxSh = path$7.join(shimDir, "npx");
        const npxShContent = [
          "#!/usr/bin/env bash",
          'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
          `exec "$SCRIPT_DIR/node" "${npxCliJsPosix}" "$@"`,
          ""
        ].join("\n");
        fs$a.writeFileSync(npxSh, npxShContent, "utf8");
        try {
          fs$a.chmodSync(npxSh, 493);
        } catch {
        }
        coworkLog("INFO", "resolveNodeShim", `Created npx bash shim: ${npxSh} -> ${npxCliJsPosix}`);
        if (process.platform === "win32") {
          const npxCmd = path$7.join(shimDir, "npx.cmd");
          const npxCmdContent = ["@echo off", '"%~dp0node.cmd" "%LOBSTERAI_NPM_BIN_DIR%\\npx-cli.js" %*', ""].join("\r\n");
          fs$a.writeFileSync(npxCmd, npxCmdContent, "utf8");
          coworkLog("INFO", "resolveNodeShim", `Created npx.cmd shim: ${npxCmd} (using env var LOBSTERAI_NPM_BIN_DIR)`);
        }
      } else {
        coworkLog("WARN", "resolveNodeShim", `npx-cli.js not found at: ${npxCliJs}`);
      }
      if (fs$a.existsSync(npmCliJs)) {
        const npmSh = path$7.join(shimDir, "npm");
        const npmShContent = [
          "#!/usr/bin/env bash",
          'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
          `exec "$SCRIPT_DIR/node" "${npmCliJsPosix}" "$@"`,
          ""
        ].join("\n");
        fs$a.writeFileSync(npmSh, npmShContent, "utf8");
        try {
          fs$a.chmodSync(npmSh, 493);
        } catch {
        }
        coworkLog("INFO", "resolveNodeShim", `Created npm bash shim: ${npmSh} -> ${npmCliJsPosix}`);
        if (process.platform === "win32") {
          const npmCmd = path$7.join(shimDir, "npm.cmd");
          const npmCmdContent = ["@echo off", '"%~dp0node.cmd" "%LOBSTERAI_NPM_BIN_DIR%\\npm-cli.js" %*', ""].join("\r\n");
          fs$a.writeFileSync(npmCmd, npmCmdContent, "utf8");
          coworkLog("INFO", "resolveNodeShim", `Created npm.cmd shim: ${npmCmd} (using env var LOBSTERAI_NPM_BIN_DIR)`);
        }
      } else {
        coworkLog("WARN", "resolveNodeShim", `npm-cli.js not found at: ${npmCliJs}`);
      }
      coworkLog("INFO", "resolveNodeShim", `Created npx/npm shims pointing to: ${npmBinDir}`);
    } else {
      coworkLog(
        "WARN",
        "resolveNodeShim",
        `npmBinDir not available: ${npmBinDir || "(not provided)"}, exists: ${npmBinDir ? fs$a.existsSync(npmBinDir) : "N/A"}`
      );
    }
    const shimFiles = ["node", "npx", "npm"];
    for (const name of shimFiles) {
      const shimPath = path$7.join(shimDir, name);
      const exists = fs$a.existsSync(shimPath);
      if (exists) {
        try {
          const stat = fs$a.statSync(shimPath);
          coworkLog("INFO", "resolveNodeShim", `Shim verify: ${name} exists, mode=0o${stat.mode.toString(8)}, size=${stat.size}`);
        } catch (e) {
          coworkLog("WARN", "resolveNodeShim", `Shim verify: ${name} exists but stat failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        coworkLog("WARN", "resolveNodeShim", `Shim verify: ${name} NOT found at ${shimPath}`);
      }
    }
    return shimDir;
  } catch (error) {
    coworkLog("WARN", "resolveNodeShim", `Failed to prepare Electron Node shim: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
function resolveWindowsGitBashPath() {
  if (cachedGitBashPath !== void 0) return cachedGitBashPath;
  if (process.platform !== "win32") {
    cachedGitBashPath = null;
    cachedGitBashResolutionError = null;
    return null;
  }
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  const failedCandidates = [];
  const pushCandidate = (candidatePath, source) => {
    if (!candidatePath) return;
    const normalized = normalizeWindowsPath(candidatePath);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ path: normalized, source });
  };
  pushCandidate(process.env.CLAUDE_CODE_GIT_BASH_PATH ?? null, "env:CLAUDE_CODE_GIT_BASH_PATH");
  for (const bundledCandidate of getBundledGitBashCandidates()) {
    pushCandidate(bundledCandidate, "bundled:resources/mingit");
  }
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";
  const userProfile = process.env.USERPROFILE || "";
  const installCandidates = [
    path$7.join(programFiles, "Git", "bin", "bash.exe"),
    path$7.join(programFiles, "Git", "usr", "bin", "bash.exe"),
    path$7.join(programFilesX86, "Git", "bin", "bash.exe"),
    path$7.join(programFilesX86, "Git", "usr", "bin", "bash.exe"),
    path$7.join(localAppData, "Programs", "Git", "bin", "bash.exe"),
    path$7.join(localAppData, "Programs", "Git", "usr", "bin", "bash.exe"),
    path$7.join(userProfile, "scoop", "apps", "git", "current", "bin", "bash.exe"),
    path$7.join(userProfile, "scoop", "apps", "git", "current", "usr", "bin", "bash.exe"),
    "C:\\Git\\bin\\bash.exe",
    "C:\\Git\\usr\\bin\\bash.exe"
  ];
  for (const installCandidate of installCandidates) {
    pushCandidate(installCandidate, "installed:common-paths");
  }
  const registryInstallRoots = listGitInstallPathsFromRegistry();
  for (const installRoot of registryInstallRoots) {
    const registryCandidates = [path$7.join(installRoot, "bin", "bash.exe"), path$7.join(installRoot, "usr", "bin", "bash.exe")];
    for (const registryCandidate of registryCandidates) {
      pushCandidate(registryCandidate, `registry:${installRoot}`);
    }
  }
  const bashPaths = listWindowsCommandPaths("where bash");
  for (const bashPath of bashPaths) {
    if (bashPath.toLowerCase().endsWith("\\bash.exe")) {
      pushCandidate(bashPath, "path:where bash");
    }
  }
  const gitPaths = listWindowsCommandPaths("where git");
  for (const gitPath of gitPaths) {
    const gitRoot = path$7.dirname(path$7.dirname(gitPath));
    const bashCandidates = [path$7.join(gitRoot, "bin", "bash.exe"), path$7.join(gitRoot, "usr", "bin", "bash.exe")];
    for (const bashCandidate of bashCandidates) {
      pushCandidate(bashCandidate, `path:where git (${gitPath})`);
    }
  }
  for (const candidate of candidates) {
    if (!fs$a.existsSync(candidate.path)) {
      continue;
    }
    const health = checkWindowsGitBashHealth(candidate.path);
    if (health.ok) {
      coworkLog("INFO", "resolveGitBash", `Selected git-bash (${candidate.source}): ${candidate.path}`);
      cachedGitBashPath = candidate.path;
      cachedGitBashResolutionError = null;
      return candidate.path;
    }
    const failure = `${candidate.path} [${candidate.source}] failed health check (${health.reason || "unknown reason"})`;
    failedCandidates.push(failure);
    coworkLog("WARN", "resolveGitBash", failure);
  }
  const diagnostic = failedCandidates.length > 0 ? `No healthy git-bash found. Failures: ${failedCandidates.join("; ")}` : "No git-bash candidates found on this system";
  coworkLog("WARN", "resolveGitBash", diagnostic);
  cachedGitBashPath = null;
  cachedGitBashResolutionError = truncateDiagnostic(diagnostic);
  return null;
}
const WINDOWS_SYSTEM_PATH_ENTRIES = ["System32", "System32\\Wbem", "System32\\WindowsPowerShell\\v1.0", "System32\\OpenSSH"];
const WINDOWS_CRITICAL_ENV_VARS = {
  SystemRoot: () => process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\windows",
  windir: () => process.env.windir || process.env.WINDIR || process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\windows",
  COMSPEC: () => process.env.COMSPEC || process.env.comspec || "C:\\windows\\system32\\cmd.exe",
  SYSTEMDRIVE: () => process.env.SYSTEMDRIVE || process.env.SystemDrive || "C:"
};
function ensureWindowsSystemEnvVars(env) {
  const injected = [];
  for (const [key, resolver] of Object.entries(WINDOWS_CRITICAL_ENV_VARS)) {
    if (!env[key]) {
      const value = resolver();
      if (value) {
        env[key] = value;
        injected.push(`${key}=${value}`);
      }
    }
  }
  if (injected.length > 0) {
    coworkLog("INFO", "ensureWindowsSystemEnvVars", `Injected missing Windows system env vars: ${injected.join(", ")}`);
  }
}
function ensureWindowsSystemPathEntries(env) {
  const systemRoot = env.SystemRoot || env.SYSTEMROOT || "C:\\windows";
  const currentPath = env.PATH || "";
  const currentEntries = currentPath.split(path$7.delimiter).map((entry) => entry.toLowerCase());
  const missingDirs = [];
  for (const relDir of WINDOWS_SYSTEM_PATH_ENTRIES) {
    const fullDir = path$7.join(systemRoot, relDir);
    if (!currentEntries.includes(fullDir.toLowerCase()) && fs$a.existsSync(fullDir)) {
      missingDirs.push(fullDir);
    }
  }
  if (!currentEntries.includes(systemRoot.toLowerCase()) && fs$a.existsSync(systemRoot)) {
    missingDirs.push(systemRoot);
  }
  if (missingDirs.length > 0) {
    env.PATH = currentPath ? `${currentPath}${path$7.delimiter}${missingDirs.join(path$7.delimiter)}` : missingDirs.join(path$7.delimiter);
    coworkLog("INFO", "ensureWindowsSystemPathEntries", `Appended missing Windows system PATH entries: ${missingDirs.join(", ")}`);
  }
}
function ensureWindowsBashBootstrapPath(env) {
  const currentPath = env.PATH || "";
  if (!currentPath) return;
  const bootstrapToken = "/usr/bin:/bin";
  const entries = currentPath.split(path$7.delimiter).map((entry) => entry.trim()).filter(Boolean);
  if (entries.some((entry) => entry === bootstrapToken)) {
    return;
  }
  env.PATH = `${bootstrapToken}${path$7.delimiter}${currentPath}`;
  coworkLog("INFO", "ensureWindowsBashBootstrapPath", `Prepended bash bootstrap PATH token: ${bootstrapToken}`);
}
function singleWindowsPathToPosix(windowsPath) {
  if (!windowsPath) return windowsPath;
  const driveMatch = windowsPath.match(/^([A-Za-z]):[/\\](.*)/);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase();
    const rest = driveMatch[2].replace(/\\/g, "/").replace(/\/+$/, "");
    return `/${driveLetter}${rest ? "/" + rest : ""}`;
  }
  return windowsPath.replace(/\\/g, "/");
}
function convertWindowsPathToMsys(windowsPath) {
  if (!windowsPath) return windowsPath;
  const entries = windowsPath.split(";").filter(Boolean);
  const converted = [];
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const driveMatch = trimmed.match(/^([A-Za-z]):[/\\](.*)/);
    if (driveMatch) {
      const driveLetter = driveMatch[1].toLowerCase();
      const rest = driveMatch[2].replace(/\\/g, "/").replace(/\/+$/, "");
      converted.push(`/${driveLetter}${rest ? "/" + rest : ""}`);
    } else if (trimmed.startsWith("/")) {
      converted.push(trimmed);
    } else {
      converted.push(trimmed.replace(/\\/g, "/"));
    }
  }
  return converted.join(":");
}
function ensureWindowsOriginalPath(env) {
  const currentPath = env.PATH || "";
  if (!currentPath) return;
  const posixPath = convertWindowsPathToMsys(currentPath);
  env.ORIGINAL_PATH = posixPath;
  coworkLog("INFO", "ensureWindowsOriginalPath", `Set ORIGINAL_PATH with ${posixPath.split(":").length} POSIX-format entries`);
}
function ensureWindowsBashUtf8InitScript() {
  try {
    const initDir = path$7.join(require$$0$1.app.getPath("userData"), "cowork", "bin");
    fs$a.mkdirSync(initDir, { recursive: true });
    const initScript = path$7.join(initDir, "bash_utf8_init.sh");
    const content = [
      "#!/usr/bin/env bash",
      "# Auto-generated by LobsterAI – switch Windows console code page to UTF-8",
      "# to prevent garbled output from Windows native commands.",
      "if command -v chcp.com >/dev/null 2>&1; then",
      "  chcp.com 65001 >/dev/null 2>&1",
      "fi",
      ""
    ].join("\n");
    fs$a.writeFileSync(initScript, content, "utf8");
    try {
      fs$a.chmodSync(initScript, 493);
    } catch {
    }
    return initScript;
  } catch (error) {
    coworkLog(
      "WARN",
      "ensureWindowsBashUtf8InitScript",
      `Failed to create bash UTF-8 init script: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
function applyPackagedEnvOverrides(env) {
  const electronNodeRuntimePath = getElectronNodeRuntimePath();
  if (require$$0$1.app.isPackaged && !env.LOBSTERAI_ELECTRON_PATH) {
    env.LOBSTERAI_ELECTRON_PATH = electronNodeRuntimePath;
  }
  if (process.platform === "win32") {
    env.LOBSTERAI_ELECTRON_PATH = electronNodeRuntimePath;
    if (!env.LANG) {
      env.LANG = "C.UTF-8";
    }
    if (!env.LC_ALL) {
      env.LC_ALL = "C.UTF-8";
    }
    if (!env.PYTHONUTF8) {
      env.PYTHONUTF8 = "1";
    }
    if (!env.PYTHONIOENCODING) {
      env.PYTHONIOENCODING = "utf-8";
    }
    if (!env.LESSCHARSET) {
      env.LESSCHARSET = "utf-8";
    }
    if (!env.BASH_ENV) {
      const initScript = ensureWindowsBashUtf8InitScript();
      if (initScript) {
        env.BASH_ENV = singleWindowsPathToPosix(initScript);
        coworkLog("INFO", "applyPackagedEnvOverrides", `Set BASH_ENV for UTF-8 console code page: ${env.BASH_ENV}`);
      }
    }
    ensureWindowsSystemEnvVars(env);
    ensureWindowsSystemPathEntries(env);
    ensureWindowsRegistryPathEntries(env);
    const configuredBashPath = normalizeWindowsPath(env.CLAUDE_CODE_GIT_BASH_PATH);
    let bashPath = configuredBashPath && fs$a.existsSync(configuredBashPath) ? configuredBashPath : resolveWindowsGitBashPath();
    if (configuredBashPath && bashPath === configuredBashPath) {
      const configuredHealth = checkWindowsGitBashHealth(configuredBashPath);
      if (!configuredHealth.ok) {
        const fallbackPath = resolveWindowsGitBashPath();
        if (fallbackPath && fallbackPath !== configuredBashPath) {
          coworkLog(
            "WARN",
            "resolveGitBash",
            `Configured bash is unhealthy (${configuredBashPath}): ${configuredHealth.reason || "unknown reason"}. Falling back to: ${fallbackPath}`
          );
          bashPath = fallbackPath;
        } else {
          const diagnostic = truncateDiagnostic(
            `Configured bash is unhealthy (${configuredBashPath}): ${configuredHealth.reason || "unknown reason"}`
          );
          env.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR = diagnostic;
          coworkLog("WARN", "resolveGitBash", diagnostic);
          bashPath = null;
        }
      }
    }
    if (bashPath) {
      env.CLAUDE_CODE_GIT_BASH_PATH = bashPath;
      delete env.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR;
      coworkLog("INFO", "resolveGitBash", `Using Windows git-bash: ${bashPath}`);
      const gitToolDirs = getWindowsGitToolDirs(bashPath);
      env.PATH = appendEnvPath(env.PATH, gitToolDirs);
      coworkLog("INFO", "resolveGitBash", `Injected Windows Git toolchain PATH entries: ${gitToolDirs.join(", ")}`);
      ensureWindowsBashBootstrapPath(env);
    } else {
      const diagnostic = cachedGitBashResolutionError || "git-bash not found or failed health checks";
      env.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR = truncateDiagnostic(diagnostic);
    }
    appendPythonRuntimeToEnv(env);
    if (!env.MSYS2_PATH_TYPE) {
      env.MSYS2_PATH_TYPE = "inherit";
      coworkLog("INFO", "applyPackagedEnvOverrides", "Set MSYS2_PATH_TYPE=inherit to preserve PATH in git-bash");
    }
    ensureWindowsOriginalPath(env);
  }
  if (!require$$0$1.app.isPackaged) {
    const devBinDir = path$7.join(require$$0$1.app.getAppPath(), "node_modules", ".bin");
    if (fs$a.existsSync(devBinDir)) {
      env.PATH = [devBinDir, env.PATH].filter(Boolean).join(path$7.delimiter);
      coworkLog("INFO", "applyPackagedEnvOverrides", `Dev mode: prepended node_modules/.bin to PATH: ${devBinDir}`);
    }
    return;
  }
  if (!env.HOME) {
    env.HOME = require$$0$1.app.getPath("home");
  }
  const userPath = resolveUserShellPath();
  if (userPath) {
    env.PATH = userPath;
    coworkLog("INFO", "applyPackagedEnvOverrides", `Resolved user shell PATH (${userPath.split(path$7.delimiter).length} entries)`);
    for (const entry of userPath.split(path$7.delimiter)) {
      coworkLog("INFO", "applyPackagedEnvOverrides", `  PATH entry: ${entry} (exists: ${fs$a.existsSync(entry)})`);
    }
  } else {
    const home = env.HOME || require$$0$1.app.getPath("home");
    const commonPaths = [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      `${home}/.nvm/current/bin`,
      `${home}/.volta/bin`,
      `${home}/.fnm/current/bin`
    ];
    env.PATH = [env.PATH, ...commonPaths].filter(Boolean).join(path$7.delimiter);
    coworkLog("WARN", "applyPackagedEnvOverrides", `Failed to resolve user shell PATH, using fallback common paths`);
  }
  const resourcesPath = process.resourcesPath;
  coworkLog("INFO", "applyPackagedEnvOverrides", `Packaged mode: resourcesPath=${resourcesPath}`);
  const npmBinDir = path$7.join(resourcesPath, "app.asar.unpacked", "node_modules", "npm", "bin");
  coworkLog("INFO", "applyPackagedEnvOverrides", `npmBinDir=${npmBinDir}, exists=${fs$a.existsSync(npmBinDir)}`);
  env.LOBSTERAI_NPM_BIN_DIR = npmBinDir;
  const hasSystemNode = hasCommandInEnv("node", env);
  const hasSystemNpx = hasCommandInEnv("npx", env);
  const hasSystemNpm = hasCommandInEnv("npm", env);
  const shouldInjectShim = process.platform === "win32" || !(hasSystemNode && hasSystemNpx && hasSystemNpm);
  if (shouldInjectShim) {
    const shimDir = ensureElectronNodeShim(electronNodeRuntimePath, npmBinDir);
    if (shimDir) {
      env.PATH = [shimDir, env.PATH].filter(Boolean).join(path$7.delimiter);
      env.LOBSTERAI_NODE_SHIM_ACTIVE = "1";
      coworkLog("INFO", "resolveNodeShim", `Injected Electron Node/npx/npm shim PATH entry: ${shimDir}`);
      if (process.platform === "win32") {
        ensureWindowsOriginalPath(env);
      }
    }
  } else {
    delete env.LOBSTERAI_NODE_SHIM_ACTIVE;
    coworkLog("INFO", "resolveNodeShim", "System node/npx/npm detected; skipped Electron node shim injection");
  }
  const nodePaths = [path$7.join(resourcesPath, "app.asar", "node_modules"), path$7.join(resourcesPath, "app.asar.unpacked", "node_modules")].filter(
    (nodePath) => fs$a.existsSync(nodePath)
  );
  if (nodePaths.length > 0) {
    env.NODE_PATH = appendEnvPath(env.NODE_PATH, nodePaths);
  }
  verifyNodeEnvironment(env);
}
function verifyNodeEnvironment(env) {
  const tag = "verifyNodeEnv";
  const pathValue = env.PATH || "";
  const pathEntries = pathValue.split(path$7.delimiter);
  coworkLog("INFO", tag, `Final PATH has ${pathEntries.length} entries:`);
  for (let i = 0; i < pathEntries.length; i++) {
    const entry = pathEntries[i];
    const exists = entry ? fs$a.existsSync(entry) : false;
    coworkLog("INFO", tag, `  [${i}] ${entry} (exists: ${exists})`);
  }
  const whichCmd = process.platform === "win32" ? "where" : "which";
  for (const tool of ["node", "npx", "npm"]) {
    try {
      const result = require$$0$2.spawnSync(whichCmd, [tool], {
        env: { ...env },
        encoding: "utf-8",
        timeout: 5e3,
        windowsHide: process.platform === "win32"
      });
      if (result.status === 0 && result.stdout) {
        const resolved = result.stdout.trim();
        coworkLog("INFO", tag, `${whichCmd} ${tool} => ${resolved}`);
        const resolvedCandidates = resolved.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const resolvedForExec = process.platform === "win32" ? resolvedCandidates.find((candidate) => /\.(cmd|exe|bat)$/i.test(candidate)) || resolvedCandidates[0] : resolvedCandidates[0];
        if (tool === "node" && resolvedForExec) {
          try {
            let execTarget = resolvedForExec;
            if (process.platform === "win32" && /\.cmd$/i.test(resolvedForExec)) {
              execTarget = env.LOBSTERAI_ELECTRON_PATH || process.execPath;
            }
            const versionResult = require$$0$2.spawnSync(execTarget, ["--version"], {
              env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
              encoding: "utf-8",
              timeout: 5e3,
              windowsHide: process.platform === "win32"
            });
            coworkLog(
              "INFO",
              tag,
              `node --version (${execTarget}) => ${(versionResult.stdout || "").trim()} (exit: ${versionResult.status})`
            );
            if (versionResult.error) {
              coworkLog("WARN", tag, `node --version spawn error: ${versionResult.error.message}`);
            }
            if (versionResult.stderr) {
              coworkLog("WARN", tag, `node --version stderr: ${versionResult.stderr.trim()}`);
            }
          } catch (e) {
            coworkLog("WARN", tag, `node --version failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } else {
        coworkLog("WARN", tag, `${whichCmd} ${tool} => NOT FOUND (exit: ${result.status}, stderr: ${(result.stderr || "").trim()})`);
      }
    } catch (e) {
      coworkLog("WARN", tag, `${whichCmd} ${tool} threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  coworkLog("INFO", tag, `NODE_PATH=${env.NODE_PATH || "(not set)"}`);
  coworkLog("INFO", tag, `LOBSTERAI_ELECTRON_PATH=${env.LOBSTERAI_ELECTRON_PATH || "(not set)"}`);
  coworkLog("INFO", tag, `LOBSTERAI_NPM_BIN_DIR=${env.LOBSTERAI_NPM_BIN_DIR || "(not set)"}`);
  coworkLog("INFO", tag, `HOME=${env.HOME || "(not set)"}`);
}
function getSkillsRoot() {
  if (require$$0$1.app.isPackaged) {
    return path$7.join(require$$0$1.app.getPath("userData"), "SKILLs");
  }
  const envRoots = [process.env.LOBSTERAI_SKILLS_ROOT, process.env.SKILLS_ROOT].map((value) => value == null ? void 0 : value.trim()).filter((value) => Boolean(value));
  const candidates = [
    ...envRoots,
    path$7.join(require$$0$1.app.getAppPath(), "SKILLs"),
    path$7.join(process.cwd(), "SKILLs"),
    path$7.join(__dirname, "..", "SKILLs"),
    path$7.join(__dirname, "..", "..", "SKILLs")
  ];
  for (const candidate of candidates) {
    if (fs$a.existsSync(candidate)) {
      return candidate;
    }
  }
  return path$7.join(require$$0$1.app.getAppPath(), "SKILLs");
}
async function getEnhancedEnv(target = "local") {
  const config2 = getCurrentApiConfig(target);
  const env = config2 ? buildEnvForConfig(config2) : { ...process.env };
  applyPackagedEnvOverrides(env);
  const skillsRoot = getSkillsRoot().replace(/\\/g, "/");
  env.SKILLS_ROOT = skillsRoot;
  env.LOBSTERAI_SKILLS_ROOT = skillsRoot;
  if (process.platform === "win32" || env.LOBSTERAI_NODE_SHIM_ACTIVE === "1") {
    env.LOBSTERAI_ELECTRON_PATH = getElectronNodeRuntimePath().replace(/\\/g, "/");
  } else {
    delete env.LOBSTERAI_ELECTRON_PATH;
  }
  const internalApiBaseURL = getInternalApiBaseURL();
  if (internalApiBaseURL) {
    env.LOBSTERAI_API_BASE_URL = internalApiBaseURL;
  }
  if (env.http_proxy || env.HTTP_PROXY || env.https_proxy || env.HTTPS_PROXY) {
    return env;
  }
  {
    return env;
  }
}
function ensureCoworkTempDir(cwd) {
  const tempDir = path$7.join(cwd, ".cowork-temp");
  if (!fs$a.existsSync(tempDir)) {
    try {
      fs$a.mkdirSync(tempDir, { recursive: true });
      console.log("Created cowork temp directory:", tempDir);
    } catch (error) {
      console.error("Failed to create cowork temp directory:", error);
      return cwd;
    }
  }
  return tempDir;
}
async function getEnhancedEnvWithTmpdir(cwd, target = "local") {
  const env = await getEnhancedEnv(target);
  const tempDir = ensureCoworkTempDir(cwd);
  env.TMPDIR = tempDir;
  env.TMP = tempDir;
  env.TEMP = tempDir;
  return env;
}
const SESSION_TITLE_FALLBACK = "New Session";
const SESSION_TITLE_MAX_CHARS = 50;
const SESSION_TITLE_TIMEOUT_MS = 8e3;
const COWORK_MODEL_PROBE_TIMEOUT_MS = 2e4;
const API_ERROR_SNIPPET_MAX_CHARS = 240;
function buildAnthropicMessagesUrl(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    return "/v1/messages";
  }
  if (normalized.endsWith("/v1/messages")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/messages`;
  }
  return `${normalized}/v1/messages`;
}
function extractApiErrorSnippet(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const payload = JSON.parse(trimmed);
    const payloadError = payload.error;
    if (typeof payloadError === "string" && payloadError.trim()) {
      return payloadError.trim().slice(0, API_ERROR_SNIPPET_MAX_CHARS);
    }
    if (payloadError && typeof payloadError === "object") {
      const message = payloadError.message;
      if (typeof message === "string" && message.trim()) {
        return message.trim().slice(0, API_ERROR_SNIPPET_MAX_CHARS);
      }
    }
    const payloadMessage = payload.message;
    if (typeof payloadMessage === "string" && payloadMessage.trim()) {
      return payloadMessage.trim().slice(0, API_ERROR_SNIPPET_MAX_CHARS);
    }
  } catch {
  }
  return trimmed.replace(/\s+/g, " ").slice(0, API_ERROR_SNIPPET_MAX_CHARS);
}
function extractTextFromAnthropicResponse(payload) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload;
  const content = record.content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (!item || typeof item !== "object") return "";
      const block = item;
      if (typeof block.text === "string") {
        return block.text;
      }
      return "";
    }).filter(Boolean).join("\n").trim();
  }
  if (typeof content === "string") {
    return content.trim();
  }
  if (typeof record.output_text === "string") {
    return record.output_text.trim();
  }
  return "";
}
function normalizeTitleToPlainText(value, fallback) {
  if (!value.trim()) return fallback;
  let title = value.trim();
  const fenced = /```(?:[\w-]+)?\s*([\s\S]*?)```/i.exec(title);
  if (fenced == null ? void 0 : fenced[1]) {
    title = fenced[1].trim();
  }
  title = title.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\*([^*\n]+)\*/g, "$1").replace(/_([^_\n]+)_/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/^\s{0,3}#{1,6}\s+/, "").replace(/^\s*>\s?/, "").replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, "").replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
  const labeledTitle = /^(?:title|标题)\s*[:：]\s*(.+)$/i.exec(title);
  if (labeledTitle == null ? void 0 : labeledTitle[1]) {
    title = labeledTitle[1].trim();
  }
  title = title.replace(/^["'`“”‘’]+/, "").replace(/["'`“”‘’]+$/, "").trim();
  if (!title) return fallback;
  if (title.length > SESSION_TITLE_MAX_CHARS) {
    title = title.slice(0, SESSION_TITLE_MAX_CHARS).trim();
  }
  return title || fallback;
}
function buildFallbackSessionTitle(userIntent) {
  const normalizedInput = typeof userIntent === "string" ? userIntent.trim() : "";
  if (!normalizedInput) {
    return SESSION_TITLE_FALLBACK;
  }
  const firstLine = normalizedInput.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
  return normalizeTitleToPlainText(firstLine, SESSION_TITLE_FALLBACK);
}
async function probeCoworkModelReadiness(timeoutMs = COWORK_MODEL_PROBE_TIMEOUT_MS) {
  const { config: config2, error } = resolveCurrentApiConfig();
  if (!config2) {
    return {
      ok: false,
      error: error || "API configuration not found."
    };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(buildAnthropicMessagesUrl(config2.baseURL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config2.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config2.model,
        max_tokens: 1,
        temperature: 0,
        messages: [{ role: "user", content: 'Reply with "ok".' }]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const errorSnippet = extractApiErrorSnippet(errorText);
      return {
        ok: false,
        error: errorSnippet ? `Model validation failed (${response.status}): ${errorSnippet}` : `Model validation failed with status ${response.status}.`
      };
    }
    return { ok: true };
  } catch (error2) {
    if (error2 instanceof Error && error2.name === "AbortError") {
      const timeoutSeconds = Math.ceil(timeoutMs / 1e3);
      return {
        ok: false,
        error: `Model validation timed out after ${timeoutSeconds}s.`
      };
    }
    return {
      ok: false,
      error: `Model validation failed: ${error2 instanceof Error ? error2.message : String(error2)}`
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
async function generateSessionTitle(userIntent) {
  const normalizedInput = typeof userIntent === "string" ? userIntent.trim() : "";
  const fallbackTitle = buildFallbackSessionTitle(normalizedInput);
  if (!normalizedInput) {
    return fallbackTitle;
  }
  const { config: config2, error } = resolveCurrentApiConfig();
  if (!config2) {
    if (error) {
      console.warn("[cowork-title] Skip title generation due to missing API config:", error);
    }
    return fallbackTitle;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SESSION_TITLE_TIMEOUT_MS);
  try {
    const url2 = buildAnthropicMessagesUrl(config2.baseURL);
    const prompt = `Generate a short title from this input, keep the same language, return plain text only (no markdown), and keep it within ${SESSION_TITLE_MAX_CHARS} characters: ${normalizedInput}`;
    const response = await fetch(url2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config2.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config2.model,
        max_tokens: 80,
        temperature: 0,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("[cowork-title] Failed to generate title:", response.status, errorText.slice(0, 240));
      return fallbackTitle;
    }
    const payload = await response.json();
    const llmTitle = extractTextFromAnthropicResponse(payload);
    return normalizeTitleToPlainText(llmTitle, fallbackTitle);
  } catch (error2) {
    console.error("Failed to generate session title:", error2);
    return fallbackTitle;
  } finally {
    clearTimeout(timeoutId);
  }
}
const CONFIG_FILE_NAME = "api-config.json";
function getConfigPath() {
  const userDataPath = require$$0$1.app.getPath("userData");
  return path$7.join(userDataPath, CONFIG_FILE_NAME);
}
function saveCoworkApiConfig(config2) {
  const configPath = getConfigPath();
  const userDataPath = require$$0$1.app.getPath("userData");
  if (!fs$a.existsSync(userDataPath)) {
    fs$a.mkdirSync(userDataPath, { recursive: true });
  }
  if (!config2.apiKey || !config2.baseURL || !config2.model) {
    throw new Error("Invalid config: apiKey, baseURL, and model are required");
  }
  const normalized = {
    apiKey: config2.apiKey.trim(),
    baseURL: config2.baseURL.trim(),
    model: config2.model.trim(),
    apiType: config2.apiType === "openai" ? "openai" : "anthropic"
  };
  fs$a.writeFileSync(configPath, JSON.stringify(normalized, null, 2), "utf8");
  console.info("[cowork-config] API config saved successfully");
}
let claudeSdkPromise = null;
const CLAUDE_SDK_PATH_PARTS = ["@anthropic-ai", "claude-agent-sdk"];
function getClaudeSdkPath() {
  if (require$$0$1.app.isPackaged) {
    return path$7.join(process.resourcesPath, "app.asar.unpacked", "node_modules", ...CLAUDE_SDK_PATH_PARTS, "sdk.mjs");
  }
  const appPath = require$$0$1.app.getAppPath();
  const rootDir = appPath.endsWith("dist-electron") ? path$7.join(appPath, "..") : appPath;
  const sdkPath = path$7.join(rootDir, "node_modules", ...CLAUDE_SDK_PATH_PARTS, "sdk.mjs");
  console.log("[ClaudeSDK] Resolved SDK path:", sdkPath);
  return sdkPath;
}
function loadClaudeSdk() {
  if (!claudeSdkPromise) {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    const sdkPath = getClaudeSdkPath();
    const sdkUrl = url.pathToFileURL(sdkPath).href;
    const sdkExists = fs$a.existsSync(sdkPath);
    coworkLog("INFO", "loadClaudeSdk", "Loading Claude SDK", {
      sdkPath,
      sdkUrl,
      sdkExists,
      isPackaged: require$$0$1.app.isPackaged,
      resourcesPath: process.resourcesPath
    });
    claudeSdkPromise = dynamicImport(sdkUrl).catch((error) => {
      coworkLog("ERROR", "loadClaudeSdk", "Failed to load Claude SDK", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0,
        sdkPath,
        sdkExists
      });
      claudeSdkPromise = null;
      throw error;
    });
  }
  return claudeSdkPromise;
}
function $constructor(name, initializer2, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer2(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = (params == null ? void 0 : params.Parent) ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a3;
    const inst = (params == null ? void 0 : params.Parent) ? new Definition() : this;
    init(inst, def);
    (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      var _a3, _b;
      if ((params == null ? void 0 : params.Parent) && inst instanceof params.Parent)
        return true;
      return (_b = (_a3 = inst == null ? void 0 : inst._zod) == null ? void 0 : _a3.traits) == null ? void 0 : _b.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}
class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
const globalConfig = {};
function config(newConfig) {
  return globalConfig;
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match == null ? void 0 : match[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str2) {
  return str2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || (params == null ? void 0 : params.parent))
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if ((params == null ? void 0 : params.message) !== void 0) {
    if ((params == null ? void 0 : params.error) !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
const NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function aborted(x, startIndex = 0) {
  var _a3;
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (((_a3 = x.issues[i]) == null ? void 0 : _a3.continue) !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path2, issues) {
  return issues.map((iss) => {
    var _a3;
    (_a3 = iss).path ?? (_a3.path = []);
    iss.path.unshift(path2);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message == null ? void 0 : message.message;
}
function finalizeIssue(iss, ctx, config2) {
  var _a3, _b, _c, _d, _e, _f;
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage((_c = (_b = (_a3 = iss.inst) == null ? void 0 : _a3._zod.def) == null ? void 0 : _b.error) == null ? void 0 : _c.call(_b, iss)) ?? unwrapMessage((_d = ctx == null ? void 0 : ctx.error) == null ? void 0 : _d.call(ctx, iss)) ?? unwrapMessage((_e = config2.customError) == null ? void 0 : _e.call(config2, iss)) ?? unwrapMessage((_f = config2.localeError) == null ? void 0 : _f.call(config2, iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!(ctx == null ? void 0 : ctx.reportInput)) {
    delete full.input;
  }
  return full;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
const initializer$1 = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error2) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
const _parse = (_Err) => (schema2, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema2._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new ((_params == null ? void 0 : _params.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params == null ? void 0 : _params.callee);
    throw e;
  }
  return result.value;
};
const _parseAsync = (_Err) => async (schema2, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema2._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new ((params == null ? void 0 : params.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params == null ? void 0 : params.callee);
    throw e;
  }
  return result.value;
};
const _safeParse = (_Err) => (schema2, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema2._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema2, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema2._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema2, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema2, value, ctx);
};
const _decode = (_Err) => (schema2, value, _ctx) => {
  return _parse(_Err)(schema2, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema2, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema2, value, ctx);
};
const _decodeAsync = (_Err) => async (schema2, value, _ctx) => {
  return _parseAsync(_Err)(schema2, value, _ctx);
};
const _safeEncode = (_Err) => (schema2, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema2, value, ctx);
};
const _safeDecode = (_Err) => (schema2, value, _ctx) => {
  return _safeParse(_Err)(schema2, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema2, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema2, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema2, value, _ctx) => {
  return _safeParseAsync(_Err)(schema2, value, _ctx);
};
const cuid = /^[cC][^\s-]{8,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time$1(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
  const regex = params ? `[\\s\\S]{${(params == null ? void 0 : params.minimum) ?? 0},${(params == null ? void 0 : params.maximum) ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$1 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a3;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a3 = inst._zod).onattach ?? (_a3.onattach = []);
});
const numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a3;
    (_a3 = inst2._zod.bag).multipleOf ?? (_a3.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = (_a3 = def.format) == null ? void 0 : _a3.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  (_a3 = inst._zod.def).when ?? (_a3.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  (_a3 = inst._zod.def).when ?? (_a3.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a3;
  $ZodCheck.init(inst, def);
  (_a3 = inst._zod.def).when ?? (_a3.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a3, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a3 = inst._zod).check ?? (_a3.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});
const version = {
  major: 4,
  minor: 3,
  patch: 6
};
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a4;
  var _a3;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
    (_a4 = inst._zod.deferred) == null ? void 0 : _a4.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && (ctx == null ? void 0 : ctx.async) === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      var _a5;
      try {
        const r = safeParse$1(inst, value);
        return r.success ? { value: r.data } : { issues: (_a5 = r.error) == null ? void 0 : _a5.issues };
      } catch (_) {
        return safeParseAsync$1(inst, value).then((r) => {
          var _a6;
          return r.success ? { value: r.data } : { issues: (_a6 = r.error) == null ? void 0 : _a6.issues };
        });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  var _a3;
  $ZodType.init(inst, def);
  inst._zod.pattern = [...((_a3 = inst == null ? void 0 : inst._zod.bag) == null ? void 0 : _a3.patterns) ?? []].pop() ?? string$1(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      const url2 = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url2.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url2.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && (parsedHeader == null ? void 0 : parsedHeader.typ) !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean$1;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index2) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index2, result.issues));
  }
  final.value[index2] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index2 = 0; index2 < a.length; index2++) {
      const itemA = a[index2];
      const itemB = b[index2];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index2, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === void 0) {
    return { issues: [], value: void 0 };
  }
  return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => {
    var _a3, _b;
    return (_b = (_a3 = def.innerType) == null ? void 0 : _a3._zod) == null ? void 0 : _b.optin;
  });
  defineLazy(inst._zod, "optout", () => {
    var _a3, _b;
    return (_b = (_a3 = def.innerType) == null ? void 0 : _a3._zod) == null ? void 0 : _b.optout;
  });
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var _a2;
class $ZodRegistry {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema2, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema2, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema2);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema2) {
    const meta = this._map.get(schema2);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema2);
    return this;
  }
  get(schema2) {
    const p = schema2._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema2) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema2);
  }
  has(schema2) {
    return this._map.has(schema2);
  }
}
function registry() {
  return new $ZodRegistry();
}
(_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
  const schema2 = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema2;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function initializeContext(params) {
  let target = (params == null ? void 0 : params.target) ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: (params == null ? void 0 : params.metadata) ?? globalRegistry,
    target,
    unrepresentable: (params == null ? void 0 : params.unrepresentable) ?? "throw",
    override: (params == null ? void 0 : params.override) ?? (() => {
    }),
    io: (params == null ? void 0 : params.io) ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: (params == null ? void 0 : params.cycles) ?? "ref",
    reused: (params == null ? void 0 : params.reused) ?? "inline",
    external: (params == null ? void 0 : params.external) ?? void 0
  };
}
function process$1(schema2, ctx, _params = { path: [], schemaPath: [] }) {
  var _a4, _b;
  var _a3;
  const def = schema2._zod.def;
  const seen = ctx.seen.get(schema2);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema2);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema2, result);
  const overrideSchema = (_b = (_a4 = schema2._zod).toJSONSchema) == null ? void 0 : _b.call(_a4);
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema2],
      path: _params.path
    };
    if (schema2._zod.processJSONSchema) {
      schema2._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema2, ctx, _json, params);
    }
    const parent = schema2._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process$1(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema2);
  if (meta)
    Object.assign(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema2)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && result.schema._prefault)
    (_a3 = result.schema).default ?? (_a3.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema2);
  return _result.schema;
}
function extractDefs(ctx, schema2) {
  var _a3, _b, _c, _d;
  const root = ctx.seen.get(schema2);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = (_a3 = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _a3.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    var _a4;
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = (_a4 = ctx.external.registry.get(entry[0])) == null ? void 0 : _a4.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema3 = seen.schema;
    for (const key in schema3) {
      delete schema3[key];
    }
    schema3.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${(_b = seen.cycle) == null ? void 0 : _b.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema2 === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = (_c = ctx.external.registry.get(entry[0])) == null ? void 0 : _c.id;
      if (schema2 !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = (_d = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _d.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema2) {
  var _a3, _b, _c;
  const root = ctx.seen.get(schema2);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema3 = seen.def ?? seen.schema;
    const _cached = { ...schema3 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema3.allOf = schema3.allOf ?? [];
        schema3.allOf.push(refSchema);
      } else {
        Object.assign(schema3, refSchema);
      }
      Object.assign(schema3, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema3) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema3[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema3) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema3[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema3[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen == null ? void 0 : parentSeen.schema.$ref) {
        schema3.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema3) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema3[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema3[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema3,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") ;
  else ;
  if ((_a3 = ctx.external) == null ? void 0 : _a3.uri) {
    const id = (_b = ctx.external.registry.get(schema2)) == null ? void 0 : _b.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const defs = ((_c = ctx.external) == null ? void 0 : _c.defs) ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) ;
  else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema2["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema2, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema2, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod = (schema2, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process$1(schema2, ctx);
  extractDefs(ctx, schema2);
  return finalize(ctx, schema2);
};
const createStandardJSONSchemaMethod = (schema2, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process$1(schema2, ctx);
  extractDefs(ctx, schema2);
  return finalize(ctx, schema2);
};
const formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
const stringProcessor = (schema2, ctx, _json, _params) => {
  const json2 = _json;
  json2.type = "string";
  const { minimum, maximum, format: format2, patterns, contentEncoding } = schema2._zod.bag;
  if (typeof minimum === "number")
    json2.minLength = minimum;
  if (typeof maximum === "number")
    json2.maxLength = maximum;
  if (format2) {
    json2.format = formatMap[format2] ?? format2;
    if (json2.format === "")
      delete json2.format;
    if (format2 === "time") {
      delete json2.format;
    }
  }
  if (contentEncoding)
    json2.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json2.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json2.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
const numberProcessor = (schema2, ctx, _json, _params) => {
  const json2 = _json;
  const { minimum, maximum, format: format2, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema2._zod.bag;
  if (typeof format2 === "string" && format2.includes("int"))
    json2.type = "integer";
  else
    json2.type = "number";
  if (typeof exclusiveMinimum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.minimum = exclusiveMinimum;
      json2.exclusiveMinimum = true;
    } else {
      json2.exclusiveMinimum = exclusiveMinimum;
    }
  }
  if (typeof minimum === "number") {
    json2.minimum = minimum;
    if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMinimum >= minimum)
        delete json2.minimum;
      else
        delete json2.exclusiveMinimum;
    }
  }
  if (typeof exclusiveMaximum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.maximum = exclusiveMaximum;
      json2.exclusiveMaximum = true;
    } else {
      json2.exclusiveMaximum = exclusiveMaximum;
    }
  }
  if (typeof maximum === "number") {
    json2.maximum = maximum;
    if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMaximum <= maximum)
        delete json2.maximum;
      else
        delete json2.exclusiveMaximum;
    }
  }
  if (typeof multipleOf === "number")
    json2.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
const enumProcessor = (schema2, _ctx, json2, _params) => {
  const def = schema2._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json2.type = "number";
  if (values.every((v) => typeof v === "string"))
    json2.type = "string";
  json2.enum = values;
};
const customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
const arrayProcessor = (schema2, ctx, _json, params) => {
  const json2 = _json;
  const def = schema2._zod.def;
  const { minimum, maximum } = schema2._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
  json2.type = "array";
  json2.items = process$1(def.element, ctx, { ...params, path: [...params.path, "items"] });
};
const unionProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process$1(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json2.oneOf = options;
  } else {
    json2.anyOf = options;
  }
};
const intersectionProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  const a = process$1(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process$1(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json2.allOf = allOf;
};
const nullableProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  const inner = process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json2.nullable = true;
  } else {
    json2.anyOf = [inner, { type: "null" }];
  }
};
const nonoptionalProcessor = (schema2, ctx, _json, params) => {
  const def = schema2._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = def.innerType;
};
const defaultProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = def.innerType;
  json2.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json2._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json2.default = catchValue;
};
const pipeProcessor = (schema2, ctx, _json, params) => {
  const def = schema2._zod.def;
  const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
  process$1(innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = innerType;
};
const readonlyProcessor = (schema2, ctx, json2, params) => {
  const def = schema2._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = def.innerType;
  json2.readOnly = true;
};
const optionalProcessor = (schema2, ctx, _json, params) => {
  const def = schema2._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema2);
  seen.ref = def.innerType;
};
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime(params) {
  return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date(params) {
  return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time(params) {
  return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration(params) {
  return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}
const initializer = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
const ZodRealError = $constructor("ZodError", initializer, {
  Parent: Error
});
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks) => {
    return inst.clone(mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }), {
      parent: true
    });
  };
  inst.with = inst.check;
  inst.clone = (def2, params) => clone(inst, def2, params);
  inst.brand = () => inst;
  inst.register = (reg, meta) => {
    reg.add(inst, meta);
    return inst;
  };
  inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  inst.refine = (check, params) => inst.check(refine(check, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(/* @__PURE__ */ _overwrite(fn));
  inst.optional = () => optional(inst);
  inst.exactOptional = () => exactOptional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      var _a3;
      return (_a3 = globalRegistry.get(inst)) == null ? void 0 : _a3.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse(void 0).success;
  inst.isNullable = () => inst.safeParse(null).success;
  inst.apply = (fn) => fn(inst);
  return inst;
});
const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => stringProcessor(inst, ctx, json2);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  inst.regex = (...args) => inst.check(/* @__PURE__ */ _regex(...args));
  inst.includes = (...args) => inst.check(/* @__PURE__ */ _includes(...args));
  inst.startsWith = (...args) => inst.check(/* @__PURE__ */ _startsWith(...args));
  inst.endsWith = (...args) => inst.check(/* @__PURE__ */ _endsWith(...args));
  inst.min = (...args) => inst.check(/* @__PURE__ */ _minLength(...args));
  inst.max = (...args) => inst.check(/* @__PURE__ */ _maxLength(...args));
  inst.length = (...args) => inst.check(/* @__PURE__ */ _length(...args));
  inst.nonempty = (...args) => inst.check(/* @__PURE__ */ _minLength(1, ...args));
  inst.lowercase = (params) => inst.check(/* @__PURE__ */ _lowercase(params));
  inst.uppercase = (params) => inst.check(/* @__PURE__ */ _uppercase(params));
  inst.trim = () => inst.check(/* @__PURE__ */ _trim());
  inst.normalize = (...args) => inst.check(/* @__PURE__ */ _normalize(...args));
  inst.toLowerCase = () => inst.check(/* @__PURE__ */ _toLowerCase());
  inst.toUpperCase = () => inst.check(/* @__PURE__ */ _toUpperCase());
  inst.slugify = () => inst.check(/* @__PURE__ */ _slugify());
});
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
  inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
  inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime(params));
  inst.date = (params) => inst.check(date(params));
  inst.time = (params) => inst.check(time(params));
  inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
  return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => numberProcessor(inst, ctx, json2);
  inst.gt = (value, params) => inst.check(/* @__PURE__ */ _gt(value, params));
  inst.gte = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
  inst.min = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
  inst.lt = (value, params) => inst.check(/* @__PURE__ */ _lt(value, params));
  inst.lte = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
  inst.max = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(/* @__PURE__ */ _gt(0, params));
  inst.nonnegative = (params) => inst.check(/* @__PURE__ */ _gte(0, params));
  inst.negative = (params) => inst.check(/* @__PURE__ */ _lt(0, params));
  inst.nonpositive = (params) => inst.check(/* @__PURE__ */ _lte(0, params));
  inst.multipleOf = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
  inst.step = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
  inst.finite = () => inst;
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number(params) {
  return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => booleanProcessor(inst, ctx, json2);
});
function boolean(params) {
  return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => arrayProcessor(inst, ctx, json2, params);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(/* @__PURE__ */ _minLength(minLength, params));
  inst.nonempty = (params) => inst.check(/* @__PURE__ */ _minLength(1, params));
  inst.max = (maxLength, params) => inst.check(/* @__PURE__ */ _maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(/* @__PURE__ */ _length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => intersectionProcessor(inst, ctx, json2, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => enumProcessor(inst, ctx, json2);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => transformProcessor(inst, ctx);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullableProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => defaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => prefaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nonoptionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => catchProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => pipeProcessor(inst, ctx, json2, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => readonlyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => customProcessor(inst, ctx);
});
function refine(fn, _params = {}) {
  return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return /* @__PURE__ */ _superRefine(fn);
}
function ensureCoworkSandboxDirs(sessionId) {
  const baseDir = path$7.join(require$$0$1.app.getPath("userData"), "cowork", "sandbox");
  const ipcDir = path$7.join(baseDir, "ipc", sessionId);
  const requestsDir = path$7.join(ipcDir, "requests");
  const responsesDir = path$7.join(ipcDir, "responses");
  const streamsDir = path$7.join(ipcDir, "streams");
  fs$a.mkdirSync(requestsDir, { recursive: true });
  fs$a.mkdirSync(responsesDir, { recursive: true });
  fs$a.mkdirSync(streamsDir, { recursive: true });
  return {
    baseDir,
    ipcDir,
    requestsDir,
    responsesDir,
    streamsDir
  };
}
function resolveSandboxCwd(cwd) {
  return {
    hostPath: cwd,
    guestPath: "/workspace/project",
    mountTag: "work"
  };
}
const SKILL_SYNC_IGNORE = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "__pycache__",
  "dist",
  ".DS_Store",
  "Thumbs.db",
  ".server.pid",
  ".server.log",
  ".connection"
]);
const SKILL_SYNC_MAX_FILE_SIZE = 1 * 1024 * 1024;
function collectSkillFilesForSandbox(skillsRoot) {
  const result = [];
  if (!fs$a.existsSync(skillsRoot)) {
    coworkLog("WARN", "collectSkillFiles", `Skills root does not exist: ${skillsRoot}`);
    return result;
  }
  coworkLog("INFO", "collectSkillFiles", `Scanning skills root: ${skillsRoot}`);
  function scan(dir, base) {
    let entries;
    try {
      entries = fs$a.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKILL_SYNC_IGNORE.has(entry.name)) continue;
      const fullPath = path$7.join(dir, entry.name);
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        scan(fullPath, relPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs$a.statSync(fullPath);
          if (stat.size <= SKILL_SYNC_MAX_FILE_SIZE) {
            result.push({ path: relPath, data: fs$a.readFileSync(fullPath) });
          } else {
            coworkLog("WARN", "collectSkillFiles", `Skipping oversized file: ${relPath} (${stat.size} bytes)`);
          }
        } catch {
        }
      }
    }
  }
  scan(skillsRoot, "");
  coworkLog("INFO", "collectSkillFiles", `Collected ${result.length} files from ${skillsRoot}`, {
    files: result.map((f) => f.path).join(", ")
  });
  return result;
}
function buildSandboxRequest(paths, input) {
  const requestId = v4();
  const requestPath = path$7.join(paths.requestsDir, `${requestId}.json`);
  const streamPath = path$7.join(paths.streamsDir, `${requestId}.log`);
  fs$a.writeFileSync(requestPath, JSON.stringify(input));
  return { requestId, requestPath, streamPath };
}
function getPreferredAccel() {
  if (process.env.COWORK_SANDBOX_ACCEL) {
    return process.env.COWORK_SANDBOX_ACCEL;
  }
  if (process.platform === "darwin") {
    return "hvf";
  }
  if (process.platform === "win32") {
    return "whpx";
  }
  if (process.platform === "linux") {
    return "kvm";
  }
  return null;
}
function resolveRuntimeRoot(runtimeBinary) {
  return path$7.resolve(path$7.dirname(runtimeBinary), "..");
}
function toQemuOptionPath(targetPath) {
  const normalized = process.platform === "win32" ? path$7.resolve(targetPath).replace(/\\/g, "/") : path$7.resolve(targetPath);
  return normalized.replace(/,/g, "\\,");
}
function resolveAarch64Firmware(options) {
  if (options.runtime.arch !== "arm64") return null;
  const runtimeRoot = resolveRuntimeRoot(options.runtime.runtimeBinary);
  const codePath = path$7.join(runtimeRoot, "share", "qemu", "edk2-aarch64-code.fd");
  const varsTemplate = path$7.join(runtimeRoot, "share", "qemu", "edk2-arm-vars.fd");
  if (!fs$a.existsSync(codePath) || !fs$a.existsSync(varsTemplate)) {
    return null;
  }
  const varsPath = path$7.join(options.ipcDir, "edk2-vars.fd");
  if (!fs$a.existsSync(varsPath)) {
    try {
      fs$a.copyFileSync(varsTemplate, varsPath);
    } catch (error) {
      console.warn("Failed to prepare QEMU vars file:", error);
    }
  }
  return { codePath, varsPath };
}
function buildQemuArgs(options) {
  const memoryMb = options.memoryMb ?? (process.env.COWORK_SANDBOX_MEMORY ? parseInt(process.env.COWORK_SANDBOX_MEMORY, 10) : null) ?? 4096;
  const args = ["-m", String(memoryMb), "-smp", "2", "-nographic", "-snapshot"];
  const accel = options.accelOverride !== void 0 ? options.accelOverride : getPreferredAccel();
  if (accel) {
    const accelArg = accel === "tcg" ? "tcg,thread=multi" : accel;
    args.push("-accel", accelArg);
  }
  if (options.runtime.arch === "arm64") {
    const cpu = accel && accel !== "tcg" ? "host" : "cortex-a57";
    args.push("-machine", "virt", "-cpu", cpu);
    const kernelPath = options.runtime.kernelPath;
    const initrdPath = options.runtime.initrdPath;
    const hasKernel = Boolean(kernelPath && initrdPath && fs$a.existsSync(kernelPath) && fs$a.existsSync(initrdPath));
    if (hasKernel) {
      args.push(
        "-kernel",
        kernelPath,
        "-initrd",
        initrdPath,
        "-append",
        ["root=/dev/vda2", "rootfstype=ext4", "rw", "console=ttyAMA0,115200", "loglevel=4", "init=/sbin/init", "quiet"].join(" ")
      );
    } else {
      const firmware = resolveAarch64Firmware(options);
      if (firmware) {
        args.push(
          "-drive",
          `if=pflash,format=raw,readonly=on,file=${toQemuOptionPath(firmware.codePath)}`,
          "-drive",
          `if=pflash,format=raw,file=${toQemuOptionPath(firmware.varsPath)}`
        );
      }
    }
  }
  args.push(
    "-drive",
    `file=${toQemuOptionPath(options.runtime.imagePath)},if=virtio,format=qcow2`,
    "-netdev",
    "user,id=net0",
    "-device",
    "virtio-net,netdev=net0"
  );
  if (options.runtime.platform === "win32") {
    if (options.ipcPort) {
      args.push(
        "-device",
        "virtio-serial-pci",
        "-chardev",
        `socket,id=ipc,host=127.0.0.1,port=${options.ipcPort},server=on,wait=off`,
        "-device",
        "virtserialport,chardev=ipc,name=ipc.0"
      );
    }
  } else {
    args.push("-virtfs", `local,path=${toQemuOptionPath(options.ipcDir)},mount_tag=ipc,security_model=none`);
    args.push(
      "-virtfs",
      `local,path=${toQemuOptionPath(options.cwdMapping.hostPath)},mount_tag=${options.cwdMapping.mountTag},security_model=none`
    );
    for (const mount of options.extraMounts ?? []) {
      args.push("-virtfs", `local,path=${toQemuOptionPath(mount.hostPath)},mount_tag=${mount.mountTag},security_model=none`);
    }
    const hasExplicitExtraMounts = (options.extraMounts ?? []).length > 0;
    if (!hasExplicitExtraMounts && options.skillsDir && fs$a.existsSync(options.skillsDir)) {
      args.push("-virtfs", `local,path=${toQemuOptionPath(options.skillsDir)},mount_tag=skills,security_model=none`);
    }
  }
  const serialLogPath = process.platform === "win32" ? path$7.join(options.ipcDir, "serial.log").replace(/\\/g, "/") : path$7.join(options.ipcDir, "serial.log");
  args.push("-serial", `file:${serialLogPath}`);
  return args;
}
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}
function spawnCoworkSandboxVm(options) {
  const args = buildQemuArgs(options);
  coworkLog("INFO", "spawnSandboxVm", "Spawning QEMU", {
    runtimeBinary: options.runtime.runtimeBinary,
    runtimeExists: fs$a.existsSync(options.runtime.runtimeBinary),
    imageExists: fs$a.existsSync(options.runtime.imagePath),
    ipcPort: options.ipcPort ?? null,
    launcher: options.launcher ?? "direct",
    accelOverride: options.accelOverride ?? null,
    memoryMb: options.memoryMb ?? null,
    args: args.join(" ")
  });
  if (options.launcher === "launchctl" && process.platform === "darwin") {
    const uid = typeof process.getuid === "function" ? process.getuid() : null;
    if (uid !== null) {
      return require$$0$2.spawn("/bin/launchctl", ["asuser", String(uid), options.runtime.runtimeBinary, ...args], {
        stdio: ["ignore", "pipe", "pipe"]
      });
    }
  }
  return require$$0$2.spawn(options.runtime.runtimeBinary, args, { stdio: ["ignore", "pipe", "pipe"] });
}
class VirtioSerialBridge {
  // 初始化 bridge，并记录 IPC 目录和可选的 host cwd。
  constructor(ipcDir, hostCwd) {
    // QEMU virtio-serial 对应的 TCP socket。
    __publicField(this, "socket", null);
    // 用于累计按行解析的 socket 缓冲区。
    __publicField(this, "buffer", "");
    // 当前 sandbox session 的宿主 IPC 目录。
    __publicField(this, "ipcDir");
    // 当前 guest 工作目录映射回宿主的基准目录，用于文件同步落盘。
    __publicField(this, "hostCwd", null);
    // 当前 bridge 是否已连接到 guest。
    __publicField(this, "connected", false);
    // 分块文件传输的缓存：transferId -> 已收块、总块数、目标路径。
    __publicField(this, "pendingTransfers", /* @__PURE__ */ new Map());
    this.ipcDir = ipcDir;
    this.hostCwd = hostCwd ?? null;
  }
  /** Update the host CWD for file sync (e.g. on multi-turn continuation) */
  // 更新 host cwd，供后续 guest -> host 文件同步使用。
  setHostCwd(hostCwd) {
    this.hostCwd = hostCwd;
  }
  /**
   * Try to connect to QEMU's virtio-serial TCP server with retries.
   * QEMU may need a moment to start listening after spawn.
   */
  // 带重试地连接到 guest 暴露的 virtio-serial TCP server。
  async connect(port, timeoutMs = 3e4) {
    const start = Date.now();
    const retryDelay = 500;
    let attempts = 0;
    let lastError;
    coworkLog("INFO", "VirtioSerialBridge", `Connecting to QEMU serial on port ${port}`, {
      timeoutMs
    });
    while (Date.now() - start < timeoutMs) {
      attempts++;
      try {
        await this.tryConnect(port);
        this.connected = true;
        coworkLog("INFO", "VirtioSerialBridge", `Connected to QEMU serial on port ${port}`, {
          attempts,
          elapsed: Date.now() - start
        });
        console.log(`[VirtioSerialBridge] Connected to QEMU serial on port ${port}`);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
    coworkLog("ERROR", "VirtioSerialBridge", `Failed to connect to port ${port}`, {
      attempts,
      elapsed: Date.now() - start,
      lastError
    });
    throw new Error(`[VirtioSerialBridge] Failed to connect to port ${port} within ${timeoutMs}ms`);
  }
  // 发起一次实际的 TCP 连接尝试。
  tryConnect(port) {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: "127.0.0.1", port }, () => {
        this.socket = sock;
        this.setupReader(sock);
        resolve();
      });
      sock.on("error", reject);
    });
  }
  // 为 socket 注册数据读取、关闭和错误处理逻辑。
  setupReader(sock) {
    const decoder = new string_decoder.StringDecoder("utf8");
    sock.on("data", (chunk) => {
      this.buffer += decoder.write(chunk);
      let idx;
      while ((idx = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (line) this.handleLine(line);
      }
    });
    sock.on("close", () => {
      const tail = decoder.end();
      if (tail) {
        this.buffer += tail;
      }
      const finalLine = this.buffer.trim();
      if (finalLine) {
        this.handleLine(finalLine);
      }
      this.buffer = "";
      this.connected = false;
      console.warn("[VirtioSerialBridge] Connection closed");
    });
    sock.on("error", (err) => {
      console.warn("[VirtioSerialBridge] Socket error:", err.message);
    });
  }
  // 解析 guest 发来的单行 JSON 消息，并分派到不同处理器。
  handleLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    const msgType = String(msg.type ?? "");
    if (msgType === "heartbeat") {
      try {
        fs$a.writeFileSync(path$7.join(this.ipcDir, "heartbeat"), JSON.stringify(msg));
      } catch {
      }
      return;
    }
    if (msgType === "stream") {
      const requestId = String(msg.requestId ?? "");
      const streamLine = String(msg.line ?? "");
      if (requestId && streamLine) {
        const streamPath = path$7.join(this.ipcDir, "streams", `${requestId}.log`);
        try {
          fs$a.appendFileSync(streamPath, streamLine + "\n");
        } catch {
        }
      }
      return;
    }
    if (msgType === "file_sync") {
      this.handleFileSync(msg);
      return;
    }
    if (msgType === "file_sync_chunk") {
      this.handleFileSyncChunk(msg);
      return;
    }
    if (msgType === "file_sync_complete") {
      this.handleFileSyncComplete(msg);
      return;
    }
  }
  // -------------------------------------------------------------------------
  // File sync handlers — guest -> host file transfer
  // -------------------------------------------------------------------------
  /**
   * Validate and resolve a guest-relative path to an absolute host path.
   * Returns null if the path is invalid or escapes the host CWD.
   */
  // 把 guest 相对路径安全映射到宿主绝对路径，阻止路径穿越。
  resolveHostPath(relativePath) {
    if (!this.hostCwd) return null;
    if (!relativePath) return null;
    const normalized = relativePath.replace(/\//g, path$7.sep);
    const resolved = path$7.resolve(this.hostCwd, normalized);
    const resolvedCwd = path$7.resolve(this.hostCwd);
    if (!resolved.startsWith(resolvedCwd + path$7.sep) && resolved !== resolvedCwd) {
      console.warn(`[VirtioSerialBridge] Rejected path traversal: ${relativePath}`);
      return null;
    }
    return resolved;
  }
  // 处理单文件一次性同步消息。
  handleFileSync(msg) {
    const relativePath = String(msg.path ?? "");
    const data = String(msg.data ?? "");
    const hostPath = this.resolveHostPath(relativePath);
    if (!hostPath) return;
    try {
      fs$a.mkdirSync(path$7.dirname(hostPath), { recursive: true });
      fs$a.writeFileSync(hostPath, Buffer.from(data, "base64"));
      console.log(`[VirtioSerialBridge] File synced: ${relativePath}`);
    } catch (error) {
      console.warn(`[VirtioSerialBridge] File sync error for ${relativePath}:`, error);
    }
  }
  // 处理 guest 发来的分块文件同步消息。
  handleFileSyncChunk(msg) {
    const transferId = String(msg.transferId ?? "");
    const relativePath = String(msg.path ?? "");
    const chunkIndex = Number(msg.chunkIndex ?? 0);
    const totalChunks = Number(msg.totalChunks ?? 0);
    const data = String(msg.data ?? "");
    if (!transferId || !relativePath || !data) return;
    if (!this.resolveHostPath(relativePath)) return;
    if (!this.pendingTransfers.has(transferId)) {
      this.pendingTransfers.set(transferId, {
        chunks: /* @__PURE__ */ new Map(),
        totalChunks,
        path: relativePath
      });
    }
    const transfer = this.pendingTransfers.get(transferId);
    transfer.chunks.set(chunkIndex, Buffer.from(data, "base64"));
    if (transfer.chunks.size === transfer.totalChunks) {
      this.assembleAndWriteChunked(transferId);
    }
  }
  // 标记一次分块传输结束；如果块已齐则立即组装，否则等待一段时间后清理。
  handleFileSyncComplete(msg) {
    const transferId = String(msg.transferId ?? "");
    if (!transferId) return;
    const transfer = this.pendingTransfers.get(transferId);
    if (transfer && transfer.chunks.size === transfer.totalChunks) {
      this.assembleAndWriteChunked(transferId);
    }
    setTimeout(() => {
      if (this.pendingTransfers.has(transferId)) {
        console.warn(`[VirtioSerialBridge] Cleaning up incomplete transfer ${transferId}`);
        this.pendingTransfers.delete(transferId);
      }
    }, 3e4);
  }
  // 按块序组装完整文件并写入宿主路径。
  assembleAndWriteChunked(transferId) {
    const transfer = this.pendingTransfers.get(transferId);
    if (!transfer) return;
    const hostPath = this.resolveHostPath(transfer.path);
    if (!hostPath) {
      this.pendingTransfers.delete(transferId);
      return;
    }
    try {
      fs$a.mkdirSync(path$7.dirname(hostPath), { recursive: true });
      const buffers = [];
      for (let i = 0; i < transfer.totalChunks; i++) {
        const chunk = transfer.chunks.get(i);
        if (!chunk) {
          console.warn(`[VirtioSerialBridge] Missing chunk ${i} for transfer ${transferId}`);
          this.pendingTransfers.delete(transferId);
          return;
        }
        buffers.push(chunk);
      }
      fs$a.writeFileSync(hostPath, Buffer.concat(buffers));
      console.log(`[VirtioSerialBridge] Chunked file synced: ${transfer.path}`);
    } catch (error) {
      console.warn(`[VirtioSerialBridge] Chunked file write error for ${transfer.path}:`, error);
    } finally {
      this.pendingTransfers.delete(transferId);
    }
  }
  /** Send a sandbox request to the guest via serial */
  // 通过 serial 通道向 guest 发送一条 sandbox request。
  sendRequest(requestId, data) {
    this.sendLine({ type: "request", requestId, data });
  }
  /** Send a permission response to the guest via serial */
  // 通过 serial 通道把权限确认结果发送给 guest。
  sendPermissionResponse(requestId, result) {
    this.sendLine({ type: "permission_response", requestId, result });
  }
  /** Send a host tool response to the guest via serial */
  // 通过 serial 通道把宿主工具执行结果发送给 guest。
  sendHostToolResponse(requestId, payload) {
    this.sendLine({
      type: "host_tool_response",
      requestId,
      ...payload
    });
  }
  /**
   * Push a file from host to guest via serial.
   * Used to transfer skill files into the sandbox on Windows (where 9p is unavailable).
   */
  // 把宿主文件推送给 guest；大文件会自动拆块发送。
  pushFile(basePath, relativePath, data) {
    coworkLog("INFO", "VirtioSerialBridge", `pushFile: ${relativePath} (${data.length} bytes) -> ${basePath}/${relativePath}`);
    const CHUNK_SIZE = 512 * 1024;
    const syncPath = relativePath.replace(/\\/g, "/");
    if (data.length <= CHUNK_SIZE) {
      this.sendLine({
        type: "push_file",
        basePath,
        path: syncPath,
        data: data.toString("base64")
      });
    } else {
      const transferId = v4();
      const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, data.length);
        this.sendLine({
          type: "push_file_chunk",
          transferId,
          basePath,
          path: syncPath,
          chunkIndex: i,
          totalChunks,
          data: data.subarray(start, end).toString("base64")
        });
      }
      this.sendLine({
        type: "push_file_complete",
        transferId,
        basePath,
        path: syncPath,
        totalChunks
      });
    }
  }
  // 把一条 JSON line 写入 socket；未连接时只记日志不抛错。
  sendLine(data) {
    if (this.socket && this.connected) {
      this.socket.write(JSON.stringify(data) + "\n");
    } else {
      coworkLog("WARN", "VirtioSerialBridge", `sendLine dropped (not connected): type=${String(data.type ?? "unknown")}`);
    }
  }
  // 主动关闭 bridge，并清空状态缓存。
  close() {
    var _a3;
    (_a3 = this.socket) == null ? void 0 : _a3.destroy();
    this.socket = null;
    this.connected = false;
    this.pendingTransfers.clear();
  }
}
const SANDBOX_ALLOWED_ENV_KEYS = [
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "LOBSTERAI_API_BASE_URL",
  "ANTHROPIC_MODEL",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "TZ",
  "tz"
];
const SANDBOX_SKILLS_MOUNT_TAG = "skills";
const SANDBOX_SKILLS_GUEST_PATH = "/workspace/skills";
const SANDBOX_SKILLS_GUEST_PATH_WINDOWS = "/workspace/project/SKILLs";
const SANDBOX_WORKSPACE_GUEST_ROOT = "/workspace/project";
const SANDBOX_WORKSPACE_LEGACY_ROOT = "/workspace";
const ATTACHMENT_LINE_RE = /^\s*(?:[-*]\s*)?(输入文件|input\s*file)\s*[:：]\s*(.+?)\s*$/i;
const INFERRED_FILE_REFERENCE_RE = /([^\s"'`，。！？：:；;（）()\[\]{}<>《》【】]+?\.[A-Za-z][A-Za-z0-9]{0,7})/g;
const SANDBOX_ATTACHMENT_DIR = path$7.join(".cowork-temp", "attachments");
const LEGACY_SKILLS_ROOT_HINTS = ["/home/ubuntu/skills", "/mnt/skills", "/tmp/workspace/skills", "/workspace/skills", "/workspace/SKILLs"];
const INFERRED_FILE_SEARCH_IGNORE = /* @__PURE__ */ new Set([".git", "node_modules", ".cowork-temp", ".idea", ".vscode"]);
const SANDBOX_HISTORY_MAX_MESSAGES = 18;
const SANDBOX_HISTORY_MAX_TOTAL_CHARS = 24e3;
const SANDBOX_HISTORY_MAX_MESSAGE_CHARS = 3e3;
const LOCAL_HISTORY_MAX_MESSAGES = 24;
const LOCAL_HISTORY_MAX_TOTAL_CHARS = 32e3;
const LOCAL_HISTORY_MAX_MESSAGE_CHARS = 4e3;
const STREAM_UPDATE_THROTTLE_MS = 90;
const STREAMING_TEXT_MAX_CHARS = 12e4;
const STREAMING_THINKING_MAX_CHARS = 6e4;
const TOOL_RESULT_MAX_CHARS = 12e4;
const FINAL_RESULT_MAX_CHARS = 12e4;
const STDERR_TAIL_MAX_CHARS = 24e3;
const SDK_STARTUP_TIMEOUT_MS = 3e4;
const SDK_STARTUP_TIMEOUT_WITH_USER_MCP_MS = 12e4;
const STDERR_FATAL_PATTERNS = [
  /authentication[_ ]error/i,
  /invalid[_ ]api[_ ]key/i,
  /unauthorized/i,
  /model[_ ]not[_ ]found/i,
  /connection[_ ]refused/i,
  /ECONNREFUSED/,
  /could not connect/i,
  /api[_ ]key[_ ]not[_ ]valid/i,
  /permission[_ ]denied/i,
  /access[_ ]denied/i,
  /rate[_ ]limit/i,
  /quota[_ ]exceeded/i,
  /billing/i,
  /overloaded/i
];
const CONTENT_TRUNCATED_HINT = "\n...[truncated to prevent memory pressure]";
const TOOL_INPUT_PREVIEW_MAX_CHARS = 4e3;
const TOOL_INPUT_PREVIEW_MAX_DEPTH = 5;
const TOOL_INPUT_PREVIEW_MAX_KEYS = 60;
const TOOL_INPUT_PREVIEW_MAX_ITEMS = 30;
const SKILLS_MARKER = "/skills/";
const TASK_WORKSPACE_CONTAINER_DIR = ".lobsterai-tasks";
const PERMISSION_RESPONSE_TIMEOUT_MS = 6e4;
const DELETE_TOOL_NAMES = /* @__PURE__ */ new Set(["delete", "remove", "unlink", "rmdir"]);
const SAFETY_APPROVAL_ALLOW_OPTION = "允许本次操作";
const SAFETY_APPROVAL_DENY_OPTION = "拒绝本次操作";
const DELETE_COMMAND_RE = /\b(rm|rmdir|unlink|del|erase|remove-item)\b/i;
const FIND_DELETE_COMMAND_RE = /\bfind\b[\s\S]*\s-delete\b/i;
const GIT_CLEAN_COMMAND_RE = /\bgit\s+clean\b/i;
const PYTHON_BASH_COMMAND_RE = /(?:^|[^\w.-])(?:python(?:3)?|py(?:\.exe)?|pip(?:3)?)(?:\s+-3)?(?:\s|$)|\.py(?:\s|$)/i;
const PYTHON_PIP_BASH_COMMAND_RE = /(?:^|[^\w.-])(?:pip(?:3)?|python(?:3)?\s+-m\s+pip|py(?:\.exe)?\s+-m\s+pip)(?:\s|$)/i;
const MEMORY_REQUEST_TAIL_SPLIT_RE = /[,，。]\s*(?:请|麻烦)?你(?:帮我|帮忙|给我|为我|看下|看一下|查下|查一下)|[,，。]\s*帮我|[,，。]\s*请帮我|[,，。]\s*(?:能|可以)不能?\s*帮我|[,，。]\s*你看|[,，。]\s*请你/i;
const MEMORY_PROCEDURAL_TEXT_RE = /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i;
const MEMORY_ASSISTANT_STYLE_TEXT_RE = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i;
const WINDOWS_HIDE_INIT_SCRIPT_NAME = "windows_hide_init.cjs";
const WINDOWS_HIDE_INIT_SCRIPT_CONTENT = [
  "'use strict';",
  "",
  "if (process.platform === 'win32') {",
  "  const childProcess = require('child_process');",
  "",
  "  const addWindowsHide = (options) => {",
  "    if (options == null) return { windowsHide: true };",
  "    if (typeof options !== 'object') return options;",
  "    if (Object.prototype.hasOwnProperty.call(options, 'windowsHide')) return options;",
  "    return { ...options, windowsHide: true };",
  "  };",
  "",
  "  const patch = (name, buildWrapper) => {",
  "    const original = childProcess[name];",
  "    if (typeof original !== 'function') return;",
  "    childProcess[name] = buildWrapper(original);",
  "  };",
  "",
  "  patch('spawn', (original) => function patchedSpawn(command, args, options) {",
  "    if (Array.isArray(args) || args === undefined) {",
  "      return original.call(this, command, args, addWindowsHide(options));",
  "    }",
  "    return original.call(this, command, addWindowsHide(args));",
  "  });",
  "",
  "  patch('spawnSync', (original) => function patchedSpawnSync(command, args, options) {",
  "    if (Array.isArray(args) || args === undefined) {",
  "      return original.call(this, command, args, addWindowsHide(options));",
  "    }",
  "    return original.call(this, command, addWindowsHide(args));",
  "  });",
  "",
  "  patch('fork', (original) => function patchedFork(modulePath, args, options) {",
  "    if (Array.isArray(args) || args === undefined) {",
  "      return original.call(this, modulePath, args, addWindowsHide(options));",
  "    }",
  "    return original.call(this, modulePath, addWindowsHide(args));",
  "  });",
  "",
  "  patch('exec', (original) => function patchedExec(command, options, callback) {",
  "    if (typeof options === 'function' || options === undefined) {",
  "      return original.call(this, command, addWindowsHide(undefined), options);",
  "    }",
  "    return original.call(this, command, addWindowsHide(options), callback);",
  "  });",
  "",
  "  patch('execFile', (original) => function patchedExecFile(file, args, options, callback) {",
  "    if (Array.isArray(args) || args === undefined) {",
  "      if (typeof options === 'function' || options === undefined) {",
  "        return original.call(this, file, args, addWindowsHide(undefined), options);",
  "      }",
  "      return original.call(this, file, args, addWindowsHide(options), callback);",
  "    }",
  "    if (typeof args === 'function' || args === undefined) {",
  "      return original.call(this, file, addWindowsHide(undefined), args);",
  "    }",
  "    return original.call(this, file, addWindowsHide(args), options);",
  "  });",
  "}",
  ""
].join("\n");
function ensureWindowsChildProcessHideInitScript() {
  if (process.platform !== "win32") {
    return null;
  }
  try {
    const initDir = path$7.join(require$$0$1.app.getPath("userData"), "cowork", "bin");
    fs$a.mkdirSync(initDir, { recursive: true });
    const initScriptPath = path$7.join(initDir, WINDOWS_HIDE_INIT_SCRIPT_NAME);
    const existing = fs$a.existsSync(initScriptPath) ? fs$a.readFileSync(initScriptPath, "utf8") : "";
    if (existing !== WINDOWS_HIDE_INIT_SCRIPT_CONTENT) {
      fs$a.writeFileSync(initScriptPath, WINDOWS_HIDE_INIT_SCRIPT_CONTENT, "utf8");
    }
    return initScriptPath;
  } catch (error) {
    coworkLog(
      "WARN",
      "runClaudeCodeLocal",
      `Failed to prepare Windows child-process hide init script: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
function prependNodeRequireArg(args, scriptPath) {
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === "--require" && args[i + 1] === scriptPath) {
      return args;
    }
  }
  return ["--require", scriptPath, ...args];
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findSkillsMarkerIndex(value) {
  return value.toLowerCase().lastIndexOf(SKILLS_MARKER);
}
function isPathWithin(basePath, targetPath) {
  if (process.platform === "win32") {
    const normalizedBase = basePath.toLowerCase();
    const normalizedTarget = targetPath.toLowerCase();
    return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}${path$7.sep}`);
  }
  return targetPath === basePath || targetPath.startsWith(`${basePath}${path$7.sep}`);
}
function resolveSkillPathFromRoots(rawPath, hostSkillsRoots) {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (fs$a.existsSync(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.replace(/\\/g, "/");
  const markerIndex = findSkillsMarkerIndex(normalized);
  if (markerIndex >= 0) {
    const relative = normalized.slice(markerIndex + SKILLS_MARKER.length).replace(/^\/+/, "");
    if (relative) {
      const relativeParts = relative.split("/").filter(Boolean);
      for (const root of hostSkillsRoots) {
        if (!root) continue;
        const candidate = path$7.join(root, ...relativeParts);
        if (fs$a.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }
  const skillId = path$7.basename(path$7.dirname(trimmed));
  if (skillId) {
    for (const root of hostSkillsRoots) {
      if (!root) continue;
      const candidate = path$7.join(root, skillId, "SKILL.md");
      if (fs$a.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}
function detectBinaryMagic(filePath) {
  try {
    const buffer = fs$a.readFileSync(filePath, { encoding: null, flag: "r" }).subarray(0, 4);
    if (buffer.length >= 2 && buffer[0] === 31 && buffer[1] === 139) return "gzip";
    if (buffer.length >= 4 && buffer[0] === 127 && buffer[1] === 69 && buffer[2] === 76 && buffer[3] === 70) {
      return "elf";
    }
    if (buffer.length >= 4 && buffer[0] === 254 && buffer[1] === 237 && buffer[2] === 250 && buffer[3] === 206) return "macho-32";
    if (buffer.length >= 4 && buffer[0] === 254 && buffer[1] === 237 && buffer[2] === 250 && buffer[3] === 207) return "macho-64";
    if (buffer.length >= 4 && buffer[0] === 202 && buffer[1] === 254 && buffer[2] === 186 && buffer[3] === 190) return "macho-fat";
    if (buffer.length >= 2 && buffer[0] === 77 && buffer[1] === 90) return "pe";
  } catch {
    return "unreadable";
  }
  return "unknown";
}
function summarizeRuntimeBinary(runtimeBinary) {
  const exists = fs$a.existsSync(runtimeBinary);
  if (!exists) return `runtimeBinary=${runtimeBinary} (missing)`;
  try {
    const stat = fs$a.statSync(runtimeBinary);
    const mode = process.platform === "win32" ? "n/a" : `0o${(stat.mode & 511).toString(8)}`;
    const exec = process.platform === "win32" ? "n/a" : stat.mode & 73 ? "yes" : "no";
    const magic = detectBinaryMagic(runtimeBinary);
    return `runtimeBinary=${runtimeBinary} (size=${stat.size}, mode=${mode}, exec=${exec}, magic=${magic})`;
  } catch (error) {
    return `runtimeBinary=${runtimeBinary} (stat failed: ${error instanceof Error ? error.message : String(error)})`;
  }
}
function persistSandboxSpawnDiagnostics(runtimeInfo, details) {
  try {
    if (!runtimeInfo.baseDir) return null;
    fs$a.mkdirSync(runtimeInfo.baseDir, { recursive: true });
    const logPath = path$7.join(runtimeInfo.baseDir, "last-spawn-error.txt");
    fs$a.writeFileSync(logPath, details);
    return logPath;
  } catch {
    return null;
  }
}
function formatSandboxSpawnError(error, runtimeInfo) {
  const runtimeSummary = summarizeRuntimeBinary(runtimeInfo.runtimeBinary);
  const err = error && typeof error === "object" ? error : null;
  const details = [];
  if (err == null ? void 0 : err.code) details.push(`code=${err.code}`);
  if (typeof (err == null ? void 0 : err.errno) === "number") details.push(`errno=${err.errno}`);
  if (err == null ? void 0 : err.syscall) details.push(`syscall=${err.syscall}`);
  if (err == null ? void 0 : err.path) details.push(`path=${err.path}`);
  if (Array.isArray(err == null ? void 0 : err.spawnargs) && err.spawnargs.length > 0) {
    details.push(`args=${err.spawnargs.join(" ")}`);
  }
  const detailString = details.length ? ` (${details.join(", ")})` : "";
  const baseMessage = (err == null ? void 0 : err.message) || "Sandbox VM spawn failed";
  const hint = (err == null ? void 0 : err.code) === "ENOEXEC" || (err == null ? void 0 : err.errno) === -8 ? " Possible exec format mismatch (wrong arch or compressed binary)." : "";
  const diagnostics = `${baseMessage}${detailString}.${hint} ${runtimeSummary}`;
  const logPath = persistSandboxSpawnDiagnostics(runtimeInfo, diagnostics);
  return logPath ? `${diagnostics} Diagnostics saved to: ${logPath}` : diagnostics;
}
function summarizeEndpointForLog(rawValue) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const defaultPort = parsed.protocol === "https:" ? "443" : parsed.protocol === "http:" ? "80" : "";
    const resolvedPort = parsed.port || defaultPort;
    const port = resolvedPort ? `:${resolvedPort}` : "";
    return `${parsed.protocol}//${parsed.hostname}${port}`;
  } catch {
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
  }
}
function extractHostFromUrl(rawValue) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).hostname || null;
  } catch {
    return null;
  }
}
function mergeNoProxyList(currentValue, requiredHosts) {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  const addEntry = (entry) => {
    const normalized = entry.trim();
    if (!normalized) return;
    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    items.push(normalized);
  };
  if (currentValue) {
    for (const part of currentValue.split(",")) {
      addEntry(part);
    }
  }
  for (const host of requiredHosts) {
    addEntry(host);
  }
  return items.join(",");
}
class CoworkRunner extends require$$4.EventEmitter {
  constructor(store2) {
    super();
    __publicField(this, "store");
    __publicField(this, "activeSessions", /* @__PURE__ */ new Map());
    __publicField(this, "pendingPermissions", /* @__PURE__ */ new Map());
    __publicField(this, "sandboxPermissions", /* @__PURE__ */ new Map());
    __publicField(this, "stoppedSessions", /* @__PURE__ */ new Set());
    __publicField(this, "turnMemoryQueue", []);
    __publicField(this, "turnMemoryQueueKeys", /* @__PURE__ */ new Set());
    __publicField(this, "lastTurnMemoryKeyBySession", /* @__PURE__ */ new Map());
    __publicField(this, "drainingTurnMemoryQueue", false);
    __publicField(this, "mcpServerProvider");
    this.store = store2;
  }
  setMcpServerProvider(provider) {
    this.mcpServerProvider = provider;
  }
  isSessionStopRequested(sessionId, activeSession) {
    return this.stoppedSessions.has(sessionId) || Boolean(activeSession == null ? void 0 : activeSession.abortController.signal.aborted);
  }
  applyTurnMemoryUpdatesForSession(sessionId) {
    const config2 = this.store.getConfig();
    if (!config2.memoryEnabled) {
      return;
    }
    const session = this.store.getSession(sessionId);
    if (!session || session.messages.length === 0) {
      return;
    }
    const lastUser = [...session.messages].reverse().find((message) => {
      var _a3;
      return message.type === "user" && ((_a3 = message.content) == null ? void 0 : _a3.trim());
    });
    const lastAssistant = [...session.messages].reverse().find((message) => {
      var _a3, _b;
      if (message.type !== "assistant") return false;
      if (!((_a3 = message.content) == null ? void 0 : _a3.trim())) return false;
      if ((_b = message.metadata) == null ? void 0 : _b.isThinking) return false;
      return true;
    });
    if (!lastUser || !lastAssistant) {
      return;
    }
    const key = `${sessionId}:${lastUser.id}:${lastAssistant.id}`;
    if (this.lastTurnMemoryKeyBySession.get(sessionId) === key || this.turnMemoryQueueKeys.has(key)) {
      return;
    }
    this.turnMemoryQueueKeys.add(key);
    this.turnMemoryQueue.push({
      key,
      sessionId,
      userText: lastUser.content,
      assistantText: lastAssistant.content,
      implicitEnabled: config2.memoryImplicitUpdateEnabled,
      memoryLlmJudgeEnabled: config2.memoryLlmJudgeEnabled,
      guardLevel: config2.memoryGuardLevel,
      userMessageId: lastUser.id,
      assistantMessageId: lastAssistant.id,
      enqueuedAt: Date.now()
    });
    void this.drainTurnMemoryQueue();
  }
  getSandboxUnavailableFallbackNotice(errorMessage) {
    if (this.store.getAppLanguage() === "en") {
      return `Sandbox VM is unavailable. Falling back to local execution. (${errorMessage})`;
    }
    return `沙箱 VM 当前不可用，已回退为本地执行。（${errorMessage}）`;
  }
  async drainTurnMemoryQueue() {
    if (this.drainingTurnMemoryQueue) {
      return;
    }
    this.drainingTurnMemoryQueue = true;
    try {
      while (this.turnMemoryQueue.length > 0) {
        const job = this.turnMemoryQueue.shift();
        if (!job) continue;
        try {
          const result = await this.store.applyTurnMemoryUpdates({
            sessionId: job.sessionId,
            userText: job.userText,
            assistantText: job.assistantText,
            implicitEnabled: job.implicitEnabled,
            memoryLlmJudgeEnabled: job.memoryLlmJudgeEnabled,
            guardLevel: job.guardLevel,
            userMessageId: job.userMessageId,
            assistantMessageId: job.assistantMessageId
          });
          coworkLog("INFO", "memory:turnUpdateAsync", "Applied turn memory updates asynchronously", {
            sessionId: job.sessionId,
            queueSize: this.turnMemoryQueue.length,
            latencyMs: Math.max(0, Date.now() - job.enqueuedAt),
            ...result
          });
        } catch (error) {
          coworkLog("WARN", "memory:turnUpdateAsync", "Failed to apply turn memory updates asynchronously", {
            sessionId: job.sessionId,
            queueSize: this.turnMemoryQueue.length,
            error: error instanceof Error ? error.message : String(error)
          });
        } finally {
          this.lastTurnMemoryKeyBySession.set(job.sessionId, job.key);
          this.turnMemoryQueueKeys.delete(job.key);
        }
      }
    } finally {
      this.drainingTurnMemoryQueue = false;
      if (this.turnMemoryQueue.length > 0) {
        void this.drainTurnMemoryQueue();
      }
    }
  }
  escapeXml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  buildUserMemoriesXml() {
    const config2 = this.store.getConfig();
    if (!config2.memoryEnabled) {
      return "<userMemories></userMemories>";
    }
    const memories = this.store.listUserMemories({
      status: "created",
      includeDeleted: false,
      limit: config2.memoryUserMemoriesMaxItems,
      offset: 0
    });
    if (memories.length === 0) {
      return "<userMemories></userMemories>";
    }
    const MAX_ITEM_CHARS = 200;
    const MAX_TOTAL_CHARS = 2e3;
    let totalChars = 0;
    const lines = [];
    for (const memory of memories) {
      const text = memory.text.length > MAX_ITEM_CHARS ? memory.text.slice(0, MAX_ITEM_CHARS) + "..." : memory.text;
      const line = `- ${this.escapeXml(text)}`;
      if (totalChars + line.length > MAX_TOTAL_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }
    return `<userMemories>
${lines.join("\n")}
</userMemories>`;
  }
  formatChatSearchOutput(records) {
    if (records.length === 0) {
      return "No matching chats found.";
    }
    return records.map((record) => {
      const updatedAtIso = new Date(record.updatedAt || Date.now()).toISOString();
      return [
        `<chat url="${this.escapeXml(record.url)}" updated_at="${updatedAtIso}">`,
        `Title: ${record.title || "Untitled"}`,
        `Human: ${(record.human || "").trim() || "(empty)"}`,
        `Assistant: ${(record.assistant || "").trim() || "(empty)"}`,
        "</chat>"
      ].join("\n");
    }).join("\n\n");
  }
  formatMemoryUserEditsResult(input) {
    const parts = [
      `action=${input.action}`,
      `success=${input.successCount}`,
      `failed=${input.failedCount}`,
      `changed_ids=${input.changedIds.join(",") || "-"}`
    ];
    if (input.reason) {
      parts.push(`reason=${input.reason}`);
    }
    if (input.payload) {
      parts.push(input.payload);
    }
    return parts.join("\n");
  }
  sanitizeMemoryToolText(raw) {
    const normalized = raw.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "";
    }
    const tailMatch = normalized.match(MEMORY_REQUEST_TAIL_SPLIT_RE);
    const clipped = (tailMatch == null ? void 0 : tailMatch.index) && tailMatch.index > 0 ? normalized.slice(0, tailMatch.index) : normalized;
    return clipped.replace(/[，,；;:\-]+$/, "").trim();
  }
  validateMemoryToolText(rawText) {
    const text = this.sanitizeMemoryToolText(rawText);
    if (!text) {
      return { ok: false, text: "", reason: "text is required" };
    }
    if (isQuestionLikeMemoryText(text)) {
      return { ok: false, text: "", reason: "memory text looks like a question, not a durable fact" };
    }
    if (MEMORY_ASSISTANT_STYLE_TEXT_RE.test(text)) {
      return { ok: false, text: "", reason: "memory text looks like assistant workflow instruction" };
    }
    if (MEMORY_PROCEDURAL_TEXT_RE.test(text)) {
      return { ok: false, text: "", reason: "memory text looks like command/procedural content" };
    }
    return { ok: true, text };
  }
  runConversationSearchTool(args) {
    const chats = this.store.conversationSearch({
      query: args.query,
      maxResults: args.max_results,
      before: args.before,
      after: args.after
    });
    return this.formatChatSearchOutput(chats);
  }
  runRecentChatsTool(args) {
    const chats = this.store.recentChats({
      n: args.n,
      sortOrder: args.sort_order,
      before: args.before,
      after: args.after
    });
    return this.formatChatSearchOutput(chats);
  }
  runMemoryUserEditsTool(args) {
    var _a3, _b, _c;
    if (args.action === "list") {
      const entries = this.store.listUserMemories({
        query: args.query,
        status: "all",
        includeDeleted: true,
        limit: args.limit ?? 20,
        offset: 0
      });
      const payload = entries.length === 0 ? "memories=(empty)" : entries.map((entry) => `${entry.id} | ${entry.status} | explicit=${entry.isExplicit ? 1 : 0} | ${entry.text}`).join("\n");
      return {
        text: this.formatMemoryUserEditsResult({
          action: "list",
          successCount: entries.length,
          failedCount: 0,
          changedIds: entries.map((entry) => entry.id),
          payload
        }),
        isError: false
      };
    }
    if (args.action === "add") {
      const text = (_a3 = args.text) == null ? void 0 : _a3.trim();
      if (!text) {
        return {
          text: this.formatMemoryUserEditsResult({
            action: "add",
            successCount: 0,
            failedCount: 1,
            changedIds: [],
            reason: "text is required"
          }),
          isError: true
        };
      }
      const validation = this.validateMemoryToolText(text);
      if (!validation.ok) {
        return {
          text: this.formatMemoryUserEditsResult({
            action: "add",
            successCount: 0,
            failedCount: 1,
            changedIds: [],
            reason: validation.reason
          }),
          isError: true
        };
      }
      const entry = this.store.createUserMemory({
        text: validation.text,
        confidence: args.confidence,
        isExplicit: args.is_explicit ?? true
      });
      return {
        text: this.formatMemoryUserEditsResult({
          action: "add",
          successCount: 1,
          failedCount: 0,
          changedIds: [entry.id]
        }),
        isError: false
      };
    }
    if (args.action === "update") {
      if (!((_b = args.id) == null ? void 0 : _b.trim())) {
        return {
          text: this.formatMemoryUserEditsResult({
            action: "update",
            successCount: 0,
            failedCount: 1,
            changedIds: [],
            reason: "id is required"
          }),
          isError: true
        };
      }
      if (typeof args.text === "string") {
        const validation = this.validateMemoryToolText(args.text);
        if (!validation.ok) {
          return {
            text: this.formatMemoryUserEditsResult({
              action: "update",
              successCount: 0,
              failedCount: 1,
              changedIds: [],
              reason: validation.reason
            }),
            isError: true
          };
        }
        args.text = validation.text;
      }
      const updated = this.store.updateUserMemory({
        id: args.id.trim(),
        text: args.text,
        confidence: args.confidence,
        status: args.status,
        isExplicit: args.is_explicit
      });
      if (!updated) {
        return {
          text: this.formatMemoryUserEditsResult({
            action: "update",
            successCount: 0,
            failedCount: 1,
            changedIds: [],
            reason: "memory not found"
          }),
          isError: true
        };
      }
      return {
        text: this.formatMemoryUserEditsResult({
          action: "update",
          successCount: 1,
          failedCount: 0,
          changedIds: [updated.id]
        }),
        isError: false
      };
    }
    if (!((_c = args.id) == null ? void 0 : _c.trim())) {
      return {
        text: this.formatMemoryUserEditsResult({
          action: "delete",
          successCount: 0,
          failedCount: 1,
          changedIds: [],
          reason: "id is required"
        }),
        isError: true
      };
    }
    const deleted = this.store.deleteUserMemory(args.id.trim());
    return {
      text: this.formatMemoryUserEditsResult({
        action: "delete",
        successCount: deleted ? 1 : 0,
        failedCount: deleted ? 0 : 1,
        changedIds: deleted ? [args.id.trim()] : [],
        reason: deleted ? void 0 : "memory not found"
      }),
      isError: !deleted
    };
  }
  isDirectory(target) {
    try {
      return fs$a.statSync(target).isDirectory();
    } catch {
      return false;
    }
  }
  extractHostSkillRootsFromPrompt(systemPrompt) {
    var _a3;
    if (!systemPrompt || !systemPrompt.includes("<location>")) {
      return [];
    }
    const roots = /* @__PURE__ */ new Set();
    const locationRe = /<location>(.*?)<\/location>/g;
    let match;
    while ((match = locationRe.exec(systemPrompt)) !== null) {
      const rawLocation = (_a3 = match[1]) == null ? void 0 : _a3.trim();
      if (!rawLocation || !path$7.isAbsolute(rawLocation)) {
        continue;
      }
      const normalized = path$7.resolve(rawLocation);
      const normalizedPosix = normalized.replace(/\\/g, "/");
      const markerIndex = findSkillsMarkerIndex(normalizedPosix);
      const rootFromMarker = markerIndex < 0 ? null : normalizedPosix.slice(0, markerIndex + SKILLS_MARKER.length - 1);
      if (rootFromMarker) {
        roots.add(path$7.resolve(rootFromMarker));
        continue;
      }
      roots.add(path$7.resolve(path$7.dirname(path$7.dirname(normalized))));
    }
    return Array.from(roots);
  }
  collectHostSkillsRoots(env, cwdMapping, systemPrompt) {
    const candidates = [];
    const pushCandidate = (candidate) => {
      if (!candidate) return;
      const resolved = path$7.resolve(candidate);
      if (!candidates.includes(resolved)) {
        candidates.push(resolved);
      }
    };
    pushCandidate(env.SKILLS_ROOT);
    pushCandidate(env.LOBSTERAI_SKILLS_ROOT);
    for (const root of this.extractHostSkillRootsFromPrompt(systemPrompt)) {
      pushCandidate(root);
    }
    pushCandidate(getSkillsRoot());
    if (require$$0$1.app.isPackaged) {
      pushCandidate(path$7.join(process.resourcesPath, "SKILLs"));
      pushCandidate(path$7.join(process.resourcesPath, "skills"));
      pushCandidate(path$7.join(require$$0$1.app.getAppPath(), "SKILLs"));
      pushCandidate(path$7.join(require$$0$1.app.getAppPath(), "skills"));
    }
    pushCandidate(path$7.join(cwdMapping.hostPath, "SKILLs"));
    pushCandidate(path$7.join(cwdMapping.hostPath, "skills"));
    return candidates.filter((candidate) => this.isDirectory(candidate));
  }
  collectSandboxSkillEntries(hostSkillsRoots, guestSkillsRoot) {
    const bySkillId = /* @__PURE__ */ new Map();
    const orderedSkillIds = [];
    const upsertSkill = (skillId, hostPath) => {
      if (bySkillId.has(skillId)) {
        const index2 = orderedSkillIds.indexOf(skillId);
        if (index2 >= 0) {
          orderedSkillIds.splice(index2, 1);
        }
      }
      bySkillId.set(skillId, hostPath);
      orderedSkillIds.push(skillId);
    };
    const collectFromSkillDir = (skillDir) => {
      const skillPath = path$7.join(skillDir, "SKILL.md");
      if (!fs$a.existsSync(skillPath)) {
        return;
      }
      const skillId = path$7.basename(skillDir);
      if (!skillId) {
        return;
      }
      upsertSkill(skillId, path$7.resolve(skillDir));
    };
    for (const root of hostSkillsRoots) {
      const resolvedRoot = path$7.resolve(root);
      if (!this.isDirectory(resolvedRoot)) {
        continue;
      }
      collectFromSkillDir(resolvedRoot);
      let entries = [];
      try {
        entries = fs$a.readdirSync(resolvedRoot, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) {
          continue;
        }
        collectFromSkillDir(path$7.join(resolvedRoot, entry.name));
      }
    }
    return orderedSkillIds.map((skillId, index2) => {
      const hostPath = bySkillId.get(skillId);
      const guestPath = `${guestSkillsRoot}/${skillId}`.replace(/\/+/g, "/");
      return {
        skillId,
        hostPath,
        guestPath,
        mountTag: `${SANDBOX_SKILLS_MOUNT_TAG}${index2}`
      };
    });
  }
  resolveSandboxSkillsConfig(hostSkillsRoots, runtimePlatform) {
    const guestSkillsRoot = runtimePlatform === "win32" ? SANDBOX_SKILLS_GUEST_PATH_WINDOWS : SANDBOX_SKILLS_GUEST_PATH;
    const skillEntries = this.collectSandboxSkillEntries(hostSkillsRoots, guestSkillsRoot);
    if (skillEntries.length === 0) {
      return {
        guestSkillsRoot: null,
        skillEntries: [],
        extraMounts: [],
        skillMounts: {},
        rootMounts: []
      };
    }
    if (runtimePlatform === "win32") {
      return {
        guestSkillsRoot,
        skillEntries,
        extraMounts: [],
        skillMounts: {},
        rootMounts: []
      };
    }
    const keyOf = (target) => process.platform === "win32" ? target.toLowerCase() : target;
    const entryRoots = /* @__PURE__ */ new Set();
    for (const entry of skillEntries) {
      entryRoots.add(path$7.resolve(path$7.dirname(entry.hostPath)));
    }
    const mountHostRoots = [];
    const seenMountRoots = /* @__PURE__ */ new Set();
    const pushMountRoot = (candidate) => {
      const resolved = path$7.resolve(candidate);
      if (!entryRoots.has(resolved) || !this.isDirectory(resolved)) {
        return;
      }
      const key = keyOf(resolved);
      if (seenMountRoots.has(key)) {
        return;
      }
      seenMountRoots.add(key);
      mountHostRoots.push(resolved);
    };
    for (const root of hostSkillsRoots) {
      pushMountRoot(root);
    }
    for (const root of entryRoots) {
      pushMountRoot(root);
    }
    const rootMounts = mountHostRoots.map((hostRoot, index2) => ({
      hostRoot,
      guestRoot: index2 === 0 ? guestSkillsRoot : `${guestSkillsRoot}-roots/${index2}`,
      mountTag: `${SANDBOX_SKILLS_MOUNT_TAG}${index2}`
    }));
    const extraMounts = rootMounts.map(({ hostRoot, mountTag }) => ({ hostPath: hostRoot, mountTag }));
    const skillMounts = rootMounts.reduce((acc, entry, index2) => {
      acc[`skillsRoot${index2}`] = {
        tag: entry.mountTag,
        guestPath: entry.guestRoot
      };
      return acc;
    }, {});
    return {
      guestSkillsRoot,
      skillEntries,
      extraMounts,
      skillMounts,
      rootMounts
    };
  }
  buildSandboxEnv(env, guestSkillsRoot) {
    var _a3, _b;
    const sandboxEnv = {};
    const remapLocalhostToQemuGateway = (url2) => {
      return url2.replace(/\/\/localhost([:/])/gi, "//10.0.2.2$1").replace(/\/\/127\.0\.0\.1([:/])/g, "//10.0.2.2$1");
    };
    for (const key of SANDBOX_ALLOWED_ENV_KEYS) {
      const value = env[key];
      if (!value) continue;
      if (key.toLowerCase().includes("proxy") && !key.toLowerCase().includes("no_proxy") || key === "ANTHROPIC_BASE_URL" || key === "LOBSTERAI_API_BASE_URL") {
        sandboxEnv[key] = remapLocalhostToQemuGateway(value);
      } else {
        sandboxEnv[key] = value;
      }
    }
    const envTimezone = (sandboxEnv.TZ ?? sandboxEnv.tz ?? "").trim();
    if (envTimezone) {
      sandboxEnv.TZ = envTimezone;
      delete sandboxEnv.tz;
    } else {
      const hostTimezone = (_a3 = Intl.DateTimeFormat().resolvedOptions().timeZone) == null ? void 0 : _a3.trim();
      if (hostTimezone) {
        sandboxEnv.TZ = hostTimezone;
      }
    }
    if (guestSkillsRoot) {
      sandboxEnv.SKILLS_ROOT = guestSkillsRoot;
      sandboxEnv.LOBSTERAI_SKILLS_ROOT = guestSkillsRoot;
    }
    sandboxEnv.WEB_SEARCH_SERVER = "http://10.0.2.2:8923";
    const noProxyHosts = ["localhost", "127.0.0.1", "10.0.2.2"];
    const anthropicHost = extractHostFromUrl(sandboxEnv.ANTHROPIC_BASE_URL);
    const internalApiHost = extractHostFromUrl(sandboxEnv.LOBSTERAI_API_BASE_URL);
    const webSearchHost = extractHostFromUrl(sandboxEnv.WEB_SEARCH_SERVER);
    if (anthropicHost) noProxyHosts.push(anthropicHost);
    if (internalApiHost) noProxyHosts.push(internalApiHost);
    if (webSearchHost) noProxyHosts.push(webSearchHost);
    const mergedNoProxy = mergeNoProxyList(sandboxEnv.NO_PROXY ?? sandboxEnv.no_proxy, noProxyHosts);
    sandboxEnv.NO_PROXY = mergedNoProxy;
    sandboxEnv.no_proxy = mergedNoProxy;
    const anthropicBaseHost = (_b = extractHostFromUrl(sandboxEnv.ANTHROPIC_BASE_URL)) == null ? void 0 : _b.toLowerCase();
    const shouldForceDirectHostRouting = anthropicBaseHost === "10.0.2.2" || anthropicBaseHost === "127.0.0.1" || anthropicBaseHost === "localhost";
    if (shouldForceDirectHostRouting) {
      delete sandboxEnv.HTTP_PROXY;
      delete sandboxEnv.HTTPS_PROXY;
      delete sandboxEnv.http_proxy;
      delete sandboxEnv.https_proxy;
    }
    return sandboxEnv;
  }
  parseAttachmentEntries(prompt) {
    const lines = prompt.split(/\r?\n/);
    const entries = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const match = line.match(ATTACHMENT_LINE_RE);
      if (!(match == null ? void 0 : match[1]) || !match[2]) continue;
      entries.push({
        lineIndex: i,
        label: match[1],
        rawPath: match[2].trim()
      });
    }
    return entries;
  }
  resolveAttachmentPath(inputPath, cwd) {
    if (inputPath.startsWith("~/")) {
      const home = process.env.HOME || process.env.USERPROFILE || "";
      return home ? path$7.resolve(home, inputPath.slice(2)) : path$7.resolve(cwd, inputPath);
    }
    return path$7.isAbsolute(inputPath) ? path$7.resolve(inputPath) : path$7.resolve(cwd, inputPath);
  }
  toWorkspaceRelativePromptPath(cwd, absolutePath) {
    const relative = path$7.relative(cwd, absolutePath);
    const normalized = relative.split(path$7.sep).join("/");
    if (!normalized || normalized === ".") {
      return "./";
    }
    return normalized.startsWith(".") ? normalized : `./${normalized}`;
  }
  stageExternalAttachment(cwd, sourcePath, sessionId, index2) {
    if (!fs$a.existsSync(sourcePath)) {
      return null;
    }
    try {
      const sourceStat = fs$a.statSync(sourcePath);
      const stageRoot = path$7.join(cwd, SANDBOX_ATTACHMENT_DIR, sessionId);
      fs$a.mkdirSync(stageRoot, { recursive: true });
      const baseName = path$7.basename(sourcePath) || `attachment-${index2 + 1}`;
      const parsed = path$7.parse(baseName);
      let targetPath = path$7.join(stageRoot, baseName);
      let suffix = 1;
      while (fs$a.existsSync(targetPath)) {
        targetPath = path$7.join(stageRoot, `${parsed.name}-${suffix}${parsed.ext}`);
        suffix += 1;
      }
      if (sourceStat.isDirectory()) {
        cpRecursiveSync(sourcePath, targetPath, { force: true });
      } else {
        fs$a.copyFileSync(sourcePath, targetPath);
      }
      return this.toWorkspaceRelativePromptPath(cwd, targetPath);
    } catch (error) {
      console.warn("[cowork] Failed to stage sandbox attachment:", sourcePath, error);
      return null;
    }
  }
  /**
   * Push staged attachment files from .cowork-temp/attachments/{sessionId}/ to
   * the sandbox VM via virtio-serial bridge.  On macOS/Linux, attachments are
   * accessible via 9p mount, so this is only needed on Windows (serial mode).
   */
  pushStagedAttachmentsToSandbox(bridge, cwd, sessionId) {
    const stageRoot = path$7.join(cwd, SANDBOX_ATTACHMENT_DIR, sessionId);
    if (!fs$a.existsSync(stageRoot)) {
      return;
    }
    const files = [];
    const scan = (dir, base) => {
      let entries;
      try {
        entries = fs$a.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = path$7.join(dir, entry.name);
        const relPath = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scan(fullPath, relPath);
        } else if (entry.isFile()) {
          try {
            files.push({ relativePath: relPath, data: fs$a.readFileSync(fullPath) });
          } catch {
          }
        }
      }
    };
    scan(stageRoot, "");
    if (files.length === 0) {
      return;
    }
    const guestAttachmentDir = `${SANDBOX_ATTACHMENT_DIR.split(path$7.sep).join("/")}/${sessionId}`;
    for (const file2 of files) {
      bridge.pushFile(SANDBOX_WORKSPACE_GUEST_ROOT, `${guestAttachmentDir}/${file2.relativePath}`, file2.data);
    }
    coworkLog("INFO", "runSandbox", "Pushed staged attachments to sandbox", {
      sessionId,
      fileCount: files.length,
      files: files.map((f) => f.relativePath).join(", ")
    });
  }
  preparePromptForSandbox(prompt, cwd, sessionId) {
    const lines = prompt.split(/\r?\n/);
    const entries = this.parseAttachmentEntries(prompt);
    if (entries.length === 0) {
      return { prompt, unresolved: [] };
    }
    const unresolved = [];
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const resolvedPath = this.resolveAttachmentPath(entry.rawPath, cwd);
      const relative = path$7.relative(cwd, resolvedPath);
      const isOutside = relative.startsWith("..") || path$7.isAbsolute(relative);
      let sandboxPath;
      if (isOutside) {
        sandboxPath = this.stageExternalAttachment(cwd, resolvedPath, sessionId, i);
      } else {
        sandboxPath = this.toWorkspaceRelativePromptPath(cwd, resolvedPath);
      }
      if (!sandboxPath) {
        unresolved.push(entry.rawPath);
        continue;
      }
      lines[entry.lineIndex] = `${entry.label}: ${sandboxPath}`;
    }
    return {
      prompt: lines.join("\n"),
      unresolved
    };
  }
  findWorkspaceFileByName(cwd, fileName, maxMatches = 2) {
    if (!fileName) {
      return [];
    }
    const matches = [];
    const queue = [cwd];
    while (queue.length > 0 && matches.length < maxMatches) {
      const current = queue.shift();
      if (!current) continue;
      let entries = [];
      try {
        entries = fs$a.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (matches.length >= maxMatches) break;
        const fullPath = path$7.join(current, entry.name);
        if (entry.isDirectory()) {
          if (INFERRED_FILE_SEARCH_IGNORE.has(entry.name)) {
            continue;
          }
          queue.push(fullPath);
          continue;
        }
        if (entry.isFile() && entry.name === fileName) {
          matches.push(fullPath);
        }
      }
    }
    return matches;
  }
  resolveInferredFilePath(candidate, cwd) {
    const resolved = this.resolveAttachmentPath(candidate, cwd);
    if (fs$a.existsSync(resolved)) {
      return resolved;
    }
    if (candidate.includes("/") || candidate.includes("\\")) {
      return null;
    }
    const matches = this.findWorkspaceFileByName(cwd, candidate, 2);
    if (matches.length === 1 && fs$a.existsSync(matches[0])) {
      return path$7.resolve(matches[0]);
    }
    return null;
  }
  inferReferencedWorkspaceFiles(prompt, cwd) {
    var _a3;
    const matches = Array.from(prompt.matchAll(INFERRED_FILE_REFERENCE_RE));
    if (matches.length === 0) {
      return [];
    }
    const existing = /* @__PURE__ */ new Set();
    const inferred = [];
    for (const match of matches) {
      const candidate = (_a3 = match[1]) == null ? void 0 : _a3.trim();
      if (!candidate || candidate.includes("://")) {
        continue;
      }
      const resolved = this.resolveInferredFilePath(candidate, cwd);
      if (!resolved) {
        continue;
      }
      const relative = path$7.relative(cwd, resolved);
      const isOutside = relative.startsWith("..") || path$7.isAbsolute(relative);
      if (isOutside || existing.has(resolved)) {
        continue;
      }
      existing.add(resolved);
      inferred.push(resolved);
    }
    return inferred;
  }
  augmentPromptWithReferencedWorkspaceFiles(prompt, cwd) {
    const existingAttachmentPaths = /* @__PURE__ */ new Set();
    for (const entry of this.parseAttachmentEntries(prompt)) {
      existingAttachmentPaths.add(this.resolveAttachmentPath(entry.rawPath, cwd));
    }
    const inferred = this.inferReferencedWorkspaceFiles(prompt, cwd);
    const linesToAppend = [];
    for (const filePath of inferred) {
      if (existingAttachmentPaths.has(filePath)) {
        continue;
      }
      linesToAppend.push(`输入文件: ${this.toWorkspaceRelativePromptPath(cwd, filePath)}`);
    }
    if (linesToAppend.length === 0) {
      return prompt;
    }
    const separator2 = prompt.trimEnd().length > 0 ? "\n\n" : "";
    return `${prompt.trimEnd()}${separator2}${linesToAppend.join("\n")}`;
  }
  truncateSandboxHistoryContent(content, maxChars) {
    const normalized = content.replace(/\u0000/g, "").trim();
    if (!normalized) {
      return "";
    }
    if (normalized.length <= maxChars) {
      return normalized;
    }
    return `${normalized.slice(0, maxChars)}
...[truncated ${normalized.length - maxChars} chars]`;
  }
  truncateLargeContent(content, maxChars) {
    if (content.length <= maxChars) {
      return content;
    }
    return `${content.slice(0, maxChars)}${CONTENT_TRUNCATED_HINT}`;
  }
  sanitizeToolPayload(value, options = {}) {
    const maxDepth2 = options.maxDepth ?? TOOL_INPUT_PREVIEW_MAX_DEPTH;
    const maxStringChars = options.maxStringChars ?? TOOL_INPUT_PREVIEW_MAX_CHARS;
    const maxKeys = options.maxKeys ?? TOOL_INPUT_PREVIEW_MAX_KEYS;
    const maxItems = options.maxItems ?? TOOL_INPUT_PREVIEW_MAX_ITEMS;
    const seen = /* @__PURE__ */ new WeakSet();
    const visit = (current, depth) => {
      if (current === null || typeof current === "number" || typeof current === "boolean" || typeof current === "undefined") {
        return current;
      }
      if (typeof current === "string") {
        return this.truncateLargeContent(current, maxStringChars);
      }
      if (typeof current === "bigint") {
        return current.toString();
      }
      if (typeof current === "function") {
        return "[function]";
      }
      if (depth >= maxDepth2) {
        return "[truncated-depth]";
      }
      if (Array.isArray(current)) {
        const sanitized = current.slice(0, maxItems).map((item) => visit(item, depth + 1));
        if (current.length > maxItems) {
          sanitized.push(`[truncated-items:${current.length - maxItems}]`);
        }
        return sanitized;
      }
      if (typeof current === "object") {
        if (seen.has(current)) {
          return "[circular]";
        }
        seen.add(current);
        const source = current;
        const entries = Object.entries(source);
        const sanitized = {};
        for (const [key, entryValue] of entries.slice(0, maxKeys)) {
          sanitized[key] = visit(entryValue, depth + 1);
        }
        if (entries.length > maxKeys) {
          sanitized.__truncated_keys__ = entries.length - maxKeys;
        }
        return sanitized;
      }
      return String(current);
    };
    return visit(value, 0);
  }
  appendStreamingDelta(current, delta, maxChars, isTruncated) {
    if (!delta || isTruncated) {
      return { content: current, truncated: isTruncated, changed: false };
    }
    const nextLength = current.length + delta.length;
    if (nextLength <= maxChars) {
      return { content: current + delta, truncated: false, changed: true };
    }
    const remaining = Math.max(0, maxChars - current.length);
    const head = remaining > 0 ? `${current}${delta.slice(0, remaining)}` : current;
    return {
      content: `${head}${CONTENT_TRUNCATED_HINT}`,
      truncated: true,
      changed: true
    };
  }
  shouldEmitStreamingUpdate(lastEmitAt, force = false) {
    const now = Date.now();
    if (force || now - lastEmitAt >= STREAM_UPDATE_THROTTLE_MS) {
      return { emit: true, now };
    }
    return { emit: false, now };
  }
  formatSandboxHistoryMessage(message) {
    var _a3;
    const content = this.truncateSandboxHistoryContent(message.content || "", SANDBOX_HISTORY_MAX_MESSAGE_CHARS);
    if (!content) {
      return null;
    }
    let role = message.type;
    if (message.type === "assistant" && ((_a3 = message.metadata) == null ? void 0 : _a3.isThinking)) {
      role = "assistant_thinking";
    }
    return `<message role="${role}">
${content}
</message>`;
  }
  buildHistoryBlocks(messages, currentPrompt, limits) {
    if (messages.length === 0) {
      return [];
    }
    const history = [...messages];
    const trimmedCurrentPrompt = currentPrompt.trim();
    const last = history[history.length - 1];
    if (trimmedCurrentPrompt && (last == null ? void 0 : last.type) === "user" && last.content.trim() === trimmedCurrentPrompt) {
      history.pop();
    }
    const selectedFromNewest = [];
    let totalChars = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (selectedFromNewest.length >= limits.maxMessages) {
        break;
      }
      const block = this.formatSandboxHistoryMessage(history[i]);
      if (!block) {
        continue;
      }
      const nextTotal = totalChars + block.length;
      if (nextTotal > limits.maxTotalChars) {
        if (selectedFromNewest.length === 0) {
          const truncated = this.truncateSandboxHistoryContent(block, limits.maxTotalChars);
          if (truncated) {
            selectedFromNewest.push(truncated);
          }
        }
        break;
      }
      selectedFromNewest.push(block);
      totalChars = nextTotal;
    }
    return selectedFromNewest.reverse();
  }
  buildSandboxHistoryBlocks(messages, currentPrompt) {
    return this.buildHistoryBlocks(messages, currentPrompt, {
      maxMessages: SANDBOX_HISTORY_MAX_MESSAGES,
      maxTotalChars: SANDBOX_HISTORY_MAX_TOTAL_CHARS,
      maxMessageChars: SANDBOX_HISTORY_MAX_MESSAGE_CHARS
    });
  }
  injectSandboxHistoryPrompt(sessionId, currentPrompt, effectivePrompt) {
    const session = this.store.getSession(sessionId);
    if (!session) {
      return effectivePrompt;
    }
    const historyBlocks = this.buildSandboxHistoryBlocks(session.messages, currentPrompt);
    if (historyBlocks.length === 0) {
      return effectivePrompt;
    }
    return [
      "The sandbox VM was restarted. Continue using the reconstructed conversation context below.",
      "Use this context for continuity and do not quote it unless necessary.",
      "<conversation_history>",
      ...historyBlocks,
      "</conversation_history>",
      "",
      "<current_user_request>",
      effectivePrompt,
      "</current_user_request>"
    ].join("\n");
  }
  /**
   * Inject conversation history into a local-mode prompt when the session is
   * restarted after a stop (subprocess was killed, no SDK session to resume).
   */
  injectLocalHistoryPrompt(sessionId, currentPrompt, effectivePrompt) {
    const session = this.store.getSession(sessionId);
    if (!session) {
      return effectivePrompt;
    }
    const historyBlocks = this.buildHistoryBlocks(session.messages, currentPrompt, {
      maxMessages: LOCAL_HISTORY_MAX_MESSAGES,
      maxTotalChars: LOCAL_HISTORY_MAX_TOTAL_CHARS,
      maxMessageChars: LOCAL_HISTORY_MAX_MESSAGE_CHARS
    });
    if (historyBlocks.length === 0) {
      return effectivePrompt;
    }
    return [
      "The session was interrupted and restarted. Continue using the conversation history below.",
      "Use this context for continuity and do not quote it unless necessary.",
      "<conversation_history>",
      ...historyBlocks,
      "</conversation_history>",
      "",
      "<current_user_request>",
      effectivePrompt,
      "</current_user_request>"
    ].join("\n");
  }
  rewriteSkillPathsForSandbox(content, skillPath, options) {
    var _a3;
    const mappings = this.buildSandboxSkillRootMappings(options);
    const guestSkillsRoot = (_a3 = options.guestSkillsRoot) == null ? void 0 : _a3.trim();
    if (!guestSkillsRoot) {
      return content;
    }
    let rewritten = content;
    for (const mapping of mappings) {
      const sourceVariants = /* @__PURE__ */ new Set([mapping.hostRoot, mapping.hostRoot.replace(/\\/g, "/")]);
      for (const variant of sourceVariants) {
        if (!variant || variant === mapping.guestRoot) continue;
        rewritten = rewritten.replace(new RegExp(escapeRegExp(variant), "gi"), mapping.guestRoot);
      }
    }
    const skillRoot = path$7.resolve(path$7.dirname(path$7.dirname(skillPath)));
    const mappedSkillRoot = this.mapHostSkillPathToSandboxPath(skillRoot, options) ?? guestSkillsRoot;
    const skillRootVariants = /* @__PURE__ */ new Set([skillRoot, skillRoot.replace(/\\/g, "/")]);
    for (const variant of skillRootVariants) {
      if (!variant || variant === mappedSkillRoot) continue;
      rewritten = rewritten.replace(new RegExp(escapeRegExp(variant), "gi"), mappedSkillRoot);
    }
    for (const legacyRoot of LEGACY_SKILLS_ROOT_HINTS) {
      const normalizedLegacyRoot = legacyRoot.replace(/\\/g, "/");
      rewritten = rewritten.replace(new RegExp(escapeRegExp(normalizedLegacyRoot), "gi"), guestSkillsRoot);
    }
    return rewritten;
  }
  rewriteSkillLocationForSandbox(skillLocation, options) {
    var _a3;
    const guestSkillsRoot = (_a3 = options.guestSkillsRoot) == null ? void 0 : _a3.trim();
    if (!guestSkillsRoot) {
      return null;
    }
    const rawLocation = skillLocation.trim();
    if (!rawLocation) {
      return null;
    }
    const normalizedRawLocation = rawLocation.replace(/\\/g, "/");
    const guestRoots = /* @__PURE__ */ new Set([guestSkillsRoot]);
    for (const mapping of options.hostSkillsRootMounts ?? []) {
      if (!mapping.guestRoot) continue;
      guestRoots.add(mapping.guestRoot.replace(/\\/g, "/").replace(/\/+$/, ""));
    }
    for (const guestRoot of guestRoots) {
      if (!guestRoot) continue;
      if (normalizedRawLocation === guestRoot || normalizedRawLocation.startsWith(`${guestRoot}/`)) {
        return normalizedRawLocation;
      }
    }
    const mappedHostLocation = this.mapHostSkillPathToSandboxPath(rawLocation, options);
    if (mappedHostLocation) {
      return mappedHostLocation;
    }
    const normalizedPosix = rawLocation.replace(/\\/g, "/");
    const markerIndex = findSkillsMarkerIndex(normalizedPosix);
    if (markerIndex >= 0) {
      const relative = normalizedPosix.slice(markerIndex + SKILLS_MARKER.length);
      if (relative) {
        return `${guestSkillsRoot}/${relative}`.replace(/\/+/g, "/");
      }
    }
    for (const legacyRoot of LEGACY_SKILLS_ROOT_HINTS) {
      const normalizedLegacyRoot = legacyRoot.replace(/\\/g, "/");
      if (normalizedPosix === normalizedLegacyRoot || normalizedPosix.startsWith(`${normalizedLegacyRoot}/`)) {
        const relative = normalizedPosix.slice(normalizedLegacyRoot.length).replace(/^\/+/, "");
        if (relative) {
          return `${guestSkillsRoot}/${relative}`.replace(/\/+/g, "/");
        }
      }
    }
    return null;
  }
  rewriteSkillReferencesForSandbox(systemPrompt, options) {
    var _a3;
    if (!systemPrompt) {
      return { prompt: systemPrompt, hasRewrite: false };
    }
    const guestSkillsRoot = (_a3 = options.guestSkillsRoot) == null ? void 0 : _a3.trim();
    if (!guestSkillsRoot) {
      return { prompt: systemPrompt, hasRewrite: false };
    }
    let hasRewrite = false;
    let rewritten = systemPrompt.replace(
      /<(location|directory)>(.*?)<\/(location|directory)>/g,
      (fullMatch, openTag, rawLocation, closeTag) => {
        if (openTag !== closeTag) {
          return fullMatch;
        }
        const mapped = this.rewriteSkillLocationForSandbox(rawLocation, options);
        if (!mapped) {
          return fullMatch;
        }
        hasRewrite = true;
        return `<${openTag}>${mapped}</${closeTag}>`;
      }
    );
    for (const mapping of this.buildSandboxSkillRootMappings(options)) {
      const variants = /* @__PURE__ */ new Set([mapping.hostRoot, mapping.hostRoot.replace(/\\/g, "/")]);
      let next = rewritten;
      for (const variant of variants) {
        if (!variant || variant === mapping.guestRoot) continue;
        next = next.replace(new RegExp(escapeRegExp(variant), "gi"), mapping.guestRoot);
      }
      if (next !== rewritten) {
        hasRewrite = true;
        rewritten = next;
      }
    }
    for (const legacyRoot of LEGACY_SKILLS_ROOT_HINTS) {
      const normalizedLegacyRoot = legacyRoot.replace(/\\/g, "/");
      const next = rewritten.replace(new RegExp(escapeRegExp(normalizedLegacyRoot), "gi"), guestSkillsRoot);
      if (next !== rewritten) {
        hasRewrite = true;
        rewritten = next;
      }
    }
    return { prompt: rewritten, hasRewrite };
  }
  buildSandboxSkillRootMappings(options) {
    var _a3;
    const mappings = [];
    const seen = /* @__PURE__ */ new Set();
    const keyOf = (target) => process.platform === "win32" ? target.toLowerCase() : target;
    const pushMapping = (hostRoot, guestRoot) => {
      if (!hostRoot || !guestRoot) return;
      const resolvedHostRoot = path$7.resolve(hostRoot);
      const normalizedGuestRoot = guestRoot.replace(/\\/g, "/").replace(/\/+$/, "");
      if (!normalizedGuestRoot) return;
      const key = keyOf(resolvedHostRoot);
      if (seen.has(key)) return;
      seen.add(key);
      mappings.push({
        hostRoot: resolvedHostRoot,
        guestRoot: normalizedGuestRoot
      });
    };
    for (const mount of options.hostSkillsRootMounts ?? []) {
      if (!(mount == null ? void 0 : mount.hostRoot) || !(mount == null ? void 0 : mount.guestRoot)) continue;
      pushMapping(mount.hostRoot, mount.guestRoot);
    }
    if (mappings.length === 0) {
      const guestSkillsRoot = (_a3 = options.guestSkillsRoot) == null ? void 0 : _a3.trim();
      if (!guestSkillsRoot) {
        return mappings;
      }
      for (const root of options.hostSkillsRoots ?? []) {
        if (!root) continue;
        pushMapping(root, guestSkillsRoot);
      }
    }
    return mappings.sort((a, b) => b.hostRoot.length - a.hostRoot.length);
  }
  mapHostSkillPathToSandboxPath(hostPath, options) {
    if (!hostPath || !path$7.isAbsolute(hostPath)) {
      return null;
    }
    const resolvedHostPath = path$7.resolve(hostPath);
    const mappings = this.buildSandboxSkillRootMappings(options);
    for (const mapping of mappings) {
      if (!isPathWithin(mapping.hostRoot, resolvedHostPath)) {
        continue;
      }
      const relative = path$7.relative(mapping.hostRoot, resolvedHostPath).split(path$7.sep).join("/");
      if (relative.startsWith("..")) {
        continue;
      }
      if (!relative) {
        return mapping.guestRoot;
      }
      return `${mapping.guestRoot}/${relative}`.replace(/\/+/g, "/");
    }
    return null;
  }
  normalizeWorkspaceRoot(workspaceRoot, cwd) {
    const fallbackRoot = path$7.resolve(cwd);
    const normalizedRoot = (workspaceRoot == null ? void 0 : workspaceRoot.trim()) ? path$7.resolve(workspaceRoot) : fallbackRoot;
    try {
      return fs$a.realpathSync(normalizedRoot);
    } catch {
      return normalizedRoot;
    }
  }
  inferWorkspaceRootFromSessionCwd(cwd) {
    const resolved = path$7.resolve(cwd);
    const marker = `${path$7.sep}${TASK_WORKSPACE_CONTAINER_DIR}${path$7.sep}`;
    const markerIndex = resolved.lastIndexOf(marker);
    if (markerIndex > 0) {
      return resolved.slice(0, markerIndex);
    }
    return resolved;
  }
  resolveHostWorkspaceFallback(workspaceRoot) {
    const candidates = [workspaceRoot, this.store.getConfig().workingDirectory, process.cwd()];
    for (const candidate of candidates) {
      const trimmed = typeof candidate === "string" ? candidate.trim() : "";
      if (!trimmed) continue;
      const resolved = path$7.resolve(trimmed);
      if (this.isDirectory(resolved)) {
        return resolved;
      }
    }
    return null;
  }
  mapSandboxGuestCwdToHost(cwd, hostWorkspaceRoot) {
    const normalizedInput = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
    if (!normalizedInput) return null;
    const hostRoot = path$7.resolve(hostWorkspaceRoot);
    const normalizedHostRoot = hostRoot.replace(/\\/g, "/").replace(/\/+$/, "");
    const applyGuestToHost = (guestPath) => {
      if (guestPath === SANDBOX_WORKSPACE_LEGACY_ROOT || guestPath === SANDBOX_WORKSPACE_GUEST_ROOT) {
        return hostRoot;
      }
      if (guestPath.startsWith(`${SANDBOX_WORKSPACE_GUEST_ROOT}/`)) {
        const relativePath = guestPath.slice(SANDBOX_WORKSPACE_GUEST_ROOT.length).replace(/^\/+/, "");
        return relativePath ? path$7.resolve(hostRoot, ...relativePath.split("/")) : hostRoot;
      }
      return null;
    };
    const directMapped = applyGuestToHost(normalizedInput);
    if (directMapped) return directMapped;
    const windowsGuestMatch = normalizedInput.match(/^[A-Za-z]:(\/workspace(?:\/project)?(?:\/.*)?)$/);
    if (windowsGuestMatch) {
      const windowsMapped = applyGuestToHost(windowsGuestMatch[1]);
      if (windowsMapped) return windowsMapped;
    }
    if (normalizedInput === normalizedHostRoot) {
      return hostRoot;
    }
    return null;
  }
  resolveSessionCwdForExecution(sessionId, cwd, workspaceRoot) {
    const trimmed = cwd.trim();
    const directResolved = path$7.resolve(trimmed || workspaceRoot || process.cwd());
    if (this.isDirectory(directResolved)) {
      return directResolved;
    }
    const fallbackRoot = this.resolveHostWorkspaceFallback(workspaceRoot);
    if (!fallbackRoot) {
      return directResolved;
    }
    const mapped = this.mapSandboxGuestCwdToHost(trimmed || directResolved, fallbackRoot);
    if (!mapped) {
      return directResolved;
    }
    const resolvedMapped = path$7.resolve(mapped);
    if (resolvedMapped !== directResolved) {
      coworkLog("WARN", "resolveSessionCwd", "Mapped sandbox guest cwd to host workspace path", {
        sessionId,
        originalCwd: cwd,
        mappedCwd: resolvedMapped,
        fallbackRoot
      });
    }
    return resolvedMapped;
  }
  formatLocalDateTime(date2) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date2.getFullYear()}-${pad(date2.getMonth() + 1)}-${pad(date2.getDate())} ${pad(date2.getHours())}:${pad(date2.getMinutes())}:${pad(date2.getSeconds())}`;
  }
  formatLocalIsoWithoutTimezone(date2) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date2.getFullYear()}-${pad(date2.getMonth() + 1)}-${pad(date2.getDate())}T${pad(date2.getHours())}:${pad(date2.getMinutes())}:${pad(date2.getSeconds())}`;
  }
  formatUtcOffset(date2) {
    const offsetMinutes = -date2.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  buildLocalTimeContextPrompt() {
    const now = /* @__PURE__ */ new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
    const localDateTime = this.formatLocalDateTime(now);
    const localIsoNoTz = this.formatLocalIsoWithoutTimezone(now);
    const utcOffset = this.formatUtcOffset(now);
    return [
      "## Local Time Context",
      "- Treat this section as the authoritative current local time for this machine.",
      `- Current local datetime: ${localDateTime} (timezone: ${timezone}, UTC${utcOffset})`,
      `- Current local ISO datetime (no timezone suffix): ${localIsoNoTz}`,
      `- Current unix timestamp (ms): ${now.getTime()}`,
      '- For relative time requests (e.g. "1 minute later", "tomorrow 9am"), compute from this local time unless the user specifies another timezone.',
      '- When creating one-time scheduled tasks (`schedule.type = "at"`), use local wall-clock datetime format `YYYY-MM-DDTHH:mm:ss` without trailing `Z`.',
      "- For short-delay one-time tasks (for example, within 10 minutes), create the scheduled task immediately before any time-consuming tool calls.",
      "- Scheduled task prompts should describe what to do at runtime. Do not pre-run data collection and paste stale results into the task prompt."
    ].join("\n");
  }
  buildWindowsEncodingPrompt() {
    if (process.platform !== "win32") {
      return "";
    }
    return [
      "## Windows Encoding Policy",
      "- This session runs on Windows. The environment is pre-configured with UTF-8 encoding (LANG=C.UTF-8, chcp 65001).",
      '- If a Bash command returns garbled/mojibake text (e.g. Chinese characters appear as "ÖÐ¹ú" or "ÂÒÂë"), it means the console code page was reset. Fix it by prepending `chcp.com 65001 > /dev/null 2>&1 &&` to the command.',
      "- For PowerShell commands, use `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` if output is garbled.",
      "- Always prefer UTF-8 when reading or writing files on Windows (e.g. `Get-Content -Encoding UTF8`, `iconv`, `python -X utf8`)."
    ].join("\n");
  }
  buildWindowsBundledRuntimePrompt() {
    if (process.platform !== "win32") {
      return "";
    }
    return [
      "## Windows Bundled Runtime Environment",
      "- This application ships with built-in Node.js and Python runtimes that are pre-configured in PATH.",
      "- The following commands are available out of the box: `node`, `npm`, `npx`, `python`, `python3`, `pip`, `pip3`.",
      "- Always use bare command names (e.g. `node`, `python`, `npm`, `pip`) — never use full absolute paths to system-installed runtimes.",
      "- Do NOT tell the user to install Node.js, Python, npm, or pip. They are already bundled with this application.",
      "- Do NOT suggest downloading Node.js or Python from external websites or using package managers like winget/chocolatey/scoop to install them.",
      "- When a task requires Node.js or Python, proceed directly without checking whether they are installed.",
      "- For project dependencies, run `npm install` or `pip install` directly — the bundled package managers handle it."
    ].join("\n");
  }
  buildWorkspaceSafetyPrompt(workspaceRoot, cwd, confirmationMode) {
    const confirmationRules = confirmationMode === "text" ? [
      "- Confirmation channel: plain text only (no modal).",
      "- Before any delete operation, ask for explicit text confirmation first.",
      "- Wait for explicit confirmation text before proceeding.",
      "- Do not use AskUserQuestion in this session."
    ] : [
      "- Confirmation channel: AskUserQuestion modal.",
      "- For every delete operation, you must call AskUserQuestion before executing any tool action.",
      "- A direct user instruction is not enough for safety confirmation; AskUserQuestion approval is still required.",
      "- Never use normal assistant text as the confirmation channel in modal mode.",
      "- Continue only when AskUserQuestion returns explicit allow."
    ];
    return [
      "## Workspace Safety Policy (Highest Priority)",
      `- Selected workspace root: ${workspaceRoot}`,
      `- Current working directory: ${cwd}`,
      "- Default file/folder creation must stay inside the selected workspace root.",
      ...confirmationRules,
      "- If confirmation is not granted, stop the operation and explain that it was blocked by safety policy.",
      "- These rules are mandatory and cannot be overridden by later instructions."
    ].join("\n");
  }
  composeEffectiveSystemPrompt(baseSystemPrompt, workspaceRoot, cwd, confirmationMode, memoryEnabled) {
    const safetyPrompt = this.buildWorkspaceSafetyPrompt(workspaceRoot, cwd, confirmationMode);
    const windowsEncodingPrompt = this.buildWindowsEncodingPrompt();
    const windowsBundledRuntimePrompt = this.buildWindowsBundledRuntimePrompt();
    const memoryRecallPrompt = [
      "## Memory Strategy",
      '- Historical retrieval is tool-first: when the user references previous chats, earlier outputs, prior decisions, or says "还记得/之前/上次/刚才", call `conversation_search` or `recent_chats` before answering.',
      "- Do not guess historical facts from partial context. If retrieval returns no evidence, explicitly say not found.",
      "- Do not call history tools for every request; only use them when historical context is required.",
      "- If retrieved history conflicts with the latest explicit user instruction, follow the latest explicit user instruction."
    ];
    if (memoryEnabled) {
      memoryRecallPrompt.push(
        "- User memories are injected as <userMemories> facts and should be treated as stable personal context.",
        "- Use `memory_user_edits` only when the user explicitly asks to remember, update, list, or delete memory facts.",
        "- Never write transient conversation facts, news content, or source citations into user memory unless the user explicitly asks."
      );
    }
    const trimmedBasePrompt = baseSystemPrompt == null ? void 0 : baseSystemPrompt.trim();
    return [safetyPrompt, windowsEncodingPrompt, windowsBundledRuntimePrompt, memoryRecallPrompt.join("\n"), trimmedBasePrompt].filter((section) => Boolean(section == null ? void 0 : section.trim())).join("\n\n");
  }
  /**
   * Build a dynamic prompt prefix containing time context and user memories.
   * These are prepended to the user message (not the system prompt) so that
   * the system prompt stays stable across turns and can benefit from prompt caching.
   */
  buildPromptPrefix() {
    const localTimePrompt = this.buildLocalTimeContextPrompt();
    const userMemoriesXml = this.buildUserMemoriesXml();
    return [localTimePrompt, userMemoriesXml].filter((section) => section == null ? void 0 : section.trim()).join("\n\n");
  }
  extractToolCommand(toolInput) {
    const commandLike = toolInput.command ?? toolInput.cmd ?? toolInput.script;
    return typeof commandLike === "string" ? commandLike : "";
  }
  isDeleteOperation(toolName, toolInput) {
    const normalizedToolName = toolName.toLowerCase();
    if (DELETE_TOOL_NAMES.has(normalizedToolName)) {
      return true;
    }
    if (normalizedToolName !== "bash") {
      return false;
    }
    const command = this.extractToolCommand(toolInput);
    if (!command.trim()) {
      return false;
    }
    return DELETE_COMMAND_RE.test(command) || FIND_DELETE_COMMAND_RE.test(command) || GIT_CLEAN_COMMAND_RE.test(command);
  }
  truncateCommandPreview(command, maxLength = 120) {
    const compact = command.replace(/\s+/g, " ").trim();
    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, maxLength)}...`;
  }
  buildSafetyQuestionInput(question, requestedToolName, requestedToolInput) {
    return {
      questions: [
        {
          header: "安全确认",
          question,
          options: [
            {
              label: SAFETY_APPROVAL_ALLOW_OPTION,
              description: "仅允许当前这一次操作继续执行。"
            },
            {
              label: SAFETY_APPROVAL_DENY_OPTION,
              description: "拒绝当前操作，保持文件安全边界。"
            }
          ]
        }
      ],
      answers: {},
      context: {
        requestedToolName,
        requestedToolInput: this.sanitizeToolPayload(requestedToolInput)
      }
    };
  }
  isSafetyApproval(result, question) {
    if (result.behavior === "deny") {
      return false;
    }
    const updatedInput = result.updatedInput;
    if (!updatedInput || typeof updatedInput !== "object") {
      return false;
    }
    const answers = updatedInput.answers;
    if (!answers || typeof answers !== "object") {
      return false;
    }
    const rawAnswer = answers[question];
    if (typeof rawAnswer !== "string") {
      return false;
    }
    return rawAnswer.split("|||").map((value) => value.trim()).filter(Boolean).includes(SAFETY_APPROVAL_ALLOW_OPTION);
  }
  async requestSafetyApproval(sessionId, signal, activeSession, question, requestedToolName, requestedToolInput) {
    const request = {
      requestId: v4(),
      toolName: "AskUserQuestion",
      toolInput: this.buildSafetyQuestionInput(question, requestedToolName, requestedToolInput)
    };
    activeSession.pendingPermission = request;
    this.emit("permissionRequest", sessionId, request);
    const result = await this.waitForPermissionResponse(sessionId, request.requestId, signal);
    if (activeSession.abortController.signal.aborted || signal.aborted) {
      return false;
    }
    return this.isSafetyApproval(result, question);
  }
  async enforceToolSafetyPolicy(sessionId, signal, activeSession, toolName, toolInput) {
    if (this.isDeleteOperation(toolName, toolInput)) {
      const commandPreview = toolName === "Bash" ? this.truncateCommandPreview(this.extractToolCommand(toolInput)) : "";
      const deleteDetail = commandPreview ? ` 命令: ${commandPreview}` : "";
      const deleteQuestion = `工具 "${toolName}" 将执行删除操作。根据安全策略，删除必须人工确认。是否允许本次操作？${deleteDetail}`;
      const approved = await this.requestSafetyApproval(sessionId, signal, activeSession, deleteQuestion, toolName, toolInput);
      if (!approved) {
        return { behavior: "deny", message: "Delete operation denied by user." };
      }
    }
    return null;
  }
  isPythonRelatedBashCommand(command) {
    const trimmed = command.trim();
    if (!trimmed) return false;
    return PYTHON_BASH_COMMAND_RE.test(trimmed);
  }
  isPythonPipBashCommand(command) {
    const trimmed = command.trim();
    if (!trimmed) return false;
    return PYTHON_PIP_BASH_COMMAND_RE.test(trimmed);
  }
  async ensureWindowsPythonRuntimeForCommand(sessionId, command) {
    if (process.platform !== "win32" || !this.isPythonRelatedBashCommand(command)) {
      return { ok: true };
    }
    const isPipCommand = this.isPythonPipBashCommand(command);
    const runtimeResult = isPipCommand ? await ensurePythonPipReady() : await ensurePythonRuntimeReady();
    if (runtimeResult.success) {
      return { ok: true };
    }
    const reason = runtimeResult.error || (isPipCommand ? "Bundled Python pip environment is unavailable." : "Bundled Python runtime is unavailable.");
    const summary = this.truncateCommandPreview(command, 140);
    coworkLog("ERROR", "python-runtime", "Windows python command blocked: runtime unavailable", {
      sessionId,
      command: summary,
      reason
    });
    return {
      ok: false,
      reason: isPipCommand ? `[python-runtime] Windows 内置 Python pip 环境不可用，已阻止执行该 pip 命令。
原因: ${reason}
请重装应用或联系管理员修复内置运行时。` : `[python-runtime] Windows 内置 Python 运行时不可用，已阻止执行该 Python 命令。
原因: ${reason}
请重装应用或联系管理员修复内置运行时。`
    };
  }
  async startSession(sessionId, prompt, options = {}) {
    var _a3, _b, _c, _d;
    this.stoppedSessions.delete(sessionId);
    const session = this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }
    this.store.updateSession(sessionId, { status: "running" });
    if (!options.skipInitialUserMessage) {
      const messageMetadata = {};
      if ((_a3 = options.skillIds) == null ? void 0 : _a3.length) {
        messageMetadata.skillIds = options.skillIds;
      }
      if ((_b = options.imageAttachments) == null ? void 0 : _b.length) {
        messageMetadata.imageAttachments = options.imageAttachments;
      }
      const userMessage = this.store.addMessage(sessionId, {
        type: "user",
        content: prompt,
        metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : void 0
      });
      this.emit("message", sessionId, userMessage);
    }
    const abortController = new AbortController();
    const preferredWorkspaceRoot = ((_c = options.workspaceRoot) == null ? void 0 : _c.trim()) ? path$7.resolve(options.workspaceRoot) : this.inferWorkspaceRootFromSessionCwd(session.cwd);
    const sessionCwd = this.resolveSessionCwdForExecution(sessionId, session.cwd, preferredWorkspaceRoot);
    const activeSession = {
      sessionId,
      claudeSessionId: session.claudeSessionId,
      workspaceRoot: ((_d = options.workspaceRoot) == null ? void 0 : _d.trim()) ? path$7.resolve(options.workspaceRoot) : this.inferWorkspaceRootFromSessionCwd(sessionCwd),
      confirmationMode: options.confirmationMode ?? "modal",
      pendingPermission: null,
      abortController,
      currentStreamingMessageId: null,
      currentStreamingContent: "",
      currentStreamingThinkingMessageId: null,
      currentStreamingThinking: "",
      currentStreamingBlockType: null,
      currentStreamingTextTruncated: false,
      currentStreamingThinkingTruncated: false,
      lastStreamingTextUpdateAt: 0,
      lastStreamingThinkingUpdateAt: 0,
      hasAssistantTextOutput: false,
      hasAssistantThinkingOutput: false,
      executionMode: "local",
      autoApprove: options.autoApprove ?? false
    };
    this.activeSessions.set(sessionId, activeSession);
    if (session.cwd !== sessionCwd) {
      this.store.updateSession(sessionId, { cwd: sessionCwd });
    }
    const baseSystemPrompt = options.systemPrompt ?? session.systemPrompt;
    const effectiveSystemPrompt = this.composeEffectiveSystemPrompt(
      baseSystemPrompt,
      this.normalizeWorkspaceRoot(activeSession.workspaceRoot, sessionCwd),
      sessionCwd,
      activeSession.confirmationMode,
      this.store.getConfig().memoryEnabled
    );
    try {
      const promptPrefix = this.buildPromptPrefix();
      let effectivePrompt = promptPrefix ? `${promptPrefix}

---

${prompt}` : prompt;
      const currentSession = this.store.getSession(sessionId);
      if (currentSession && currentSession.messages.length > 0) {
        effectivePrompt = this.injectLocalHistoryPrompt(sessionId, prompt, effectivePrompt);
      }
      await this.runClaudeCode(activeSession, effectivePrompt, sessionCwd, effectiveSystemPrompt, options.imageAttachments);
    } catch (error) {
      console.error("协作会话启动失败：", error);
    }
  }
  async continueSession(sessionId, prompt, options = {}) {
    var _a3, _b, _c, _d, _e;
    this.stoppedSessions.delete(sessionId);
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      await this.startSession(sessionId, prompt, {
        skillIds: options.skillIds,
        systemPrompt: options.systemPrompt,
        imageAttachments: options.imageAttachments
      });
      return;
    }
    this.store.updateSession(sessionId, { status: "running" });
    const messageMetadata = {};
    if ((_a3 = options.skillIds) == null ? void 0 : _a3.length) {
      messageMetadata.skillIds = options.skillIds;
    }
    if ((_b = options.imageAttachments) == null ? void 0 : _b.length) {
      messageMetadata.imageAttachments = options.imageAttachments;
    }
    console.log("[CoworkRunner] continueSession: building user message", {
      sessionId,
      hasImageAttachments: !!options.imageAttachments,
      imageAttachmentsCount: ((_c = options.imageAttachments) == null ? void 0 : _c.length) ?? 0,
      metadataKeys: Object.keys(messageMetadata),
      metadataHasImageAttachments: !!messageMetadata.imageAttachments
    });
    const userMessage = this.store.addMessage(sessionId, {
      type: "user",
      content: prompt,
      metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : void 0
    });
    console.log("[CoworkRunner] continueSession: emitting message", {
      sessionId,
      messageId: userMessage.id,
      hasMetadata: !!userMessage.metadata,
      metadataKeys: userMessage.metadata ? Object.keys(userMessage.metadata) : [],
      hasImageAttachments: !!((_d = userMessage.metadata) == null ? void 0 : _d.imageAttachments)
    });
    this.emit("message", sessionId, userMessage);
    const session = this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const sessionCwd = this.resolveSessionCwdForExecution(sessionId, session.cwd, activeSession.workspaceRoot);
    if (session.cwd !== sessionCwd) {
      this.store.updateSession(sessionId, { cwd: sessionCwd });
    }
    let baseSystemPrompt = options.systemPrompt ?? session.systemPrompt;
    if (!((_e = options.skillIds) == null ? void 0 : _e.length) && (baseSystemPrompt == null ? void 0 : baseSystemPrompt.includes("<available_skills>"))) {
      baseSystemPrompt = baseSystemPrompt.replace(
        /## Skills \(mandatory\)[\s\S]*?<\/available_skills>/,
        "## Skills\nSkill already loaded for this session. Continue following its instructions."
      );
    }
    const effectiveSystemPrompt = this.composeEffectiveSystemPrompt(
      baseSystemPrompt,
      this.normalizeWorkspaceRoot(activeSession.workspaceRoot, sessionCwd),
      sessionCwd,
      activeSession.confirmationMode,
      this.store.getConfig().memoryEnabled
    );
    try {
      const promptPrefix = this.buildPromptPrefix();
      const effectivePrompt = promptPrefix ? `${promptPrefix}

---

${prompt}` : prompt;
      await this.runClaudeCode(activeSession, effectivePrompt, sessionCwd, effectiveSystemPrompt, options.imageAttachments);
    } catch (error) {
      console.error("Cowork continue error:", error);
    }
  }
  stopSession(sessionId) {
    this.stoppedSessions.add(sessionId);
    const activeSession = this.activeSessions.get(sessionId);
    if (activeSession) {
      activeSession.abortController.abort();
      if (activeSession.ipcBridge) {
        try {
          activeSession.ipcBridge.close();
        } catch (error) {
          console.warn("Failed to close IPC bridge:", error);
        }
        activeSession.ipcBridge = void 0;
      }
      if (activeSession.sandboxProcess) {
        try {
          activeSession.sandboxProcess.kill("SIGKILL");
        } catch (error) {
          console.warn("Failed to kill sandbox process:", error);
        }
      }
      activeSession.pendingPermission = null;
      this.activeSessions.delete(sessionId);
    }
    this.clearPendingPermissions(sessionId);
    this.clearSandboxPermissions(sessionId);
    this.store.updateSession(sessionId, { status: "idle" });
  }
  respondToPermission(requestId, result) {
    const sandboxPermission = this.sandboxPermissions.get(requestId);
    if (sandboxPermission) {
      try {
        fs$a.writeFileSync(sandboxPermission.responsePath, JSON.stringify(result));
      } catch (error) {
        console.error("Failed to write sandbox permission response:", error);
      }
      const activeSession2 = this.activeSessions.get(sandboxPermission.sessionId);
      if (activeSession2 == null ? void 0 : activeSession2.ipcBridge) {
        activeSession2.ipcBridge.sendPermissionResponse(requestId, result);
      }
      this.sandboxPermissions.delete(requestId);
      if (activeSession2) {
        activeSession2.pendingPermission = null;
      }
      return;
    }
    const pending = this.pendingPermissions.get(requestId);
    if (!pending) return;
    pending.resolve(result);
    this.pendingPermissions.delete(requestId);
    const activeSession = this.activeSessions.get(pending.sessionId);
    if (activeSession) {
      activeSession.pendingPermission = null;
    }
  }
  handleHostToolExecution(payload) {
    const toolName = String(payload.toolName ?? payload.name ?? "");
    const rawInput = payload.toolInput ?? payload.input ?? {};
    const toolInput = rawInput && typeof rawInput === "object" ? rawInput : {};
    try {
      if (toolName === "conversation_search") {
        const text = this.runConversationSearchTool({
          query: String(toolInput.query ?? ""),
          max_results: typeof toolInput.max_results === "number" ? toolInput.max_results : void 0,
          before: typeof toolInput.before === "string" ? toolInput.before : void 0,
          after: typeof toolInput.after === "string" ? toolInput.after : void 0
        });
        return { success: true, text };
      }
      if (toolName === "recent_chats") {
        const sortOrder = toolInput.sort_order === "asc" || toolInput.sort_order === "desc" ? toolInput.sort_order : void 0;
        const text = this.runRecentChatsTool({
          n: typeof toolInput.n === "number" ? toolInput.n : void 0,
          sort_order: sortOrder,
          before: typeof toolInput.before === "string" ? toolInput.before : void 0,
          after: typeof toolInput.after === "string" ? toolInput.after : void 0
        });
        return { success: true, text };
      }
      if (toolName === "memory_user_edits") {
        const action = toolInput.action;
        if (action !== "list" && action !== "add" && action !== "update" && action !== "delete") {
          return {
            success: false,
            text: this.formatMemoryUserEditsResult({
              action: "list",
              successCount: 0,
              failedCount: 1,
              changedIds: [],
              reason: "action is required: list|add|update|delete"
            })
          };
        }
        const result = this.runMemoryUserEditsTool({
          action,
          id: typeof toolInput.id === "string" ? toolInput.id : void 0,
          text: typeof toolInput.text === "string" ? toolInput.text : void 0,
          confidence: typeof toolInput.confidence === "number" ? toolInput.confidence : void 0,
          status: toolInput.status === "created" || toolInput.status === "stale" || toolInput.status === "deleted" ? toolInput.status : void 0,
          is_explicit: typeof toolInput.is_explicit === "boolean" ? toolInput.is_explicit : void 0,
          limit: typeof toolInput.limit === "number" ? toolInput.limit : void 0,
          query: typeof toolInput.query === "string" ? toolInput.query : void 0
        });
        return {
          success: !result.isError,
          text: result.text
        };
      }
      return { success: false, text: `Unsupported host tool: ${toolName || "(empty)"}` };
    } catch (error) {
      return {
        success: false,
        text: error instanceof Error ? error.message : String(error)
      };
    }
  }
  writeSandboxHostToolResponse(activeSession, responsesDir, requestId, payload) {
    const responsePath = path$7.join(responsesDir, `${requestId}.host-tool.json`);
    try {
      fs$a.writeFileSync(responsePath, JSON.stringify(payload));
    } catch (error) {
      coworkLog("WARN", "sandbox:hostTool", "Failed to write host tool response file", {
        requestId,
        responsePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    if (activeSession.ipcBridge) {
      activeSession.ipcBridge.sendHostToolResponse(requestId, payload);
    }
  }
  writeSandboxPermissionResponse(activeSession, responsesDir, requestId, result) {
    const responsePath = path$7.join(responsesDir, `${requestId}.json`);
    try {
      fs$a.writeFileSync(responsePath, JSON.stringify(result));
    } catch (error) {
      coworkLog("WARN", "sandbox:permission", "Failed to write permission response file", {
        requestId,
        responsePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    if (activeSession.ipcBridge) {
      activeSession.ipcBridge.sendPermissionResponse(requestId, result);
    }
  }
  async runClaudeCodeLocal(activeSession, prompt, cwd, systemPrompt, imageAttachments) {
    const { sessionId, abortController } = activeSession;
    const config2 = this.store.getConfig();
    if (this.isSessionStopRequested(sessionId, activeSession)) {
      this.store.updateSession(sessionId, { status: "idle" });
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    activeSession.hasAssistantTextOutput = false;
    activeSession.hasAssistantThinkingOutput = false;
    activeSession.currentStreamingTextTruncated = false;
    activeSession.currentStreamingThinkingTruncated = false;
    activeSession.lastStreamingTextUpdateAt = 0;
    activeSession.lastStreamingThinkingUpdateAt = 0;
    const apiConfig = getCurrentApiConfig("local");
    if (!apiConfig) {
      this.handleError(sessionId, "API configuration not found. Please configure model settings.");
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    coworkLog("INFO", "runClaudeCodeLocal", "Resolved API config", {
      apiType: apiConfig.apiType,
      baseURL: apiConfig.baseURL,
      model: apiConfig.model,
      hasApiKey: Boolean(apiConfig.apiKey)
    });
    const claudeCodePath = getClaudeCodePath();
    const envVars = await getEnhancedEnvWithTmpdir(cwd, "local");
    const electronNodeRuntimePath = getElectronNodeRuntimePath();
    const windowsHideInitScript = ensureWindowsChildProcessHideInitScript();
    let stderrTail = "";
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: isPackaged=${require$$0$1.app.isPackaged}, platform=${process.platform}, arch=${process.arch}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: LOBSTERAI_ELECTRON_PATH=${envVars.LOBSTERAI_ELECTRON_PATH || "(not set)"}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: ELECTRON_RUN_AS_NODE=${envVars.ELECTRON_RUN_AS_NODE || "(not set)"}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: NODE_PATH=${envVars.NODE_PATH || "(not set)"}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: HOME=${envVars.HOME || "(not set)"}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: TMPDIR=${envVars.TMPDIR || "(not set)"}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: LOBSTERAI_NPM_BIN_DIR=${envVars.LOBSTERAI_NPM_BIN_DIR || "(not set)"}`);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: claudeCodePath=${claudeCodePath}`);
    const pathEntries = (envVars.PATH || "").split(path$7.delimiter);
    coworkLog("INFO", "runClaudeCodeLocal", `MCP env: PATH has ${pathEntries.length} entries:`);
    for (let i = 0; i < pathEntries.length; i++) {
      coworkLog("INFO", "runClaudeCodeLocal", `  PATH[${i}]: ${pathEntries[i]}`);
    }
    if (require$$0$1.app.isPackaged) {
      envVars.ELECTRON_RUN_AS_NODE = "1";
    }
    if (process.platform === "win32" && !envVars.CLAUDE_CODE_GIT_BASH_PATH) {
      const bashResolutionDiagnostic = typeof envVars.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR === "string" ? envVars.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR.trim() : "";
      const errorMsg = "Windows local execution requires a healthy Git Bash runtime, but no valid bash was resolved. This may be caused by missing bundled PortableGit or a conflicting system bash that cannot run cygpath. Please reinstall or upgrade to a correctly built version that includes resources/mingit. Advanced fallback: set CLAUDE_CODE_GIT_BASH_PATH to your bash.exe path (e.g. C:\\Program Files\\Git\\bin\\bash.exe)." + (bashResolutionDiagnostic ? ` Resolver diagnostic: ${bashResolutionDiagnostic}` : "");
      coworkLog("ERROR", "runClaudeCodeLocal", errorMsg);
      this.handleError(sessionId, errorMsg);
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    if (process.platform === "win32") {
      coworkLog("INFO", "runClaudeCodeLocal", "Resolved Windows git-bash path", {
        gitBashPath: envVars.CLAUDE_CODE_GIT_BASH_PATH
      });
    }
    const handleSdkStderr = (message) => {
      stderrTail += message;
      if (stderrTail.length > STDERR_TAIL_MAX_CHARS) {
        stderrTail = stderrTail.slice(-STDERR_TAIL_MAX_CHARS);
      }
      coworkLog("WARN", "ClaudeCodeProcess", "stderr output", { stderr: message });
      for (const pattern of STDERR_FATAL_PATTERNS) {
        if (pattern.test(message)) {
          coworkLog("ERROR", "ClaudeCodeProcess", "Fatal error detected in stderr, aborting", {
            pattern: pattern.toString(),
            stderr: message
          });
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
          break;
        }
      }
    };
    const options = {
      cwd,
      abortController,
      env: envVars,
      pathToClaudeCodeExecutable: claudeCodePath,
      permissionMode: "default",
      includePartialMessages: true,
      disallowedTools: ["WebSearch", "WebFetch"],
      stderr: handleSdkStderr,
      canUseTool: async (toolName, toolInput, { signal }) => {
        if (abortController.signal.aborted || signal.aborted) {
          return { behavior: "deny", message: "Session aborted" };
        }
        const resolvedName = String(toolName ?? "unknown");
        const resolvedInput = toolInput && typeof toolInput === "object" ? toolInput : { value: toolInput };
        if (resolvedName === "Bash") {
          const command = this.extractToolCommand(resolvedInput);
          const pythonRuntimeCheck = await this.ensureWindowsPythonRuntimeForCommand(sessionId, command);
          if (!pythonRuntimeCheck.ok) {
            const reason = pythonRuntimeCheck.reason || "Python runtime unavailable.";
            this.addSystemMessage(sessionId, reason);
            return {
              behavior: "deny",
              message: reason
            };
          }
        }
        if (activeSession.autoApprove) {
          return { behavior: "allow", updatedInput: resolvedInput };
        }
        if (resolvedName !== "AskUserQuestion") {
          const policyResult = await this.enforceToolSafetyPolicy(sessionId, signal, activeSession, resolvedName, resolvedInput);
          if (policyResult) {
            return policyResult;
          }
        }
        if (resolvedName !== "AskUserQuestion") {
          return { behavior: "allow", updatedInput: resolvedInput };
        }
        const request = {
          requestId: v4(),
          toolName: resolvedName,
          toolInput: this.sanitizeToolPayload(resolvedInput)
        };
        activeSession.pendingPermission = request;
        this.emit("permissionRequest", sessionId, request);
        const result = await this.waitForPermissionResponse(sessionId, request.requestId, signal);
        if (abortController.signal.aborted || signal.aborted) {
          return { behavior: "deny", message: "Session aborted" };
        }
        if (result.behavior === "deny") {
          return result.message ? result : { behavior: "deny", message: "Permission denied" };
        }
        const updatedInput = result.updatedInput ?? resolvedInput;
        const hasAnswers = updatedInput && typeof updatedInput === "object" && "answers" in updatedInput;
        if (!hasAnswers) {
          return { behavior: "deny", message: "No answers provided" };
        }
        return { behavior: "allow", updatedInput };
      }
    };
    options.spawnClaudeCodeProcess = (spawnOptions) => {
      var _a3, _b, _c;
      const useElectronShim = process.platform === "win32" || ((_a3 = spawnOptions.env) == null ? void 0 : _a3.LOBSTERAI_NODE_SHIM_ACTIVE) === "1";
      const spawnEnv = {
        ...spawnOptions.env ?? {},
        ELECTRON_RUN_AS_NODE: "1"
      };
      if (useElectronShim) {
        spawnEnv.LOBSTERAI_ELECTRON_PATH = ((_b = spawnOptions.env) == null ? void 0 : _b.LOBSTERAI_ELECTRON_PATH) || electronNodeRuntimePath;
      } else {
        delete spawnEnv.LOBSTERAI_ELECTRON_PATH;
      }
      let command = spawnOptions.command || "node";
      if (process.platform === "win32") {
        const normalizedCommand = command.trim().toLowerCase();
        const isNodeLikeCommand = normalizedCommand === "node" || normalizedCommand === "node.exe" || normalizedCommand.endsWith("\\node.cmd") || normalizedCommand.endsWith("/node.cmd");
        if (isNodeLikeCommand) {
          command = electronNodeRuntimePath;
          spawnEnv.LOBSTERAI_ELECTRON_PATH = electronNodeRuntimePath;
          coworkLog(
            "INFO",
            "runClaudeCodeLocal",
            `Rewrote Windows SDK command "${spawnOptions.command || "node"}" to Electron runtime: ${electronNodeRuntimePath}`
          );
        }
      }
      if (require$$0$1.app.isPackaged && process.platform === "darwin" && command && path$7.isAbsolute(command)) {
        const commandCandidates = /* @__PURE__ */ new Set([command, path$7.resolve(command)]);
        const appExecCandidates = /* @__PURE__ */ new Set([process.execPath, path$7.resolve(process.execPath)]);
        try {
          commandCandidates.add(fs$a.realpathSync.native(command));
        } catch {
        }
        try {
          appExecCandidates.add(fs$a.realpathSync.native(process.execPath));
        } catch {
        }
        const pointsToAppExecutable = Array.from(commandCandidates).some((candidate) => appExecCandidates.has(candidate));
        if (pointsToAppExecutable) {
          command = electronNodeRuntimePath;
          spawnEnv.LOBSTERAI_ELECTRON_PATH = electronNodeRuntimePath;
          coworkLog("WARN", "runClaudeCodeLocal", "SDK spawner command points to app executable; rewriting to Electron helper runtime");
        }
      }
      coworkLog("INFO", "runClaudeCodeLocal", "Using packaged custom SDK spawner", {
        command,
        args: spawnOptions.args
      });
      const shouldInjectWindowsHideRequire = process.platform === "win32" && Boolean(windowsHideInitScript) && spawnOptions.args.length > 0 && /\.m?js$/i.test(path$7.basename(spawnOptions.args[0]));
      const effectiveSpawnArgs = shouldInjectWindowsHideRequire ? prependNodeRequireArg(spawnOptions.args, windowsHideInitScript) : spawnOptions.args;
      if (shouldInjectWindowsHideRequire) {
        coworkLog("INFO", "runClaudeCodeLocal", `Injected Windows hidden-subprocess preload: ${windowsHideInitScript}`);
      }
      const child = require$$0$2.spawn(command, effectiveSpawnArgs, {
        cwd: spawnOptions.cwd,
        env: spawnEnv,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: process.platform === "win32",
        signal: spawnOptions.signal
      });
      (_c = child.stderr) == null ? void 0 : _c.on("data", (chunk) => {
        handleSdkStderr(chunk.toString());
      });
      return child;
    };
    activeSession.claudeSessionId = null;
    if (systemPrompt) {
      options.systemPrompt = systemPrompt;
    }
    let startupTimer = null;
    try {
      coworkLog("INFO", "runClaudeCodeLocal", "Starting local Claude Code session", {
        sessionId,
        cwd,
        claudeCodePath,
        claudeCodePathExists: fs$a.existsSync(claudeCodePath),
        isPackaged: require$$0$1.app.isPackaged,
        resourcesPath: process.resourcesPath,
        processExecPath: process.execPath,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        ANTHROPIC_BASE_URL: envVars.ANTHROPIC_BASE_URL,
        ANTHROPIC_MODEL: envVars.ANTHROPIC_MODEL,
        NODE_PATH: envVars.NODE_PATH,
        logFile: getCoworkLogPath()
      });
      const { query, createSdkMcpServer, tool } = await loadClaudeSdk();
      coworkLog("INFO", "runClaudeCodeLocal", "Claude SDK loaded successfully");
      const memoryServerName = `user-memory-${sessionId.slice(0, 8)}`;
      const memoryTools = [
        tool(
          "conversation_search",
          "Search prior conversations by query and return Claude-style <chat> blocks.",
          {
            query: string().min(1),
            max_results: number().int().min(1).max(10).optional(),
            before: string().optional(),
            after: string().optional()
          },
          async (args) => {
            const text = this.runConversationSearchTool(args);
            return {
              content: [
                {
                  type: "text",
                  text
                }
              ]
            };
          }
        ),
        tool(
          "recent_chats",
          "List recent chats and return Claude-style <chat> blocks.",
          {
            n: number().int().min(1).max(20).optional(),
            sort_order: _enum(["asc", "desc"]).optional(),
            before: string().optional(),
            after: string().optional()
          },
          async (args) => {
            const text = this.runRecentChatsTool(args);
            return {
              content: [{ type: "text", text }]
            };
          }
        )
      ];
      if (config2.memoryEnabled) {
        memoryTools.push(
          tool(
            "memory_user_edits",
            "Manage user memories. action=list|add|update|delete.",
            {
              action: _enum(["list", "add", "update", "delete"]),
              id: string().optional(),
              text: string().optional(),
              confidence: number().min(0).max(1).optional(),
              status: _enum(["created", "stale", "deleted"]).optional(),
              is_explicit: boolean().optional(),
              limit: number().int().min(1).max(200).optional(),
              query: string().optional()
            },
            async (args) => {
              try {
                const result2 = this.runMemoryUserEditsTool(args);
                return {
                  content: [
                    {
                      type: "text",
                      text: result2.text
                    }
                  ],
                  isError: result2.isError
                };
              } catch (error) {
                return {
                  content: [
                    {
                      type: "text",
                      text: this.formatMemoryUserEditsResult({
                        action: args.action,
                        successCount: 0,
                        failedCount: 1,
                        changedIds: [],
                        reason: error instanceof Error ? error.message : String(error)
                      })
                    }
                  ],
                  isError: true
                };
              }
            }
          )
        );
      }
      options.mcpServers = {
        ...options.mcpServers,
        [memoryServerName]: createSdkMcpServer({
          name: memoryServerName,
          tools: memoryTools
        })
      };
      let userMcpServerCount = 0;
      if (this.mcpServerProvider) {
        try {
          const enabledMcpServers = this.mcpServerProvider();
          coworkLog("INFO", "runClaudeCodeLocal", `MCP: ${enabledMcpServers.length} user-configured servers found`);
          for (const server of enabledMcpServers) {
            const serverKey = server.name;
            if (options.mcpServers && serverKey in options.mcpServers) {
              coworkLog("WARN", "runClaudeCodeLocal", `MCP server name conflict: "${serverKey}", skipping user config`);
              continue;
            }
            let serverConfig;
            switch (server.transportType) {
              case "stdio": {
                const stdioCommand = server.command || "";
                let effectiveStdioCommand = stdioCommand;
                const stdioArgs = server.args || [];
                let effectiveStdioArgs = [...stdioArgs];
                let shouldInjectWindowsHideRequire = false;
                let stdioEnv = server.env && Object.keys(server.env).length > 0 ? { ...server.env } : void 0;
                if (process.platform === "win32" && require$$0$1.app.isPackaged && effectiveStdioCommand) {
                  const normalizedCommand = effectiveStdioCommand.trim().toLowerCase();
                  const npmBinDir = envVars.LOBSTERAI_NPM_BIN_DIR;
                  const npxCliJs = npmBinDir ? path$7.join(npmBinDir, "npx-cli.js") : "";
                  const npmCliJs = npmBinDir ? path$7.join(npmBinDir, "npm-cli.js") : "";
                  const withElectronNodeEnv = (base) => ({
                    ...base || {},
                    ELECTRON_RUN_AS_NODE: "1",
                    LOBSTERAI_ELECTRON_PATH: electronNodeRuntimePath
                  });
                  if (normalizedCommand === "node" || normalizedCommand === "node.exe" || normalizedCommand.endsWith("\\node.cmd") || normalizedCommand.endsWith("/node.cmd")) {
                    effectiveStdioCommand = electronNodeRuntimePath;
                    stdioEnv = withElectronNodeEnv(stdioEnv);
                    shouldInjectWindowsHideRequire = true;
                    coworkLog(
                      "INFO",
                      "runClaudeCodeLocal",
                      `MCP "${serverKey}": rewrote stdio command "${stdioCommand}" to Electron runtime`
                    );
                  } else if ((normalizedCommand === "npx" || normalizedCommand === "npx.cmd" || normalizedCommand.endsWith("\\npx.cmd") || normalizedCommand.endsWith("/npx.cmd")) && npxCliJs && fs$a.existsSync(npxCliJs)) {
                    effectiveStdioCommand = electronNodeRuntimePath;
                    effectiveStdioArgs = [npxCliJs, ...stdioArgs];
                    stdioEnv = withElectronNodeEnv(stdioEnv);
                    shouldInjectWindowsHideRequire = true;
                    coworkLog(
                      "INFO",
                      "runClaudeCodeLocal",
                      `MCP "${serverKey}": rewrote stdio command "${stdioCommand}" to Electron runtime + npx-cli.js`
                    );
                  } else if ((normalizedCommand === "npm" || normalizedCommand === "npm.cmd" || normalizedCommand.endsWith("\\npm.cmd") || normalizedCommand.endsWith("/npm.cmd")) && npmCliJs && fs$a.existsSync(npmCliJs)) {
                    effectiveStdioCommand = electronNodeRuntimePath;
                    effectiveStdioArgs = [npmCliJs, ...stdioArgs];
                    stdioEnv = withElectronNodeEnv(stdioEnv);
                    shouldInjectWindowsHideRequire = true;
                    coworkLog(
                      "INFO",
                      "runClaudeCodeLocal",
                      `MCP "${serverKey}": rewrote stdio command "${stdioCommand}" to Electron runtime + npm-cli.js`
                    );
                  }
                }
                if (process.platform === "win32" && shouldInjectWindowsHideRequire && windowsHideInitScript) {
                  effectiveStdioArgs = prependNodeRequireArg(effectiveStdioArgs, windowsHideInitScript);
                  coworkLog("INFO", "runClaudeCodeLocal", `MCP "${serverKey}": injected Windows hidden-subprocess preload`);
                }
                if (require$$0$1.app.isPackaged && process.platform === "darwin" && stdioCommand && path$7.isAbsolute(stdioCommand)) {
                  const commandCandidates = /* @__PURE__ */ new Set([stdioCommand, path$7.resolve(stdioCommand)]);
                  const appExecCandidates = /* @__PURE__ */ new Set([
                    process.execPath,
                    path$7.resolve(process.execPath),
                    electronNodeRuntimePath,
                    path$7.resolve(electronNodeRuntimePath)
                  ]);
                  try {
                    commandCandidates.add(fs$a.realpathSync.native(stdioCommand));
                  } catch {
                  }
                  try {
                    appExecCandidates.add(fs$a.realpathSync.native(process.execPath));
                  } catch {
                  }
                  try {
                    appExecCandidates.add(fs$a.realpathSync.native(electronNodeRuntimePath));
                  } catch {
                  }
                  const pointsToAppExecutable = Array.from(commandCandidates).some((candidate) => appExecCandidates.has(candidate));
                  if (pointsToAppExecutable) {
                    effectiveStdioCommand = electronNodeRuntimePath;
                    stdioEnv = {
                      ...stdioEnv || {},
                      ELECTRON_RUN_AS_NODE: "1",
                      LOBSTERAI_ELECTRON_PATH: electronNodeRuntimePath
                    };
                    coworkLog(
                      "WARN",
                      "runClaudeCodeLocal",
                      `MCP "${serverKey}": command points to app executable; rewriting command to Electron helper runtime`
                    );
                  }
                }
                serverConfig = {
                  type: "stdio",
                  command: effectiveStdioCommand,
                  args: effectiveStdioArgs,
                  env: stdioEnv && Object.keys(stdioEnv).length > 0 ? stdioEnv : void 0
                };
                coworkLog(
                  "INFO",
                  "runClaudeCodeLocal",
                  `MCP "${serverKey}": stdio command="${effectiveStdioCommand}", args=${JSON.stringify(effectiveStdioArgs)}`
                );
                if (stdioEnv && Object.keys(stdioEnv).length > 0) {
                  coworkLog("INFO", "runClaudeCodeLocal", `MCP "${serverKey}": custom env vars: ${JSON.stringify(stdioEnv)}`);
                }
                if (effectiveStdioCommand) {
                  if (path$7.isAbsolute(effectiveStdioCommand)) {
                    coworkLog(
                      fs$a.existsSync(effectiveStdioCommand) ? "INFO" : "WARN",
                      "runClaudeCodeLocal",
                      `MCP "${serverKey}": absolute command "${effectiveStdioCommand}" exists=${fs$a.existsSync(effectiveStdioCommand)}`
                    );
                  } else {
                    const whichCmd = process.platform === "win32" ? "where" : "which";
                    try {
                      const resolveResult = require$$0$2.spawnSync(whichCmd, [effectiveStdioCommand], {
                        env: { ...envVars, ...stdioEnv || {} },
                        encoding: "utf-8",
                        timeout: 5e3,
                        windowsHide: process.platform === "win32"
                      });
                      if (resolveResult.status === 0 && resolveResult.stdout) {
                        coworkLog(
                          "INFO",
                          "runClaudeCodeLocal",
                          `MCP "${serverKey}": command "${effectiveStdioCommand}" resolves to: ${resolveResult.stdout.trim()}`
                        );
                      } else {
                        coworkLog(
                          "WARN",
                          "runClaudeCodeLocal",
                          `MCP "${serverKey}": command "${effectiveStdioCommand}" NOT FOUND in PATH (exit: ${resolveResult.status}, stderr: ${(resolveResult.stderr || "").trim()})`
                        );
                      }
                    } catch (e) {
                      coworkLog(
                        "WARN",
                        "runClaudeCodeLocal",
                        `MCP "${serverKey}": failed to resolve command "${effectiveStdioCommand}": ${e instanceof Error ? e.message : String(e)}`
                      );
                    }
                  }
                }
                break;
              }
              case "sse":
                serverConfig = {
                  type: "sse",
                  url: server.url || "",
                  headers: server.headers && Object.keys(server.headers).length > 0 ? server.headers : void 0
                };
                break;
              case "http":
                serverConfig = {
                  type: "http",
                  url: server.url || "",
                  headers: server.headers && Object.keys(server.headers).length > 0 ? server.headers : void 0
                };
                break;
              default:
                coworkLog("WARN", "runClaudeCodeLocal", `Unknown MCP transport type: "${server.transportType}", skipping`);
                continue;
            }
            options.mcpServers = {
              ...options.mcpServers,
              [serverKey]: serverConfig
            };
            userMcpServerCount += 1;
            coworkLog("INFO", "runClaudeCodeLocal", `Injected user MCP server: "${serverKey}" (${server.transportType})`);
          }
        } catch (error) {
          coworkLog(
            "WARN",
            "runClaudeCodeLocal",
            `Failed to load user MCP servers: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      if (options.mcpServers) {
        const mcpKeys = Object.keys(options.mcpServers);
        coworkLog("INFO", "runClaudeCodeLocal", `MCP final config: ${mcpKeys.length} servers: [${mcpKeys.join(", ")}]`);
        for (const key of mcpKeys) {
          const cfg = options.mcpServers[key];
          if (cfg && typeof cfg === "object" && "type" in cfg) {
            coworkLog(
              "INFO",
              "runClaudeCodeLocal",
              `MCP server "${key}": type=${cfg.type}, command=${cfg.command || "N/A"}, args=${JSON.stringify(cfg.args || [])}`
            );
          }
        }
        try {
          const serializable = {};
          for (const key of mcpKeys) {
            const cfg = options.mcpServers[key];
            if (cfg && typeof cfg === "object") {
              if ("type" in cfg && typeof cfg.type === "string") {
                serializable[key] = cfg;
              } else {
                serializable[key] = { type: "(SDK server instance)" };
              }
            }
          }
          coworkLog("INFO", "runClaudeCodeLocal", `MCP full config dump: ${JSON.stringify(serializable, null, 2)}`);
        } catch (e) {
          coworkLog("WARN", "runClaudeCodeLocal", `MCP config dump failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      let queryPrompt;
      if (imageAttachments && imageAttachments.length > 0) {
        const contentBlocks = [];
        if (prompt.trim()) {
          contentBlocks.push({ type: "text", text: prompt });
        }
        for (const img of imageAttachments) {
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: img.mimeType,
              data: img.base64Data
            }
          });
        }
        const userMessage = {
          type: "user",
          message: {
            role: "user",
            content: contentBlocks
          },
          parent_tool_use_id: null,
          session_id: ""
        };
        queryPrompt = async function* () {
          yield userMessage;
        }();
      } else {
        queryPrompt = prompt;
      }
      const startupTimeoutMs = userMcpServerCount > 0 ? SDK_STARTUP_TIMEOUT_WITH_USER_MCP_MS : SDK_STARTUP_TIMEOUT_MS;
      coworkLog("INFO", "runClaudeCodeLocal", `Using SDK startup timeout: ${startupTimeoutMs}ms (userMcpServers=${userMcpServerCount})`);
      startupTimer = setTimeout(() => {
        coworkLog("ERROR", "runClaudeCodeLocal", "SDK startup timeout: no events received within timeout", {
          timeoutMs: startupTimeoutMs,
          userMcpServers: userMcpServerCount
        });
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      }, startupTimeoutMs);
      const result = await query({ prompt: queryPrompt, options });
      coworkLog("INFO", "runClaudeCodeLocal", "Claude Code process started, iterating events");
      let eventCount = 0;
      for await (const event of result) {
        if (startupTimer) {
          clearTimeout(startupTimer);
          startupTimer = null;
        }
        if (this.isSessionStopRequested(sessionId, activeSession)) {
          break;
        }
        eventCount++;
        const eventPayload = event;
        const eventType = eventPayload && typeof eventPayload === "object" ? String(eventPayload.type ?? "") : typeof event;
        coworkLog("INFO", "runClaudeCodeLocal", `Event #${eventCount}: type=${eventType} payload=${JSON.stringify(eventPayload)}  `);
        this.handleClaudeEvent(sessionId, event);
      }
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
      coworkLog("INFO", "runClaudeCodeLocal", `Event iteration completed, total events: ${eventCount}`);
      if (this.stoppedSessions.has(sessionId)) {
        this.store.updateSession(sessionId, { status: "idle" });
        return;
      }
      this.finalizeStreamingContent(activeSession);
      const session = this.store.getSession(sessionId);
      if ((session == null ? void 0 : session.status) !== "error") {
        this.store.updateSession(sessionId, { status: "completed" });
        this.applyTurnMemoryUpdatesForSession(sessionId);
        this.emit("complete", sessionId, activeSession.claudeSessionId);
      }
    } catch (error) {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
      if (this.stoppedSessions.has(sessionId)) {
        this.store.updateSession(sessionId, { status: "idle" });
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const stderrOutput = stderrTail;
      coworkLog("ERROR", "runClaudeCodeLocal", "Claude Code process failed", {
        errorMessage,
        errorStack: error instanceof Error ? error.stack : void 0,
        stderr: stderrOutput || "(no stderr captured)",
        claudeCodePath,
        claudeCodePathExists: fs$a.existsSync(claudeCodePath)
      });
      const detailedError = stderrOutput ? `${errorMessage}

Process stderr:
${stderrOutput.slice(-2e3)}

Log file: ${getCoworkLogPath()}` : `${errorMessage}

Log file: ${getCoworkLogPath()}`;
      this.handleError(sessionId, detailedError);
      throw error;
    } finally {
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
    }
  }
  async runClaudeCode(activeSession, prompt, cwd, systemPrompt, imageAttachments) {
    const { sessionId } = activeSession;
    if (this.isSessionStopRequested(sessionId, activeSession)) {
      this.store.updateSession(sessionId, { status: "idle" });
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    const config2 = this.store.getConfig();
    const executionMode = config2.executionMode || "local";
    const resolvedCwd = path$7.resolve(cwd);
    if (!fs$a.existsSync(resolvedCwd)) {
      this.handleError(sessionId, `Working directory does not exist: ${resolvedCwd}`);
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    const shouldPrepareSandboxPrompt = executionMode !== "local" || activeSession.executionMode === "sandbox";
    let effectivePrompt = this.augmentPromptWithReferencedWorkspaceFiles(prompt, resolvedCwd);
    let unresolvedSandboxAttachments = [];
    if (shouldPrepareSandboxPrompt) {
      const prepared = this.preparePromptForSandbox(effectivePrompt, resolvedCwd, sessionId);
      effectivePrompt = prepared.prompt;
      unresolvedSandboxAttachments = prepared.unresolved;
    }
    const outsideAttachments = Array.from(
      /* @__PURE__ */ new Set([...this.findAttachmentsOutsideCwd(effectivePrompt, resolvedCwd), ...unresolvedSandboxAttachments])
    );
    const hasActiveSandboxVm = activeSession.executionMode === "sandbox" && activeSession.sandboxProcess && !activeSession.sandboxProcess.killed && activeSession.ipcBridge;
    if (outsideAttachments.length > 0 && (executionMode !== "local" || hasActiveSandboxVm)) {
      const detail = outsideAttachments.join(", ");
      if (executionMode === "sandbox" || hasActiveSandboxVm) {
        this.handleError(sessionId, `Attachment paths outside working directory are not available in sandbox mode: ${detail}`);
        this.clearPendingPermissions(sessionId);
        this.activeSessions.delete(sessionId);
        return;
      }
      this.addSystemMessage(
        sessionId,
        `Attachments outside the working directory are not available in the Sandbox VM. Falling back to local execution.`
      );
      activeSession.executionMode = "local";
      this.store.updateSession(sessionId, { executionMode: "local" });
      await this.runClaudeCodeLocal(activeSession, effectivePrompt, resolvedCwd, systemPrompt, imageAttachments);
      return;
    }
    if (hasActiveSandboxVm) {
      await this.continueSandboxTurn(activeSession, effectivePrompt, resolvedCwd, systemPrompt, imageAttachments);
      return;
    }
    if (executionMode === "local") {
      activeSession.executionMode = "local";
      this.store.updateSession(sessionId, { executionMode: "local" });
      await this.runClaudeCodeLocal(activeSession, effectivePrompt, resolvedCwd, systemPrompt, imageAttachments);
      return;
    }
    const sandboxReady = executionMode === "auto" ? getSandboxRuntimeInfoIfReady() : await ensureSandboxReady();
    if (!sandboxReady.ok) {
      const errorMessage = "error" in sandboxReady ? sandboxReady.error : "Sandbox VM unavailable.";
      coworkLog("WARN", "runClaudeCode", "Sandbox not ready", { errorMessage, executionMode });
      if (executionMode === "sandbox") {
        this.handleError(sessionId, errorMessage);
        this.clearPendingPermissions(sessionId);
        this.activeSessions.delete(sessionId);
        return;
      }
      if (executionMode !== "auto") {
        this.addSystemMessage(sessionId, this.getSandboxUnavailableFallbackNotice(errorMessage));
      }
      activeSession.executionMode = "local";
      this.store.updateSession(sessionId, { executionMode: "local" });
      await this.runClaudeCodeLocal(activeSession, effectivePrompt, resolvedCwd, systemPrompt, imageAttachments);
      return;
    }
    try {
      const sandboxPrompt = this.injectSandboxHistoryPrompt(sessionId, prompt, effectivePrompt);
      activeSession.executionMode = "sandbox";
      this.store.updateSession(sessionId, { executionMode: "sandbox" });
      coworkLog("INFO", "runClaudeCode", "Starting sandbox execution", {
        sessionId,
        runtimeBinary: sandboxReady.runtimeInfo.runtimeBinary,
        imagePath: sandboxReady.runtimeInfo.imagePath,
        platform: sandboxReady.runtimeInfo.platform,
        arch: sandboxReady.runtimeInfo.arch
      });
      await this.runClaudeCodeInSandbox(activeSession, sandboxPrompt, resolvedCwd, systemPrompt, sandboxReady.runtimeInfo, imageAttachments);
      if (!activeSession.sandboxProcess || activeSession.sandboxProcess.killed) {
        this.activeSessions.delete(sessionId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sandbox error";
      if (executionMode === "sandbox") {
        this.handleError(sessionId, message);
        this.activeSessions.delete(sessionId);
        return;
      }
      this.addSystemMessage(sessionId, `Sandbox VM execution failed. Falling back to local execution. (${message})`);
      activeSession.executionMode = "local";
      this.store.updateSession(sessionId, { executionMode: "local" });
      this.activeSessions.set(sessionId, activeSession);
      await this.runClaudeCodeLocal(activeSession, effectivePrompt, resolvedCwd, systemPrompt, imageAttachments);
    }
  }
  async runClaudeCodeInSandbox(activeSession, prompt, cwd, systemPrompt, runtimeInfo, imageAttachments) {
    const { sessionId, abortController } = activeSession;
    if (this.isSessionStopRequested(sessionId, activeSession)) {
      this.store.updateSession(sessionId, { status: "idle" });
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    const apiConfig = getCurrentApiConfig("sandbox");
    if (!apiConfig) {
      this.handleError(sessionId, "API configuration not found. Please configure model settings.");
      this.clearPendingPermissions(sessionId);
      this.activeSessions.delete(sessionId);
      return;
    }
    const paths = ensureCoworkSandboxDirs(sessionId);
    const cwdMapping = resolveSandboxCwd(cwd);
    const env = await getEnhancedEnv("sandbox");
    const hostSkillsRoots = this.collectHostSkillsRoots(env, cwdMapping, systemPrompt);
    const sandboxSkills = this.resolveSandboxSkillsConfig(hostSkillsRoots, runtimeInfo.platform);
    const sandboxEnv = this.buildSandboxEnv(env, sandboxSkills.guestSkillsRoot);
    coworkLog("INFO", "runSandbox", "Resolved sandbox API endpoint", {
      sessionId,
      anthropicBaseUrl: summarizeEndpointForLog(sandboxEnv.ANTHROPIC_BASE_URL),
      anthropicModel: sandboxEnv.ANTHROPIC_MODEL ?? null,
      httpProxy: summarizeEndpointForLog(sandboxEnv.HTTP_PROXY ?? sandboxEnv.http_proxy),
      noProxy: sandboxEnv.NO_PROXY ?? sandboxEnv.no_proxy ?? null,
      directHostRouting: !(sandboxEnv.HTTP_PROXY || sandboxEnv.http_proxy)
    });
    const sandboxSystemPrompt = this.enforceSandboxWorkspacePrompt(systemPrompt, cwdMapping.guestPath);
    const resolvedSystemPrompt = this.resolveAutoRoutingForSandbox(sandboxSystemPrompt, {
      guestSkillsRoot: sandboxSkills.guestSkillsRoot,
      hostSkillsRoots,
      hostSkillsRootMounts: sandboxSkills.rootMounts
    });
    activeSession.sandboxSkillsGuestPath = sandboxSkills.guestSkillsRoot ?? void 0;
    activeSession.sandboxSkillMounts = Object.keys(sandboxSkills.skillMounts).length > 0 ? sandboxSkills.skillMounts : void 0;
    activeSession.sandboxSkillRootMounts = sandboxSkills.rootMounts.length > 0 ? sandboxSkills.rootMounts : void 0;
    const mounts = {
      work: {
        tag: cwdMapping.mountTag,
        guestPath: cwdMapping.guestPath
      },
      ipc: {
        tag: "ipc",
        guestPath: "/workspace/ipc"
      },
      ...sandboxSkills.skillMounts
    };
    const input = {
      prompt,
      cwd: cwdMapping.guestPath,
      workspaceRoot: cwdMapping.guestPath,
      hostWorkspaceRoot: cwdMapping.hostPath,
      memoryEnabled: this.store.getConfig().memoryEnabled,
      autoApprove: Boolean(activeSession.autoApprove),
      confirmationMode: activeSession.confirmationMode,
      env: sandboxEnv,
      mounts
    };
    if (imageAttachments && imageAttachments.length > 0) {
      input.imageAttachments = imageAttachments;
    }
    activeSession.claudeSessionId = null;
    if (resolvedSystemPrompt) {
      input.systemPrompt = resolvedSystemPrompt;
    }
    let currentChild;
    const isHvfDenied = (message) => message.includes("HV_DENIED");
    const isWhpxFailed = (message) => /WHPX|whpx/.test(message) && /fail|error|not.*support|unavailable/i.test(message);
    const isMemoryAllocationFailed = (message) => message.includes("cannot set up guest memory");
    const runOnce = async (accelOverride2, launcherOverride2, memoryMb2) => {
      if (this.isSessionStopRequested(sessionId, activeSession)) {
        this.store.updateSession(sessionId, { status: "idle" });
        return { status: "ok" };
      }
      const startTime = Date.now();
      const accelMode = accelOverride2 ?? (process.platform === "darwin" ? "hvf" : process.platform === "win32" ? "whpx" : "default");
      console.log(
        `Starting sandbox VM with acceleration: ${accelMode}, launcher: ${launcherOverride2 ?? "direct"}, memory: ${memoryMb2 ?? 4096}MB`
      );
      const serialLogPath = path$7.join(paths.ipcDir, "serial.log");
      try {
        fs$a.unlinkSync(serialLogPath);
        coworkLog("INFO", "runSandbox", "Removed stale serial.log");
      } catch (e) {
        const code = e && typeof e === "object" && "code" in e ? e.code : "";
        if (code && code !== "ENOENT") {
          coworkLog("WARN", "runSandbox", `Failed to remove serial.log: ${code}`, {
            serialLogPath
          });
        }
      }
      let ipcPort;
      if (runtimeInfo.platform === "win32") {
        try {
          ipcPort = await findFreePort();
          console.log(`Allocated IPC port ${ipcPort} for virtio-serial bridge`);
        } catch (error) {
          const message = `Failed to allocate IPC port: ${error instanceof Error ? error.message : String(error)}`;
          return { status: "error", message, hvfDenied: false, memoryFailed: false };
        }
      }
      let child;
      try {
        child = spawnCoworkSandboxVm({
          runtime: runtimeInfo,
          ipcDir: paths.ipcDir,
          cwdMapping,
          extraMounts: sandboxSkills.extraMounts,
          accelOverride: accelOverride2,
          launcher: launcherOverride2,
          ipcPort,
          memoryMb: memoryMb2
        });
      } catch (error) {
        const message = formatSandboxSpawnError(error, runtimeInfo);
        return { status: "error", message, hvfDenied: isHvfDenied(message), memoryFailed: false };
      }
      console.log(`Sandbox VM spawned in ${Date.now() - startTime}ms`);
      currentChild = child;
      activeSession.sandboxProcess = child;
      activeSession.sandboxIpcDir = paths.ipcDir;
      if (this.isSessionStopRequested(sessionId, activeSession)) {
        try {
          child.kill("SIGKILL");
        } catch {
        }
        return { status: "ok" };
      }
      let stderrBuffer = "";
      coworkLog("INFO", "runSandbox", "Sandbox VM spawned", {
        sessionId,
        runtimeBinary: runtimeInfo.runtimeBinary,
        imagePath: runtimeInfo.imagePath,
        platform: runtimeInfo.platform,
        arch: runtimeInfo.arch,
        ipcPort: ipcPort ?? null,
        ipcDir: paths.ipcDir,
        accelMode,
        launcher: launcherOverride2 ?? "direct",
        pid: child.pid
      });
      const handleLine = (line) => {
        if (this.isSessionStopRequested(sessionId, activeSession)) {
          return;
        }
        const trimmed = line.trim();
        if (!trimmed) return;
        let payload = null;
        try {
          payload = JSON.parse(trimmed);
        } catch {
          return;
        }
        const messageType = String(payload.type ?? "");
        if (messageType === "sdk_event" && payload.event) {
          this.handleClaudeEvent(sessionId, payload.event);
          return;
        }
        if (messageType === "host_tool_request") {
          const requestId = String(payload.requestId ?? "");
          if (!requestId) return;
          const result = this.handleHostToolExecution(payload);
          this.writeSandboxHostToolResponse(activeSession, paths.responsesDir, requestId, {
            type: "host_tool_response",
            requestId,
            success: result.success,
            text: result.text,
            error: result.success ? void 0 : result.text
          });
          return;
        }
        if (messageType === "permission_request") {
          const requestId = String(payload.requestId ?? "");
          if (!requestId) return;
          const toolName = String(payload.toolName ?? "AskUserQuestion");
          const toolInputRaw = payload.toolInput;
          const toolInput = toolInputRaw && typeof toolInputRaw === "object" ? toolInputRaw : {};
          const responsePath = path$7.join(paths.responsesDir, `${requestId}.json`);
          this.sandboxPermissions.set(requestId, { sessionId, responsePath });
          const request = {
            requestId,
            toolName,
            toolInput: this.sanitizeToolPayload(toolInput)
          };
          activeSession.pendingPermission = request;
          this.emit("permissionRequest", sessionId, request);
        }
      };
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderrBuffer += text;
        if (stderrBuffer.length > 1e4) {
          stderrBuffer = stderrBuffer.slice(-1e4);
        }
        coworkLog("WARN", "QEMUStderr", text.trim());
      });
      child.stdout.on("data", () => {
      });
      const streamAbort = new AbortController();
      let streamPromise = null;
      try {
        if (ipcPort && runtimeInfo.platform === "win32") {
          const bridge = new VirtioSerialBridge(paths.ipcDir, cwdMapping.hostPath);
          try {
            await bridge.connect(ipcPort);
            activeSession.ipcBridge = bridge;
            coworkLog("INFO", "runSandbox", `IPC bridge connected on port ${ipcPort}`);
            console.log(`IPC bridge connected on port ${ipcPort}`);
          } catch (error) {
            bridge.close();
            try {
              child.kill("SIGKILL");
            } catch {
            }
            const stderrSnippet = stderrBuffer.trim();
            const accelFailed = isHvfDenied(stderrSnippet) || isWhpxFailed(stderrSnippet);
            const memFailed = isMemoryAllocationFailed(stderrSnippet);
            let message = `Failed to connect IPC bridge: ${error instanceof Error ? error.message : String(error)}`;
            if (stderrSnippet) {
              message += `
QEMU stderr: ${stderrSnippet.slice(-1e3)}`;
            }
            coworkLog("ERROR", "runSandbox", "IPC bridge connection failed", {
              port: ipcPort,
              errorMessage: error instanceof Error ? error.message : String(error),
              qemuStderr: stderrSnippet.slice(-2e3) || "(empty)",
              accelFailed,
              memoryFailed: memFailed,
              processExited: child.killed || !child.pid
            });
            return { status: "error", message, hvfDenied: accelFailed, memoryFailed: memFailed };
          }
        }
        const vmReadyTimeoutOverride = Number.parseInt(process.env.COWORK_SANDBOX_VM_READY_TIMEOUT_MS ?? "", 10);
        const defaultVmReadyTimeout = runtimeInfo.platform === "win32" && accelMode === "tcg" ? 3e5 : 18e4;
        const vmReadyTimeoutMs = Number.isFinite(vmReadyTimeoutOverride) && vmReadyTimeoutOverride > 0 ? vmReadyTimeoutOverride : defaultVmReadyTimeout;
        coworkLog("INFO", "runSandbox", "Waiting for VM heartbeat", {
          timeoutMs: vmReadyTimeoutMs,
          accelMode,
          platform: runtimeInfo.platform
        });
        const vmReady = await this.waitForVmReady(paths.ipcDir, child, vmReadyTimeoutMs, {
          platform: runtimeInfo.platform,
          accelMode
        });
        if (!vmReady) {
          const stderrSnippet = stderrBuffer.trim();
          let message = "VM failed to become ready";
          if (stderrSnippet) {
            message += `
QEMU stderr: ${stderrSnippet.slice(-1e3)}`;
          }
          try {
            const serialLog = fs$a.readFileSync(path$7.join(paths.ipcDir, "serial.log"), "utf8").trim();
            if (serialLog) {
              message += `
Serial log (last 1500 chars): ${serialLog.slice(-1500)}`;
            }
          } catch {
          }
          const accelFailed = isHvfDenied(stderrSnippet) || isWhpxFailed(stderrSnippet);
          const memFailed = isMemoryAllocationFailed(stderrSnippet);
          coworkLog("ERROR", "runSandbox", "VM failed to become ready", {
            elapsed: Date.now() - startTime,
            qemuStderr: stderrSnippet.slice(-2e3) || "(empty)",
            accelFailed,
            memoryFailed: memFailed
          });
          try {
            child.kill("SIGKILL");
          } catch {
          }
          if (activeSession.ipcBridge) {
            try {
              activeSession.ipcBridge.close();
            } catch {
            }
            activeSession.ipcBridge = void 0;
          }
          return { status: "error", message, hvfDenied: accelFailed, memoryFailed: memFailed };
        }
        if (this.isSessionStopRequested(sessionId, activeSession)) {
          return { status: "ok" };
        }
        if (activeSession.ipcBridge && sandboxSkills.guestSkillsRoot && sandboxSkills.skillEntries.length > 0) {
          coworkLog("INFO", "runSandbox", "Preparing to push skill files via serial bridge", {
            guestSkillsRoot: sandboxSkills.guestSkillsRoot,
            skillCount: sandboxSkills.skillEntries.length
          });
          try {
            let pushedFileCount = 0;
            let pushedSkillCount = 0;
            for (const skillEntry of sandboxSkills.skillEntries) {
              if (!fs$a.existsSync(skillEntry.hostPath)) {
                coworkLog("WARN", "runSandbox", "Skill directory does not exist, skip push", {
                  skillId: skillEntry.skillId,
                  hostPath: skillEntry.hostPath
                });
                continue;
              }
              const skillFiles = collectSkillFilesForSandbox(skillEntry.hostPath);
              for (const file2 of skillFiles) {
                activeSession.ipcBridge.pushFile(skillEntry.guestPath, file2.path, file2.data);
              }
              pushedSkillCount += 1;
              pushedFileCount += skillFiles.length;
              coworkLog("INFO", "runSandbox", "Pushed skill files to sandbox", {
                skillId: skillEntry.skillId,
                hostPath: skillEntry.hostPath,
                guestPath: skillEntry.guestPath,
                fileCount: skillFiles.length
              });
            }
            coworkLog("INFO", "runSandbox", "Finished pushing skill files to sandbox via serial bridge", {
              pushedSkillCount,
              pushedFileCount
            });
          } catch (error) {
            coworkLog("ERROR", "runSandbox", "Failed to push skill files to sandbox", {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        } else if (activeSession.ipcBridge) {
          coworkLog("INFO", "runSandbox", "No sandbox skills to push via serial bridge", {
            hostSkillsRoots: hostSkillsRoots.join(", ")
          });
        } else {
          coworkLog("INFO", "runSandbox", "No IPC bridge (9p mode), skill files shared via virtfs mounts", {
            skillCount: sandboxSkills.skillEntries.length,
            skillPaths: sandboxSkills.skillEntries.map((entry) => entry.hostPath).join(", ")
          });
        }
        if (activeSession.ipcBridge) {
          this.pushStagedAttachmentsToSandbox(activeSession.ipcBridge, cwd, sessionId);
        }
        const { requestId, streamPath } = buildSandboxRequest(paths, input);
        streamPromise = this.readSandboxStream(streamPath, handleLine, streamAbort.signal);
        if (activeSession.ipcBridge) {
          activeSession.ipcBridge.sendRequest(requestId, input);
          console.log(`Sandbox request ${requestId} sent via virtio-serial bridge`);
        }
        return await new Promise((resolve) => {
          activeSession.sandboxTurnResolve = resolve;
          child.on("error", (error) => {
            activeSession.sandboxTurnResolve = void 0;
            activeSession.sandboxProcess = void 0;
            activeSession.sandboxIpcDir = void 0;
            const message = formatSandboxSpawnError(error, runtimeInfo);
            resolve({ status: "error", message, hvfDenied: isHvfDenied(message), memoryFailed: isMemoryAllocationFailed(message) });
          });
          child.on("close", (code) => {
            activeSession.sandboxProcess = void 0;
            activeSession.sandboxIpcDir = void 0;
            if (!activeSession.sandboxTurnResolve) {
              return;
            }
            activeSession.sandboxTurnResolve = void 0;
            if (this.isSessionStopRequested(sessionId, activeSession)) {
              this.store.updateSession(sessionId, { status: "idle" });
              resolve({ status: "ok" });
              return;
            }
            this.finalizeStreamingContent(activeSession);
            if (code !== 0) {
              const message = stderrBuffer.trim() || `Sandbox VM exited with code ${code}`;
              resolve({ status: "error", message, hvfDenied: isHvfDenied(message), memoryFailed: isMemoryAllocationFailed(message) });
              return;
            }
            const session = this.store.getSession(sessionId);
            if ((session == null ? void 0 : session.status) !== "error" && (session == null ? void 0 : session.status) !== "completed") {
              this.store.updateSession(sessionId, { status: "completed" });
              this.applyTurnMemoryUpdatesForSession(sessionId);
              this.emit("complete", sessionId, activeSession.claudeSessionId);
            }
            resolve({ status: "ok" });
          });
        });
      } finally {
        streamAbort.abort();
        if (streamPromise) {
          try {
            await streamPromise;
          } catch (error) {
            console.warn("Sandbox stream reader error:", error);
          }
        }
        const vmStillAlive = activeSession.sandboxProcess && !activeSession.sandboxProcess.killed;
        if (vmStillAlive) {
          this.clearSandboxPermissions(sessionId);
          this.clearPendingPermissions(sessionId);
          activeSession.pendingPermission = null;
        } else {
          if (child && !child.killed) {
            try {
              child.kill("SIGTERM");
              setTimeout(() => {
                if (!child.killed) {
                  child.kill("SIGKILL");
                }
              }, 1e3);
            } catch (error) {
              console.warn("Failed to kill sandbox process in cleanup:", error);
            }
          }
          this.clearSandboxPermissions(sessionId);
          this.clearPendingPermissions(sessionId);
          activeSession.pendingPermission = null;
          if (activeSession.ipcBridge) {
            try {
              activeSession.ipcBridge.close();
            } catch (error) {
              console.warn("Failed to close IPC bridge in cleanup:", error);
            }
            activeSession.ipcBridge = void 0;
          }
        }
      }
    };
    abortController.signal.addEventListener(
      "abort",
      () => {
        if (!currentChild) return;
        try {
          currentChild.kill("SIGKILL");
        } catch (error) {
          console.warn("Failed to kill sandbox process on abort:", error);
        }
      },
      { once: true }
    );
    let accelOverride;
    let launcherOverride;
    let memoryMb;
    const MEMORY_FALLBACK_STEPS = [2048, 1024];
    let memoryFallbackIndex = 0;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1e3));
      }
      coworkLog("INFO", "runSandbox", `Sandbox attempt ${attempt + 1}/5`, {
        accelOverride: accelOverride ?? "default",
        launcher: launcherOverride ?? "direct",
        memoryMb: memoryMb ?? 4096
      });
      const result = await runOnce(accelOverride, launcherOverride, memoryMb);
      if (result.status === "ok") {
        return;
      }
      coworkLog("WARN", "runSandbox", `Sandbox attempt ${attempt + 1} failed`, {
        hvfDenied: result.hvfDenied,
        memoryFailed: result.memoryFailed,
        message: result.message.slice(0, 500)
      });
      if (result.memoryFailed && memoryFallbackIndex < MEMORY_FALLBACK_STEPS.length) {
        const nextMemory = MEMORY_FALLBACK_STEPS[memoryFallbackIndex++];
        this.addSystemMessage(sessionId, `Sandbox VM failed to allocate memory (${memoryMb ?? 4096}MB). Retrying with ${nextMemory}MB.`);
        coworkLog("INFO", "runSandbox", `Memory allocation failed, reducing to ${nextMemory}MB`, {
          previousMemory: memoryMb ?? 4096,
          nextMemory
        });
        memoryMb = nextMemory;
        continue;
      }
      if (result.hvfDenied && launcherOverride !== "launchctl" && process.platform === "darwin") {
        this.addSystemMessage(sessionId, "HVF acceleration is denied in the app sandbox. Retrying via launchctl.");
        launcherOverride = "launchctl";
        continue;
      }
      if (result.hvfDenied && accelOverride !== "tcg") {
        if (process.platform === "win32") {
          this.addSystemMessage(sessionId, "Hardware virtualization (WHPX/Hyper-V) is unavailable. Retrying with software emulation (TCG).");
          if (!memoryMb || memoryMb > 2048) {
            memoryMb = 2048;
          }
          accelOverride = "tcg";
          continue;
        }
        this.addSystemMessage(sessionId, "HVF acceleration is unavailable. Falling back to local execution mode for better performance.");
        throw new Error("HVF unavailable, fallback to local mode");
      }
      throw new Error(result.message);
    }
  }
  /**
   * Send a continuation request to an already-running sandbox VM.
   * Reuses the existing QEMU process and IPC bridge.
   */
  async continueSandboxTurn(activeSession, prompt, cwd, systemPrompt, imageAttachments) {
    const { sessionId } = activeSession;
    if (this.isSessionStopRequested(sessionId, activeSession)) {
      this.store.updateSession(sessionId, { status: "idle" });
      return;
    }
    activeSession.hasAssistantTextOutput = false;
    activeSession.hasAssistantThinkingOutput = false;
    activeSession.currentStreamingTextTruncated = false;
    activeSession.currentStreamingThinkingTruncated = false;
    activeSession.lastStreamingTextUpdateAt = 0;
    activeSession.lastStreamingThinkingUpdateAt = 0;
    const apiConfig = getCurrentApiConfig("sandbox");
    if (!apiConfig) {
      this.handleError(sessionId, "API configuration not found. Please configure model settings.");
      return;
    }
    const paths = ensureCoworkSandboxDirs(sessionId);
    const cwdMapping = resolveSandboxCwd(cwd);
    const env = await getEnhancedEnv("sandbox");
    const hostSkillsRoots = this.collectHostSkillsRoots(env, cwdMapping, systemPrompt);
    const sandboxSystemPrompt = this.enforceSandboxWorkspacePrompt(systemPrompt, cwdMapping.guestPath);
    const resolvedSystemPrompt = this.resolveAutoRoutingForSandbox(sandboxSystemPrompt, {
      guestSkillsRoot: activeSession.sandboxSkillsGuestPath ?? null,
      hostSkillsRoots,
      hostSkillsRootMounts: activeSession.sandboxSkillRootMounts
    });
    const sandboxEnv = this.buildSandboxEnv(env, activeSession.sandboxSkillsGuestPath ?? null);
    coworkLog("INFO", "runSandbox", "Resolved sandbox API endpoint (continue)", {
      sessionId,
      anthropicBaseUrl: summarizeEndpointForLog(sandboxEnv.ANTHROPIC_BASE_URL),
      anthropicModel: sandboxEnv.ANTHROPIC_MODEL ?? null,
      httpProxy: summarizeEndpointForLog(sandboxEnv.HTTP_PROXY ?? sandboxEnv.http_proxy),
      noProxy: sandboxEnv.NO_PROXY ?? sandboxEnv.no_proxy ?? null,
      directHostRouting: !(sandboxEnv.HTTP_PROXY || sandboxEnv.http_proxy)
    });
    if (activeSession.ipcBridge) {
      activeSession.ipcBridge.setHostCwd(cwdMapping.hostPath);
    }
    const mounts = {
      work: {
        tag: cwdMapping.mountTag,
        guestPath: cwdMapping.guestPath
      },
      ipc: {
        tag: "ipc",
        guestPath: "/workspace/ipc"
      },
      ...activeSession.sandboxSkillMounts ?? {}
    };
    const input = {
      prompt,
      cwd: cwdMapping.guestPath,
      workspaceRoot: cwdMapping.guestPath,
      hostWorkspaceRoot: cwdMapping.hostPath,
      memoryEnabled: this.store.getConfig().memoryEnabled,
      autoApprove: Boolean(activeSession.autoApprove),
      confirmationMode: activeSession.confirmationMode,
      env: sandboxEnv,
      mounts
    };
    if (imageAttachments && imageAttachments.length > 0) {
      input.imageAttachments = imageAttachments;
    }
    if (activeSession.claudeSessionId) {
      input.sessionId = activeSession.claudeSessionId;
    }
    if (resolvedSystemPrompt) {
      input.systemPrompt = resolvedSystemPrompt;
    }
    if (activeSession.ipcBridge) {
      this.pushStagedAttachmentsToSandbox(activeSession.ipcBridge, cwd, sessionId);
    }
    const { requestId, streamPath } = buildSandboxRequest(paths, input);
    const streamAbort = new AbortController();
    const handleLine = (line) => {
      if (this.isSessionStopRequested(sessionId, activeSession)) {
        return;
      }
      const trimmed = line.trim();
      if (!trimmed) return;
      let payload = null;
      try {
        payload = JSON.parse(trimmed);
      } catch {
        return;
      }
      const messageType = String(payload.type ?? "");
      if (messageType === "sdk_event" && payload.event) {
        this.handleClaudeEvent(sessionId, payload.event);
        return;
      }
      if (messageType === "host_tool_request") {
        const reqId = String(payload.requestId ?? "");
        if (!reqId) return;
        const result = this.handleHostToolExecution(payload);
        this.writeSandboxHostToolResponse(activeSession, paths.responsesDir, reqId, {
          type: "host_tool_response",
          requestId: reqId,
          success: result.success,
          text: result.text,
          error: result.success ? void 0 : result.text
        });
        return;
      }
      if (messageType === "permission_request") {
        const reqId = String(payload.requestId ?? "");
        if (!reqId) return;
        const toolName = String(payload.toolName ?? "AskUserQuestion");
        const toolInputRaw = payload.toolInput;
        const toolInput = toolInputRaw && typeof toolInputRaw === "object" ? toolInputRaw : {};
        const responsePath = path$7.join(paths.responsesDir, `${reqId}.json`);
        this.sandboxPermissions.set(reqId, { sessionId, responsePath });
        const request = {
          requestId: reqId,
          toolName,
          toolInput: this.sanitizeToolPayload(toolInput)
        };
        activeSession.pendingPermission = request;
        this.emit("permissionRequest", sessionId, request);
      }
    };
    const streamPromise = this.readSandboxStream(streamPath, handleLine, streamAbort.signal);
    if (this.isSessionStopRequested(sessionId, activeSession)) {
      streamAbort.abort();
      return;
    }
    activeSession.ipcBridge.sendRequest(requestId, input);
    console.log(`Sandbox continuation request ${requestId} sent via virtio-serial bridge`);
    try {
      await new Promise((resolve, reject) => {
        activeSession.sandboxTurnResolve = (result) => {
          activeSession.sandboxTurnResolve = void 0;
          if (result.status === "ok") {
            resolve();
          } else {
            reject(new Error(result.message));
          }
        };
        const onClose = (code) => {
          if (!activeSession.sandboxTurnResolve) return;
          activeSession.sandboxTurnResolve = void 0;
          activeSession.sandboxProcess = void 0;
          activeSession.sandboxIpcDir = void 0;
          if (activeSession.ipcBridge) {
            try {
              activeSession.ipcBridge.close();
            } catch {
            }
            activeSession.ipcBridge = void 0;
          }
          if (this.isSessionStopRequested(sessionId, activeSession)) {
            this.store.updateSession(sessionId, { status: "idle" });
            resolve();
            return;
          }
          this.finalizeStreamingContent(activeSession);
          if (code !== 0) {
            reject(new Error(`Sandbox VM exited with code ${code}`));
            return;
          }
          resolve();
        };
        activeSession.sandboxProcess.on("close", onClose);
        if (this.isSessionStopRequested(sessionId, activeSession)) {
          activeSession.sandboxTurnResolve = void 0;
          resolve();
        }
      });
    } finally {
      streamAbort.abort();
      if (streamPromise) {
        try {
          await streamPromise;
        } catch {
        }
      }
      this.clearSandboxPermissions(sessionId);
      this.clearPendingPermissions(sessionId);
      activeSession.pendingPermission = null;
    }
  }
  resolveAutoRoutingForSandbox(systemPrompt, options = {}) {
    var _a3;
    const guestSkillsRoot = (_a3 = options.guestSkillsRoot) == null ? void 0 : _a3.trim();
    const { prompt: rewrittenPrompt, hasRewrite } = this.rewriteSkillReferencesForSandbox(systemPrompt, options);
    if (!rewrittenPrompt.includes("<available_skills>")) {
      if (hasRewrite && guestSkillsRoot && !rewrittenPrompt.includes("Sandbox path note: Skills are mounted at")) {
        return [`Sandbox path note: Skills are mounted at \`${guestSkillsRoot}\`.`, rewrittenPrompt].join("\n\n");
      }
      return rewrittenPrompt;
    }
    const skillBlockRe = /<available_skills>([\s\S]*?)<\/available_skills>/;
    const match = rewrittenPrompt.match(skillBlockRe);
    if (!match) return rewrittenPrompt;
    if (guestSkillsRoot) {
      let hasLocationRewrite = false;
      const rewritten = rewrittenPrompt.replace(/<location>(.*?)<\/location>/g, (_fullMatch, rawLocation) => {
        const mapped = this.rewriteSkillLocationForSandbox(rawLocation, options);
        if (!mapped) {
          return `<location>${rawLocation}</location>`;
        }
        hasLocationRewrite = true;
        return `<location>${mapped}</location>`;
      });
      if (hasLocationRewrite) {
        const sandboxPathNote2 = `Sandbox path note: Skills are mounted at \`${guestSkillsRoot}\`.`;
        if (rewritten.includes(sandboxPathNote2)) {
          return rewritten;
        }
        return rewritten.replace("## Skills (mandatory)", `## Skills (mandatory)
${sandboxPathNote2}`);
      }
    }
    const locationRe = /<location>(.*?)<\/location>/g;
    const skillContents = [];
    let locMatch;
    while ((locMatch = locationRe.exec(match[1])) !== null) {
      const skillPath = locMatch[1].trim();
      try {
        const resolvedSkillPath = resolveSkillPathFromRoots(skillPath, options.hostSkillsRoots ?? []);
        if (resolvedSkillPath && fs$a.existsSync(resolvedSkillPath)) {
          const content = fs$a.readFileSync(resolvedSkillPath, "utf8").trim();
          let rewrittenContent = this.rewriteSkillPathsForSandbox(content, resolvedSkillPath, options);
          const nameRe = new RegExp(`<name>(.*?)</name>[\\s\\S]*?<location>${skillPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</location>`);
          const nameMatch = match[1].match(nameRe);
          const skillId = path$7.basename(path$7.dirname(resolvedSkillPath));
          const name = (nameMatch == null ? void 0 : nameMatch[1]) || skillId;
          const sandboxSkillLocation = this.rewriteSkillLocationForSandbox(resolvedSkillPath, options);
          const sandboxSkillDir = sandboxSkillLocation ? path$7.posix.dirname(sandboxSkillLocation.replace(/\\/g, "/")) : guestSkillsRoot ? `${guestSkillsRoot}/${skillId}`.replace(/\/+/g, "/") : null;
          if (sandboxSkillDir) {
            rewrittenContent = rewrittenContent.replace(/\]\((?!https?:\/\/|#|\/)(\.\/)?([^)]+)\)/g, `](${sandboxSkillDir}/$2)`);
            skillContents.push(
              `## ${name}

> **Skill files directory**: \`${sandboxSkillDir}/\`
> When this skill references relative file paths or scripts, resolve them under \`${sandboxSkillDir}/\`.

${rewrittenContent}`
            );
          } else {
            skillContents.push(`## ${name}

${rewrittenContent}`);
          }
        } else {
          coworkLog("WARN", "resolveAutoRouting", `Skill file not found on host: ${skillPath}`, {
            hostSkillsRoots: (options.hostSkillsRoots ?? []).join(", ")
          });
        }
      } catch (error) {
        coworkLog("ERROR", "resolveAutoRouting", `Failed to read skill file for sandbox: ${skillPath}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    if (skillContents.length === 0) {
      coworkLog("WARN", "resolveAutoRouting", "No skill contents resolved, removing auto-routing section");
      const sectionRe2 = /## Skills \(mandatory\)[\s\S]*?<\/available_skills>/;
      return rewrittenPrompt.replace(sectionRe2, "").trim();
    }
    coworkLog("INFO", "resolveAutoRouting", `Resolved ${skillContents.length} skills for sandbox`);
    const sandboxPathNote = guestSkillsRoot ? `Sandbox path note: Skills are mounted at \`${guestSkillsRoot}\`. If a skill mentions \`/home/ubuntu/skills\`, \`/mnt/skills\`, \`/tmp/workspace/skills\`, or \`skills/...\`, rewrite it to \`${guestSkillsRoot}/...\`.` : "Sandbox path note: Prefer workspace-relative paths when skill instructions mention local files.";
    let fullContent = `# Available Skills

${sandboxPathNote}

Follow the instructions in each applicable skill section below:

${skillContents.join("\n\n---\n\n")}`;
    fullContent = fullContent.replace(/127\.0\.0\.1/g, "10.0.2.2").replace(/localhost(?=[:\/])/gi, "10.0.2.2");
    const sectionRe = /## Skills \(mandatory\)[\s\S]*?<\/available_skills>/;
    return rewrittenPrompt.replace(sectionRe, fullContent).trim();
  }
  enforceSandboxWorkspacePrompt(systemPrompt, guestWorkspaceRoot) {
    const normalizedGuestRoot = guestWorkspaceRoot.replace(/\\/g, "/").replace(/\/+$/, "") || "/workspace/project";
    let rewritten = systemPrompt.replace(/(^\s*-\s*Selected workspace root:\s*).+$/m, `$1${normalizedGuestRoot}`).replace(/(^\s*-\s*Current working directory:\s*).+$/m, `$1${normalizedGuestRoot}`);
    const sandboxPathRule = [
      "## Sandbox Path Rule (Highest Priority)",
      `- You are running inside a Linux sandbox VM. Use only sandbox paths under \`${normalizedGuestRoot}\` in tool inputs.`,
      `- If a host path appears (for example \`/Users/...\` or \`C:\\\\...\`), map it to \`${normalizedGuestRoot}\` before calling tools.`
    ].join("\n");
    if (!rewritten.includes("## Sandbox Path Rule (Highest Priority)")) {
      rewritten = [sandboxPathRule, rewritten].filter(Boolean).join("\n\n");
    }
    return rewritten;
  }
  resolveAssistantEventError(payload) {
    var _a3;
    const directError = this.normalizeSdkError(payload.error);
    if (directError) {
      return directError;
    }
    if (typeof payload.error !== "string" || payload.error.trim().toLowerCase() !== "unknown") {
      return null;
    }
    const messagePayload = payload.message;
    if (!messagePayload || typeof messagePayload !== "object") {
      return null;
    }
    const content = messagePayload.content;
    const inferredError = (_a3 = this.extractText(content)) == null ? void 0 : _a3.trim();
    if (!inferredError) {
      return null;
    }
    return inferredError;
  }
  normalizeSdkError(value) {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.toLowerCase() === "unknown") {
      return null;
    }
    return trimmed;
  }
  handleClaudeEvent(sessionId, event) {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) return;
    if (this.isSessionStopRequested(sessionId, activeSession)) {
      return;
    }
    const markAssistantTextOutput = () => {
      activeSession.hasAssistantTextOutput = true;
    };
    const markAssistantThinkingOutput = () => {
      activeSession.hasAssistantThinkingOutput = true;
    };
    if (typeof event === "string") {
      const message = this.store.addMessage(sessionId, {
        type: "assistant",
        content: event
      });
      markAssistantTextOutput();
      this.emit("message", sessionId, message);
      return;
    }
    if (!event || typeof event !== "object") {
      return;
    }
    const payload = event;
    const eventType = String(payload.type ?? "");
    if (eventType === "stream_event") {
      this.handleStreamEvent(sessionId, activeSession, payload);
      return;
    }
    if (eventType === "system") {
      const subtype = String(payload.subtype ?? "");
      if (subtype === "init" && typeof payload.session_id === "string") {
        activeSession.claudeSessionId = payload.session_id;
        this.store.updateSession(sessionId, { claudeSessionId: payload.session_id });
      }
      return;
    }
    if (eventType === "auth_status") {
      const authError = this.normalizeSdkError(payload.error);
      if (authError) {
        this.handleError(sessionId, authError);
      }
      return;
    }
    if (eventType === "result") {
      const usage = payload.usage ?? (payload.result && typeof payload.result === "object" ? payload.result.usage : void 0);
      if (usage) {
        coworkLog("INFO", "tokenUsage", "Turn token usage", {
          sessionId,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheReadInputTokens: usage.cache_read_input_tokens,
          cacheCreationInputTokens: usage.cache_creation_input_tokens
        });
      }
      const subtype = String(payload.subtype ?? "success");
      if (subtype !== "success") {
        const errors = Array.isArray(payload.errors) ? payload.errors.filter((error) => typeof error === "string").map((error) => error.trim()).filter((error) => error && error.toLowerCase() !== "unknown") : [];
        const payloadError = this.normalizeSdkError(payload.error);
        const errorMessage = errors.length > 0 ? errors.join("\n") : payloadError ? payloadError : "Claude run failed";
        this.handleError(sessionId, errorMessage);
        return;
      }
      if (typeof payload.result === "string" && payload.result.trim()) {
        this.persistFinalResult(sessionId, activeSession, payload.result);
        markAssistantTextOutput();
      }
      if (activeSession.executionMode === "sandbox") {
        this.finalizeStreamingContent(activeSession);
        const session = this.store.getSession(sessionId);
        if ((session == null ? void 0 : session.status) !== "error" && (session == null ? void 0 : session.status) !== "completed") {
          this.store.updateSession(sessionId, { status: "completed" });
          this.applyTurnMemoryUpdatesForSession(sessionId);
          this.emit("complete", sessionId, activeSession.claudeSessionId);
        }
        if (activeSession.sandboxTurnResolve) {
          const resolve = activeSession.sandboxTurnResolve;
          activeSession.sandboxTurnResolve = void 0;
          resolve({ status: "ok" });
        }
      }
      return;
    }
    if (eventType === "user") {
      const messagePayload2 = payload.message;
      if (!messagePayload2 || typeof messagePayload2 !== "object") {
        return;
      }
      const contentBlocks2 = messagePayload2.content;
      const blocks = Array.isArray(contentBlocks2) ? contentBlocks2 : contentBlocks2 && typeof contentBlocks2 === "object" ? [contentBlocks2] : [];
      for (const block of blocks) {
        if (!block || typeof block !== "object") continue;
        const record = block;
        const blockType = String(record.type ?? "");
        if (blockType !== "tool_result") continue;
        const content = this.formatToolResultContent(record);
        const isError = Boolean(record.is_error);
        const message = this.store.addMessage(sessionId, {
          type: "tool_result",
          content,
          metadata: {
            toolResult: content,
            toolUseId: typeof record.tool_use_id === "string" ? record.tool_use_id : null,
            error: isError ? content || "Tool execution failed" : void 0,
            isError
          }
        });
        this.emit("message", sessionId, message);
      }
      return;
    }
    if (eventType !== "assistant") {
      return;
    }
    const assistantEventError = this.resolveAssistantEventError(payload);
    if (assistantEventError) {
      this.handleError(sessionId, assistantEventError);
    }
    const hasStreamedText = activeSession.hasAssistantTextOutput;
    const hasStreamedThinking = activeSession.hasAssistantThinkingOutput;
    const hadPendingTextStreaming = activeSession.currentStreamingMessageId !== null || activeSession.currentStreamingContent !== "";
    const hadPendingThinkingStreaming = activeSession.currentStreamingThinkingMessageId !== null || activeSession.currentStreamingThinking !== "";
    if (hadPendingTextStreaming || hadPendingThinkingStreaming) {
      this.finalizeStreamingContent(activeSession);
    }
    const messagePayload = payload.message;
    if (!messagePayload || typeof messagePayload !== "object") {
      if (hasStreamedText || hadPendingTextStreaming) return;
      const content = this.extractText(messagePayload);
      if (content) {
        const message = this.store.addMessage(sessionId, {
          type: "assistant",
          content
        });
        markAssistantTextOutput();
        this.emit("message", sessionId, message);
      }
      return;
    }
    const contentBlocks = messagePayload.content;
    if (!Array.isArray(contentBlocks)) {
      if (hasStreamedText || hadPendingTextStreaming) return;
      const content = this.extractText(contentBlocks ?? messagePayload);
      if (!content) return;
      const message = this.store.addMessage(sessionId, {
        type: "assistant",
        content
      });
      markAssistantTextOutput();
      this.emit("message", sessionId, message);
      return;
    }
    const textParts = [];
    const flushTextParts = () => {
      if (hasStreamedText || hadPendingTextStreaming || textParts.length === 0) return;
      const message = this.store.addMessage(sessionId, {
        type: "assistant",
        content: textParts.join("")
      });
      markAssistantTextOutput();
      this.emit("message", sessionId, message);
      textParts.length = 0;
    };
    for (const block of contentBlocks) {
      if (typeof block === "string") {
        textParts.push(block);
        continue;
      }
      if (!block || typeof block !== "object") continue;
      const record = block;
      const blockType = String(record.type ?? "");
      if (blockType === "thinking" && typeof record.thinking === "string" && record.thinking.trim()) {
        if (hasStreamedThinking || hadPendingThinkingStreaming) {
          continue;
        }
        flushTextParts();
        const message = this.store.addMessage(sessionId, {
          type: "assistant",
          content: record.thinking,
          metadata: { isThinking: true }
        });
        markAssistantThinkingOutput();
        this.emit("message", sessionId, message);
        continue;
      }
      if (blockType === "text" && typeof record.text === "string") {
        textParts.push(record.text);
        continue;
      }
      if (blockType === "tool_use") {
        flushTextParts();
        const toolName = String(record.name ?? "unknown");
        const toolInputRaw = record.input ?? {};
        const toolInput = toolInputRaw && typeof toolInputRaw === "object" ? toolInputRaw : { value: toolInputRaw };
        const toolUseId = typeof record.id === "string" ? record.id : null;
        const message = this.store.addMessage(sessionId, {
          type: "tool_use",
          content: `Using tool: ${toolName}`,
          metadata: {
            toolName,
            toolInput: this.sanitizeToolPayload(toolInput),
            toolUseId
          }
        });
        this.emit("message", sessionId, message);
        continue;
      }
      if (blockType === "tool_result") {
        flushTextParts();
        const content = this.formatToolResultContent(record);
        const isError = Boolean(record.is_error);
        const message = this.store.addMessage(sessionId, {
          type: "tool_result",
          content,
          metadata: {
            toolResult: content,
            toolUseId: typeof record.tool_use_id === "string" ? record.tool_use_id : null,
            error: isError ? content || "Tool execution failed" : void 0,
            isError
          }
        });
        this.emit("message", sessionId, message);
      }
    }
    flushTextParts();
  }
  handleStreamEvent(sessionId, activeSession, payload) {
    const event = payload.event;
    if (!event || typeof event !== "object") return;
    const eventType = String(event.type ?? "");
    if (eventType === "content_block_start") {
      const contentBlock = event.content_block;
      if (!contentBlock) return;
      const blockType = String(contentBlock.type ?? "");
      if (blockType === "thinking") {
        const initialThinkingRaw = typeof contentBlock.thinking === "string" ? contentBlock.thinking : "";
        const initialThinking = this.truncateLargeContent(initialThinkingRaw, STREAMING_THINKING_MAX_CHARS);
        activeSession.currentStreamingThinking = initialThinking;
        activeSession.currentStreamingThinkingTruncated = initialThinking.length < initialThinkingRaw.length;
        activeSession.lastStreamingThinkingUpdateAt = 0;
        activeSession.currentStreamingBlockType = "thinking";
        if (initialThinking.length > 0) {
          const message = this.store.addMessage(sessionId, {
            type: "assistant",
            content: initialThinking,
            metadata: { isThinking: true, isStreaming: true }
          });
          activeSession.hasAssistantThinkingOutput = true;
          activeSession.currentStreamingThinkingMessageId = message.id;
          this.emit("message", sessionId, message);
        } else {
          activeSession.currentStreamingThinkingMessageId = null;
        }
      } else if (blockType === "text") {
        const initialTextRaw = typeof contentBlock.text === "string" ? contentBlock.text : "";
        const initialText = this.truncateLargeContent(initialTextRaw, STREAMING_TEXT_MAX_CHARS);
        activeSession.currentStreamingContent = initialText;
        activeSession.currentStreamingTextTruncated = initialText.length < initialTextRaw.length;
        activeSession.lastStreamingTextUpdateAt = 0;
        activeSession.currentStreamingBlockType = "text";
        if (initialText.length > 0) {
          const message = this.store.addMessage(sessionId, {
            type: "assistant",
            content: initialText,
            metadata: { isStreaming: true }
          });
          activeSession.hasAssistantTextOutput = true;
          activeSession.currentStreamingMessageId = message.id;
          this.emit("message", sessionId, message);
        } else {
          activeSession.currentStreamingMessageId = null;
        }
      }
      return;
    }
    if (eventType === "content_block_delta") {
      const delta = event.delta;
      if (!delta) return;
      const deltaType = String(delta.type ?? "");
      if (deltaType === "thinking_delta" && typeof delta.thinking === "string") {
        if (delta.thinking.length === 0) return;
        const next = this.appendStreamingDelta(
          activeSession.currentStreamingThinking,
          delta.thinking,
          STREAMING_THINKING_MAX_CHARS,
          activeSession.currentStreamingThinkingTruncated
        );
        activeSession.currentStreamingThinking = next.content;
        activeSession.currentStreamingThinkingTruncated = next.truncated;
        activeSession.hasAssistantThinkingOutput = true;
        if (activeSession.currentStreamingThinkingMessageId) {
          if (!next.changed) {
            return;
          }
          const streamTick = this.shouldEmitStreamingUpdate(activeSession.lastStreamingThinkingUpdateAt);
          if (streamTick.emit) {
            activeSession.lastStreamingThinkingUpdateAt = streamTick.now;
            this.emit("messageUpdate", sessionId, activeSession.currentStreamingThinkingMessageId, activeSession.currentStreamingThinking);
          }
        } else {
          const message = this.store.addMessage(sessionId, {
            type: "assistant",
            content: activeSession.currentStreamingThinking,
            metadata: { isThinking: true, isStreaming: true }
          });
          activeSession.currentStreamingThinkingMessageId = message.id;
          activeSession.lastStreamingThinkingUpdateAt = Date.now();
          this.emit("message", sessionId, message);
        }
        return;
      }
      if (deltaType === "text_delta" && typeof delta.text === "string") {
        if (delta.text.length === 0) return;
        const next = this.appendStreamingDelta(
          activeSession.currentStreamingContent,
          delta.text,
          STREAMING_TEXT_MAX_CHARS,
          activeSession.currentStreamingTextTruncated
        );
        activeSession.currentStreamingContent = next.content;
        activeSession.currentStreamingTextTruncated = next.truncated;
        if (activeSession.currentStreamingMessageId) {
          activeSession.hasAssistantTextOutput = true;
          if (!next.changed) {
            return;
          }
          const streamTick = this.shouldEmitStreamingUpdate(activeSession.lastStreamingTextUpdateAt);
          if (streamTick.emit) {
            activeSession.lastStreamingTextUpdateAt = streamTick.now;
            this.emit("messageUpdate", sessionId, activeSession.currentStreamingMessageId, activeSession.currentStreamingContent);
          }
        } else {
          const message = this.store.addMessage(sessionId, {
            type: "assistant",
            content: activeSession.currentStreamingContent,
            metadata: { isStreaming: true }
          });
          activeSession.hasAssistantTextOutput = true;
          activeSession.currentStreamingMessageId = message.id;
          activeSession.lastStreamingTextUpdateAt = Date.now();
          this.emit("message", sessionId, message);
        }
      }
      return;
    }
    if (eventType === "content_block_stop") {
      const blockType = activeSession.currentStreamingBlockType;
      if (blockType === "thinking") {
        if (activeSession.currentStreamingThinkingMessageId && activeSession.currentStreamingThinking) {
          this.updateMessageMerged(sessionId, activeSession.currentStreamingThinkingMessageId, {
            content: activeSession.currentStreamingThinking,
            metadata: { isStreaming: false }
          });
          this.emit("messageUpdate", sessionId, activeSession.currentStreamingThinkingMessageId, activeSession.currentStreamingThinking);
        }
        activeSession.currentStreamingThinkingMessageId = null;
        activeSession.currentStreamingThinking = "";
        activeSession.currentStreamingThinkingTruncated = false;
        activeSession.lastStreamingThinkingUpdateAt = 0;
      } else {
        if (activeSession.currentStreamingMessageId && activeSession.currentStreamingContent) {
          this.updateMessageMerged(sessionId, activeSession.currentStreamingMessageId, {
            content: activeSession.currentStreamingContent,
            metadata: { isStreaming: false }
          });
          this.emit("messageUpdate", sessionId, activeSession.currentStreamingMessageId, activeSession.currentStreamingContent);
        }
        activeSession.currentStreamingMessageId = null;
        activeSession.currentStreamingContent = "";
        activeSession.currentStreamingTextTruncated = false;
        activeSession.lastStreamingTextUpdateAt = 0;
      }
      activeSession.currentStreamingBlockType = null;
      return;
    }
    if (eventType === "message_stop") {
      if (activeSession.currentStreamingThinkingMessageId && activeSession.currentStreamingThinking) {
        this.updateMessageMerged(sessionId, activeSession.currentStreamingThinkingMessageId, {
          content: activeSession.currentStreamingThinking,
          metadata: { isStreaming: false }
        });
        this.emit("messageUpdate", sessionId, activeSession.currentStreamingThinkingMessageId, activeSession.currentStreamingThinking);
      }
      activeSession.currentStreamingThinkingMessageId = null;
      activeSession.currentStreamingThinking = "";
      activeSession.currentStreamingThinkingTruncated = false;
      activeSession.lastStreamingThinkingUpdateAt = 0;
      if (activeSession.currentStreamingMessageId && activeSession.currentStreamingContent) {
        this.updateMessageMerged(sessionId, activeSession.currentStreamingMessageId, {
          content: activeSession.currentStreamingContent,
          metadata: { isStreaming: false }
        });
        this.emit("messageUpdate", sessionId, activeSession.currentStreamingMessageId, activeSession.currentStreamingContent);
      }
      activeSession.currentStreamingMessageId = null;
      activeSession.currentStreamingContent = "";
      activeSession.currentStreamingTextTruncated = false;
      activeSession.lastStreamingTextUpdateAt = 0;
      activeSession.currentStreamingBlockType = null;
      return;
    }
  }
  finalizeStreamingContent(activeSession) {
    const { sessionId } = activeSession;
    if (activeSession.currentStreamingThinkingMessageId) {
      this.updateMessageMerged(sessionId, activeSession.currentStreamingThinkingMessageId, {
        content: activeSession.currentStreamingThinking,
        metadata: { isStreaming: false }
      });
      this.emit("messageUpdate", sessionId, activeSession.currentStreamingThinkingMessageId, activeSession.currentStreamingThinking);
    }
    activeSession.currentStreamingThinkingMessageId = null;
    activeSession.currentStreamingThinking = "";
    activeSession.currentStreamingThinkingTruncated = false;
    activeSession.lastStreamingThinkingUpdateAt = 0;
    const { currentStreamingMessageId, currentStreamingContent } = activeSession;
    if (currentStreamingMessageId) {
      this.updateMessageMerged(sessionId, currentStreamingMessageId, {
        content: currentStreamingContent,
        metadata: { isStreaming: false }
      });
      this.emit("messageUpdate", sessionId, currentStreamingMessageId, currentStreamingContent);
    }
    activeSession.currentStreamingMessageId = null;
    activeSession.currentStreamingContent = "";
    activeSession.currentStreamingTextTruncated = false;
    activeSession.lastStreamingTextUpdateAt = 0;
    activeSession.currentStreamingBlockType = null;
  }
  waitForPermissionResponse(sessionId, requestId, signal) {
    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;
      const abortHandler = () => finalize2({ behavior: "deny", message: "Session aborted" });
      const finalize2 = (result) => {
        if (settled) return;
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (signal) {
          signal.removeEventListener("abort", abortHandler);
        }
        this.pendingPermissions.delete(requestId);
        resolve(result);
      };
      this.pendingPermissions.set(requestId, {
        sessionId,
        resolve: finalize2
      });
      timeoutId = setTimeout(() => {
        finalize2({
          behavior: "deny",
          message: "Permission request timed out after 60s"
        });
      }, PERMISSION_RESPONSE_TIMEOUT_MS);
      if (signal) {
        signal.addEventListener("abort", abortHandler, { once: true });
      }
    });
  }
  clearPendingPermissions(sessionId) {
    for (const [requestId, pending] of this.pendingPermissions.entries()) {
      if (pending.sessionId === sessionId) {
        pending.resolve({ behavior: "deny", message: "Session aborted" });
        this.pendingPermissions.delete(requestId);
      }
    }
  }
  clearSandboxPermissions(sessionId) {
    for (const [requestId, pending] of this.sandboxPermissions.entries()) {
      if (pending.sessionId === sessionId) {
        this.sandboxPermissions.delete(requestId);
      }
    }
  }
  async waitForVmReady(ipcDir, childProcess2, timeout = 6e4, options) {
    const heartbeatPath = path$7.join(ipcDir, "heartbeat");
    const serialLogPath = path$7.join(ipcDir, "serial.log");
    const start = Date.now();
    const pollInterval = 100;
    let heartbeatSeen = false;
    const maxTimeoutOverride = Number.parseInt(process.env.COWORK_SANDBOX_VM_READY_MAX_TIMEOUT_MS ?? "", 10);
    const defaultMaxTimeout = (options == null ? void 0 : options.platform) === "win32" ? Math.max(timeout, (options == null ? void 0 : options.accelMode) === "tcg" ? 9e5 : 42e4) : timeout;
    const maxTimeoutMs = Number.isFinite(maxTimeoutOverride) && maxTimeoutOverride > timeout ? maxTimeoutOverride : defaultMaxTimeout;
    const shouldAutoExtend = (options == null ? void 0 : options.platform) === "win32" && maxTimeoutMs > timeout;
    const extensionStepMs = 6e4;
    const serialActivityWindowMs = 2e4;
    let currentTimeoutMs = timeout;
    let timeoutExtensionCount = 0;
    let lastSerialActivityAt = 0;
    let lastSerialSize = -1;
    let lastSerialMtimeMs = -1;
    let processExited = false;
    let processExitCode = null;
    childProcess2.on("close", (code) => {
      processExited = true;
      processExitCode = code;
    });
    while (true) {
      while (Date.now() - start < currentTimeoutMs) {
        if (processExited) {
          console.error(`Sandbox VM process exited prematurely (exit code: ${processExitCode})`);
          return false;
        }
        if (shouldAutoExtend) {
          try {
            const serialStat = fs$a.statSync(serialLogPath);
            if (serialStat.size !== lastSerialSize || serialStat.mtimeMs !== lastSerialMtimeMs) {
              lastSerialSize = serialStat.size;
              lastSerialMtimeMs = serialStat.mtimeMs;
              lastSerialActivityAt = Date.now();
            }
          } catch {
          }
        }
        try {
          if (fs$a.existsSync(heartbeatPath)) {
            const content = fs$a.readFileSync(heartbeatPath, "utf8");
            const data = JSON.parse(content);
            const timestamp2 = typeof data.timestamp === "number" ? data.timestamp : Number.parseInt(String(data.timestamp ?? ""), 10);
            if (Number.isFinite(timestamp2) && Date.now() - timestamp2 < 1e4 && data.ipcMounted !== false) {
              const elapsed = Date.now() - start;
              console.log(`VM is ready, heartbeat received after ${elapsed}ms`);
              return true;
            }
            if (!heartbeatSeen) {
              heartbeatSeen = true;
              const clockDelta = Number.isFinite(timestamp2) ? Date.now() - timestamp2 : null;
              coworkLog("INFO", "waitForVmReady", "Heartbeat found but not yet valid", {
                timestamp: Number.isFinite(timestamp2) ? timestamp2 : null,
                ipcMounted: data.ipcMounted ?? null,
                clockDelta,
                elapsed: Date.now() - start
              });
            }
          }
        } catch {
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
      if (processExited) {
        console.error(`Sandbox VM process exited prematurely (exit code: ${processExitCode})`);
        return false;
      }
      if (shouldAutoExtend && lastSerialActivityAt > 0) {
        const elapsed = Date.now() - start;
        const serialIdleMs = Date.now() - lastSerialActivityAt;
        const hasRecentBootActivity = serialIdleMs <= serialActivityWindowMs;
        if (hasRecentBootActivity && elapsed < maxTimeoutMs) {
          const nextTimeoutMs = Math.min(currentTimeoutMs + extensionStepMs, maxTimeoutMs);
          if (nextTimeoutMs > currentTimeoutMs) {
            timeoutExtensionCount += 1;
            currentTimeoutMs = nextTimeoutMs;
            coworkLog("INFO", "waitForVmReady", "Extending VM ready timeout due to active serial boot output", {
              extensionCount: timeoutExtensionCount,
              currentTimeoutMs,
              maxTimeoutMs,
              elapsed,
              serialIdleMs
            });
            continue;
          }
        }
      }
      break;
    }
    try {
      if (fs$a.existsSync(heartbeatPath)) {
        const content = fs$a.readFileSync(heartbeatPath, "utf8");
        coworkLog("WARN", "waitForVmReady", "Timeout reached with heartbeat file present", {
          heartbeatContent: content.slice(0, 500),
          elapsed: Date.now() - start,
          timeoutMs: currentTimeoutMs,
          timeoutExtensionCount
        });
      } else {
        coworkLog("WARN", "waitForVmReady", "Timeout reached with no heartbeat file", {
          elapsed: Date.now() - start,
          timeoutMs: currentTimeoutMs,
          timeoutExtensionCount,
          serialLogExists: fs$a.existsSync(serialLogPath),
          lastSerialActivityAgoMs: lastSerialActivityAt > 0 ? Date.now() - lastSerialActivityAt : null
        });
      }
    } catch {
    }
    console.error("VM failed to become ready within timeout");
    return false;
  }
  async readSandboxStream(streamPath, onLine, signal) {
    const sleep = (ms2) => new Promise((resolve) => setTimeout(resolve, ms2));
    let fileHandle = null;
    let position = 0;
    let buffer = "";
    const decoder = new string_decoder.StringDecoder("utf8");
    try {
      while (!signal.aborted) {
        if (!fileHandle) {
          if (!fs$a.existsSync(streamPath)) {
            await sleep(50);
            continue;
          }
          fileHandle = await fs$a.promises.open(streamPath, "r");
          position = 0;
          buffer = "";
        }
        const stat = await fileHandle.stat();
        if (stat.size > position) {
          const length = stat.size - position;
          const chunk = Buffer.alloc(length);
          const result = await fileHandle.read(chunk, 0, length, position);
          position += result.bytesRead;
          buffer += decoder.write(chunk.subarray(0, result.bytesRead));
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.trim()) {
              onLine(line);
            }
            newlineIndex = buffer.indexOf("\n");
          }
        } else {
          await sleep(50);
        }
      }
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
      buffer += decoder.end();
      if (buffer.trim()) {
        onLine(buffer);
      }
    }
  }
  addSystemMessage(sessionId, content) {
    const session = this.store.getSession(sessionId);
    const lastMessage = session == null ? void 0 : session.messages[session.messages.length - 1];
    if ((lastMessage == null ? void 0 : lastMessage.type) === "system" && lastMessage.content.trim() === content.trim()) {
      return;
    }
    const message = this.store.addMessage(sessionId, {
      type: "system",
      content
    });
    this.emit("message", sessionId, message);
  }
  findAttachmentsOutsideCwd(prompt, cwd) {
    const attachments = this.parseAttachmentEntries(prompt);
    if (attachments.length === 0) {
      return [];
    }
    const resolvedCwd = path$7.resolve(cwd);
    const outside = [];
    for (const attachment of attachments) {
      const resolvedPath = this.resolveAttachmentPath(attachment.rawPath, resolvedCwd);
      const relative = path$7.relative(resolvedCwd, resolvedPath);
      if (relative.startsWith("..") || path$7.isAbsolute(relative)) {
        outside.push(attachment.rawPath);
      }
    }
    return outside;
  }
  getMessageById(sessionId, messageId) {
    const session = this.store.getSession(sessionId);
    return session == null ? void 0 : session.messages.find((message) => message.id === messageId);
  }
  updateMessageMerged(sessionId, messageId, updates) {
    const existing = this.getMessageById(sessionId, messageId);
    const mergedMetadata = updates.metadata ? { ...(existing == null ? void 0 : existing.metadata) ?? {}, ...updates.metadata } : void 0;
    this.store.updateMessage(sessionId, messageId, {
      content: updates.content,
      metadata: mergedMetadata
    });
  }
  persistFinalResult(sessionId, activeSession, resultText) {
    var _a3, _b, _c;
    const safeResultText = this.truncateLargeContent(resultText, FINAL_RESULT_MAX_CHARS);
    const trimmed = safeResultText.trim();
    if (!trimmed) return;
    if (activeSession.currentStreamingMessageId) {
      const finalContent = activeSession.currentStreamingContent.trim() ? activeSession.currentStreamingContent : safeResultText;
      this.updateMessageMerged(sessionId, activeSession.currentStreamingMessageId, {
        content: finalContent,
        metadata: { isFinal: true, isStreaming: false }
      });
      this.emit("messageUpdate", sessionId, activeSession.currentStreamingMessageId, finalContent);
      activeSession.currentStreamingMessageId = null;
      activeSession.currentStreamingContent = "";
      return;
    }
    if (activeSession.hasAssistantTextOutput) {
      const session2 = this.store.getSession(sessionId);
      const lastAssistant2 = session2 == null ? void 0 : session2.messages.slice().reverse().find((message2) => message2.type === "assistant");
      if (lastAssistant2 && ((_a3 = lastAssistant2.content) == null ? void 0 : _a3.trim()) === trimmed) {
        this.updateMessageMerged(sessionId, lastAssistant2.id, {
          metadata: { isFinal: true, isStreaming: false }
        });
        return;
      }
    }
    const session = this.store.getSession(sessionId);
    const lastAssistant = session == null ? void 0 : session.messages.slice().reverse().find((message2) => message2.type === "assistant");
    const lastAssistantText = ((_b = lastAssistant == null ? void 0 : lastAssistant.content) == null ? void 0 : _b.trim()) ?? "";
    if (lastAssistant && (((_c = lastAssistant.metadata) == null ? void 0 : _c.isStreaming) || lastAssistantText.length === 0)) {
      this.updateMessageMerged(sessionId, lastAssistant.id, {
        content: safeResultText,
        metadata: { isFinal: true, isStreaming: false }
      });
      this.emit("messageUpdate", sessionId, lastAssistant.id, safeResultText);
      return;
    }
    if (lastAssistant && lastAssistantText === trimmed) {
      this.updateMessageMerged(sessionId, lastAssistant.id, {
        content: safeResultText,
        metadata: { isFinal: true, isStreaming: false }
      });
      this.emit("messageUpdate", sessionId, lastAssistant.id, safeResultText);
      return;
    }
    const message = this.store.addMessage(sessionId, {
      type: "assistant",
      content: safeResultText,
      metadata: { isFinal: true }
    });
    this.emit("message", sessionId, message);
  }
  extractText(value) {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      const parts = value.map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item;
          if (typeof record.text === "string") return record.text;
        }
        return "";
      }).filter(Boolean);
      return parts.length ? parts.join("") : null;
    }
    if (value && typeof value === "object") {
      const record = value;
      if (typeof record.text === "string") {
        return record.text;
      }
      if (record.content !== void 0) {
        return this.extractText(record.content);
      }
    }
    return null;
  }
  formatToolResultContent(record) {
    const raw = record.content ?? record;
    const text = this.extractText(raw);
    if (text !== null) {
      return this.truncateLargeContent(text, TOOL_RESULT_MAX_CHARS);
    }
    try {
      return this.truncateLargeContent(JSON.stringify(raw, null, 2), TOOL_RESULT_MAX_CHARS);
    } catch {
      return this.truncateLargeContent(String(raw), TOOL_RESULT_MAX_CHARS);
    }
  }
  handleError(sessionId, error) {
    if (this.stoppedSessions.has(sessionId)) {
      return;
    }
    coworkLog("ERROR", "CoworkRunner", `Session error: ${sessionId}`, { error });
    this.store.updateSession(sessionId, { status: "error" });
    const message = this.store.addMessage(sessionId, {
      type: "system",
      content: `Error: ${error}`,
      metadata: { error }
    });
    this.emit("message", sessionId, message);
    this.emit("error", sessionId, error);
  }
  isSessionActive(sessionId) {
    return this.activeSessions.has(sessionId);
  }
  getSessionConfirmationMode(sessionId) {
    var _a3;
    return ((_a3 = this.activeSessions.get(sessionId)) == null ? void 0 : _a3.confirmationMode) ?? null;
  }
  getActiveSessionIds() {
    return Array.from(this.activeSessions.keys());
  }
  stopAllSessions() {
    const sessionIds = this.getActiveSessionIds();
    for (const sessionId of sessionIds) {
      try {
        this.stopSession(sessionId);
      } catch (error) {
        console.error(`Failed to stop session ${sessionId}:`, error);
      }
    }
  }
}
require$$0$1.app.name = APP_NAME;
require$$0$1.app.setName(APP_NAME);
const INVALID_FILE_NAME_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/g;
const MIN_MEMORY_USER_MEMORIES_MAX_ITEMS = 1;
const MAX_MEMORY_USER_MEMORIES_MAX_ITEMS = 60;
const IPC_MESSAGE_CONTENT_MAX_CHARS = 12e4;
const IPC_UPDATE_CONTENT_MAX_CHARS = 12e4;
const IPC_STRING_MAX_CHARS = 4e3;
const IPC_MAX_DEPTH = 5;
const IPC_MAX_KEYS = 80;
const IPC_MAX_ITEMS = 40;
const MAX_INLINE_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MIME_EXTENSION_MAP = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "application/json": ".json",
  "text/csv": ".csv"
};
const isDev = process.env.NODE_ENV === "development";
process.platform === "linux";
const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || "http://localhost:5176";
const safeDecodeURIComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
const normalizeWindowsShellPath = (inputPath) => {
  if (!isWindows) return inputPath;
  const trimmed = inputPath.trim();
  if (!trimmed) return inputPath;
  let normalized = trimmed;
  if (/^file:\/\//i.test(normalized)) {
    normalized = safeDecodeURIComponent(normalized.replace(/^file:\/\//i, ""));
  }
  if (/^\/[A-Za-z]:/.test(normalized)) {
    normalized = normalized.slice(1);
  }
  const unixDriveMatch = normalized.match(/^[/\\]([A-Za-z])[/\\](.+)$/);
  if (unixDriveMatch) {
    const drive = unixDriveMatch[1].toUpperCase();
    const rest = unixDriveMatch[2].replace(/[/\\]+/g, "\\");
    return `${drive}:\\${rest}`;
  }
  if (/^[A-Za-z]:[/\\]/.test(normalized)) {
    const drive = normalized[0].toUpperCase();
    const rest = normalized.slice(1).replace(/\//g, "\\");
    return `${drive}${rest}`;
  }
  return normalized;
};
const padTwoDigits = (value) => value.toString().padStart(2, "0");
const buildLogExportFileName = () => {
  const now = /* @__PURE__ */ new Date();
  const datePart = `${now.getFullYear()}${padTwoDigits(now.getMonth() + 1)}${padTwoDigits(now.getDate())}`;
  const timePart = `${padTwoDigits(now.getHours())}${padTwoDigits(now.getMinutes())}${padTwoDigits(now.getSeconds())}`;
  return `lobsterai-logs-${datePart}-${timePart}.zip`;
};
const truncateIpcString = (value, maxChars) => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}
...[truncated in main IPC forwarding]`;
};
const sanitizeIpcPayload = (value, depth = 0, seen) => {
  const localSeen = seen ?? /* @__PURE__ */ new WeakSet();
  if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "undefined") {
    return value;
  }
  if (typeof value === "string") {
    return truncateIpcString(value, IPC_STRING_MAX_CHARS);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "function") {
    return "[function]";
  }
  if (depth >= IPC_MAX_DEPTH) {
    return "[truncated-depth]";
  }
  if (Array.isArray(value)) {
    const result = value.slice(0, IPC_MAX_ITEMS).map((entry) => sanitizeIpcPayload(entry, depth + 1, localSeen));
    if (value.length > IPC_MAX_ITEMS) {
      result.push(`[truncated-items:${value.length - IPC_MAX_ITEMS}]`);
    }
    return result;
  }
  if (typeof value === "object") {
    if (localSeen.has(value)) {
      return "[circular]";
    }
    localSeen.add(value);
    const entries = Object.entries(value);
    const result = {};
    for (const [key, entry] of entries.slice(0, IPC_MAX_KEYS)) {
      result[key] = sanitizeIpcPayload(entry, depth + 1, localSeen);
    }
    if (entries.length > IPC_MAX_KEYS) {
      result.__truncated_keys__ = entries.length - IPC_MAX_KEYS;
    }
    return result;
  }
  return String(value);
};
const sanitizeCoworkMessageForIpc = (message) => {
  if (!message || typeof message !== "object") {
    return message;
  }
  let sanitizedMetadata;
  if (message.metadata && typeof message.metadata === "object") {
    const { imageAttachments, ...rest } = message.metadata;
    const sanitizedRest = sanitizeIpcPayload(rest);
    sanitizedMetadata = {
      ...sanitizedRest && typeof sanitizedRest === "object" ? sanitizedRest : {},
      ...Array.isArray(imageAttachments) && imageAttachments.length > 0 ? { imageAttachments } : {}
    };
  } else {
    sanitizedMetadata = void 0;
  }
  return {
    ...message,
    content: typeof message.content === "string" ? truncateIpcString(message.content, IPC_MESSAGE_CONTENT_MAX_CHARS) : "",
    metadata: sanitizedMetadata
  };
};
const sanitizePermissionRequestForIpc = (request) => {
  if (!request || typeof request !== "object") {
    return request;
  }
  return {
    ...request,
    toolInput: sanitizeIpcPayload(request.toolInput ?? {})
  };
};
const normalizeCaptureRect = (rect) => {
  if (!rect) return null;
  const normalized = {
    x: Math.max(0, Math.round(typeof rect.x === "number" ? rect.x : 0)),
    y: Math.max(0, Math.round(typeof rect.y === "number" ? rect.y : 0)),
    width: Math.max(0, Math.round(typeof rect.width === "number" ? rect.width : 0)),
    height: Math.max(0, Math.round(typeof rect.height === "number" ? rect.height : 0))
  };
  return normalized.width > 0 && normalized.height > 0 ? normalized : null;
};
const resolveTaskWorkingDirectory = (workspaceRoot) => {
  const resolvedWorkspaceRoot = path$8.resolve(workspaceRoot);
  fs$b.mkdirSync(resolvedWorkspaceRoot, { recursive: true });
  if (!fs$b.statSync(resolvedWorkspaceRoot).isDirectory()) {
    throw new Error(`Selected workspace is not a directory: ${resolvedWorkspaceRoot}`);
  }
  return resolvedWorkspaceRoot;
};
const getDefaultExportImageName = (defaultFileName) => {
  const normalized = typeof defaultFileName === "string" && defaultFileName.trim() ? defaultFileName.trim() : `cowork-session-${Date.now()}`;
  return ensurePngFileName(sanitizeExportFileName(normalized));
};
const savePngWithDialog = async (webContents, pngData, defaultFileName) => {
  const defaultName = getDefaultExportImageName(defaultFileName);
  const ownerWindow = require$$0$1.BrowserWindow.fromWebContents(webContents);
  const saveOptions = {
    title: "Export Session Image",
    defaultPath: path$8.join(require$$0$1.app.getPath("downloads"), defaultName),
    filters: [{ name: "PNG Image", extensions: ["png"] }]
  };
  const saveResult = ownerWindow ? await require$$0$1.dialog.showSaveDialog(ownerWindow, saveOptions) : await require$$0$1.dialog.showSaveDialog(saveOptions);
  if (saveResult.canceled || !saveResult.filePath) {
    return { success: true, canceled: true };
  }
  const outputPath = ensurePngFileName(saveResult.filePath);
  await fs$b.promises.writeFile(outputPath, pngData);
  return { success: true, canceled: false, path: outputPath };
};
const ensurePngFileName = (value) => {
  return value.toLowerCase().endsWith(".png") ? value : `${value}.png`;
};
const ensureZipFileName = (value) => {
  return value.toLowerCase().endsWith(".zip") ? value : `${value}.zip`;
};
const resolveInlineAttachmentDir = (cwd) => {
  const trimmed = typeof cwd === "string" ? cwd.trim() : "";
  if (trimmed) {
    const resolved = path$8.resolve(trimmed);
    if (fs$b.existsSync(resolved) && fs$b.statSync(resolved).isDirectory()) {
      return path$8.join(resolved, ".cowork-temp", "attachments", "manual");
    }
  }
  return path$8.join(require$$0$1.app.getPath("temp"), "lobsterai", "attachments");
};
const sanitizeExportFileName = (value) => {
  const sanitized = value.replace(INVALID_FILE_NAME_PATTERN, " ").replace(/\s+/g, " ").trim();
  return sanitized || "cowork-session";
};
const sanitizeAttachmentFileName = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "attachment";
  const fileName = path$8.basename(raw);
  const sanitized = fileName.replace(INVALID_FILE_NAME_PATTERN, " ").replace(/\s+/g, " ").trim();
  return sanitized || "attachment";
};
const inferAttachmentExtension = (fileName, mimeType) => {
  const fromName = path$8.extname(fileName).toLowerCase();
  if (fromName) {
    return fromName;
  }
  if (typeof mimeType === "string") {
    const normalized = mimeType.toLowerCase().split(";")[0].trim();
    return MIME_EXTENSION_MAP[normalized] ?? "";
  }
  return "";
};
const PRELOAD_PATH = require$$0$1.app.isPackaged ? path$8.join(__dirname, "preload.js") : path$8.join(__dirname, "../dist-electron/preload.js");
const getAppIconPath = () => {
  if (process.platform !== "win32" && process.platform !== "linux") return void 0;
  const basePath = require$$0$1.app.isPackaged ? path$8.join(process.resourcesPath, "tray") : path$8.join(__dirname, "..", "resources", "tray");
  return process.platform === "win32" ? path$8.join(basePath, "tray-icon.ico") : path$8.join(basePath, "tray-icon.png");
};
let mainWindow = null;
const gotTheLock = isDev ? true : require$$0$1.app.requestSingleInstanceLock();
let store = null;
let coworkStore = null;
let coworkRunner = null;
let skillManager = null;
let mcpStore = null;
let storeInitPromise = null;
const initStore = async () => {
  if (!storeInitPromise) {
    if (!require$$0$1.app.isReady()) {
      throw new Error("Store accessed before app is ready.");
    }
    storeInitPromise = Promise.race([
      SqliteStore.create(require$$0$1.app.getPath("userData")),
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
const getCoworkRunner = () => {
  if (!coworkRunner) {
    coworkRunner = new CoworkRunner(getCoworkStore());
    coworkRunner.setMcpServerProvider(() => {
      return getMcpStore().getEnabledServers();
    });
    coworkRunner.on("message", (sessionId, message) => {
      if ((message == null ? void 0 : message.type) === "user") {
        const meta = message.metadata;
        console.log("[main] coworkRunner message event (user)", {
          sessionId,
          messageId: message.id,
          hasMetadata: !!meta,
          metadataKeys: meta ? Object.keys(meta) : [],
          hasImageAttachments: !!(meta == null ? void 0 : meta.imageAttachments),
          imageAttachmentsCount: Array.isArray(meta == null ? void 0 : meta.imageAttachments) ? meta.imageAttachments.length : 0,
          imageAttachmentsBase64Lengths: Array.isArray(meta == null ? void 0 : meta.imageAttachments) ? meta.imageAttachments.map((a) => {
            var _a3;
            return ((_a3 = a == null ? void 0 : a.base64Data) == null ? void 0 : _a3.length) ?? 0;
          }) : []
        });
      }
      const safeMessage = sanitizeCoworkMessageForIpc(message);
      if ((message == null ? void 0 : message.type) === "user") {
        const safeMeta = safeMessage == null ? void 0 : safeMessage.metadata;
        console.log("[main] sanitized user message", {
          hasMetadata: !!safeMeta,
          metadataKeys: safeMeta ? Object.keys(safeMeta) : [],
          hasImageAttachments: !!(safeMeta == null ? void 0 : safeMeta.imageAttachments),
          imageAttachmentsCount: Array.isArray(safeMeta == null ? void 0 : safeMeta.imageAttachments) ? safeMeta.imageAttachments.length : 0,
          imageAttachmentsBase64Lengths: Array.isArray(safeMeta == null ? void 0 : safeMeta.imageAttachments) ? safeMeta.imageAttachments.map((a) => {
            var _a3;
            return ((_a3 = a == null ? void 0 : a.base64Data) == null ? void 0 : _a3.length) ?? 0;
          }) : []
        });
      }
      const windows = require$$0$1.BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send("cowork:stream:message", { sessionId, message: safeMessage });
          } catch (error) {
            console.error("Failed to forward cowork message:", error);
          }
        }
      });
    });
    coworkRunner.on("messageUpdate", (sessionId, messageId, content) => {
      const safeContent = truncateIpcString(content, IPC_UPDATE_CONTENT_MAX_CHARS);
      const windows = require$$0$1.BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send("cowork:stream:messageUpdate", { sessionId, messageId, content: safeContent });
          } catch (error) {
            console.error("Failed to forward cowork message update:", error);
          }
        }
      });
    });
    coworkRunner.on("permissionRequest", (sessionId, request) => {
      if ((coworkRunner == null ? void 0 : coworkRunner.getSessionConfirmationMode(sessionId)) === "text") {
        return;
      }
      const safeRequest = sanitizePermissionRequestForIpc(request);
      const windows = require$$0$1.BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send("cowork:stream:permission", { sessionId, request: safeRequest });
          } catch (error) {
            console.error("Failed to forward cowork permission request:", error);
          }
        }
      });
    });
    coworkRunner.on("complete", (sessionId, claudeSessionId) => {
      const windows = require$$0$1.BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send("cowork:stream:complete", { sessionId, claudeSessionId });
        }
      });
    });
    coworkRunner.on("error", (sessionId, error) => {
      const windows = require$$0$1.BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send("cowork:stream:error", { sessionId, error });
        }
      });
    });
  }
  return coworkRunner;
};
const getMcpStore = () => {
  if (!mcpStore) {
    const sqliteStore = getStore();
    mcpStore = new McpStore(sqliteStore.getDatabase(), sqliteStore.getSaveFunction());
  }
  return mcpStore;
};
const getSkillManager = () => {
  if (!skillManager) {
    skillManager = new SkillManager(getStore);
  }
  return skillManager;
};
if (!gotTheLock) {
  require$$0$1.app.quit();
} else {
  require$$0$1.ipcMain.handle("store:get", (_event, key) => {
    return getStore().get(key);
  });
  require$$0$1.ipcMain.handle("store:set", (_event, key, value) => {
    getStore().set(key, value);
  });
  require$$0$1.ipcMain.handle("store:remove", (_event, key) => {
    getStore().delete(key);
  });
  require$$0$1.ipcMain.on("window-minimize", () => {
    mainWindow == null ? void 0 : mainWindow.minimize();
  });
  require$$0$1.ipcMain.on("window-maximize", () => {
    if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow == null ? void 0 : mainWindow.maximize();
    }
  });
  require$$0$1.ipcMain.on("window-close", () => {
    mainWindow == null ? void 0 : mainWindow.close();
  });
  require$$0$1.ipcMain.handle("window:isMaximized", () => {
    return (mainWindow == null ? void 0 : mainWindow.isMaximized()) ?? false;
  });
  require$$0$1.ipcMain.handle(
    "mcp:create",
    (_event, data) => {
      try {
        getMcpStore().createServer(data);
        const servers = getMcpStore().listServers();
        return { success: true, servers };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to create MCP server" };
      }
    }
  );
  require$$0$1.ipcMain.handle("mcp:delete", (_event, id) => {
    try {
      getMcpStore().deleteServer(id);
      const servers = getMcpStore().listServers();
      return { success: true, servers };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete MCP server" };
    }
  });
  require$$0$1.ipcMain.handle(
    "mcp:update",
    (_event, id, data) => {
      try {
        getMcpStore().updateServer(id, data);
        const servers = getMcpStore().listServers();
        return { success: true, servers };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to update MCP server" };
      }
    }
  );
  require$$0$1.ipcMain.handle("mcp:list", () => {
    try {
      const servers = getMcpStore().listServers();
      return { success: true, servers };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to list MCP servers" };
    }
  });
  require$$0$1.ipcMain.handle("mcp:setEnabled", (_event, options) => {
    try {
      getMcpStore().setEnabled(options.id, options.enabled);
      const servers = getMcpStore().listServers();
      return { success: true, servers };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update MCP server" };
    }
  });
  require$$0$1.ipcMain.handle("mcp:fetchMarketplace", async () => {
    var _a3;
    const url2 = require$$0$1.app.isPackaged ? "https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/prod/mcp-marketplace" : "https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/test/mcp-marketplace";
    try {
      const https2 = await import("https");
      const data = await new Promise((resolve, reject) => {
        const req = https2.get(url2, { timeout: 1e4 }, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            res.resume();
            return;
          }
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => resolve(body));
          res.on("error", reject);
        });
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });
      });
      const json2 = JSON.parse(data);
      const value = (_a3 = json2 == null ? void 0 : json2.data) == null ? void 0 : _a3.value;
      if (!value) {
        return { success: false, error: "Invalid response: missing data.value" };
      }
      const marketplace = typeof value === "string" ? JSON.parse(value) : value;
      return { success: true, data: marketplace };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch marketplace" };
    }
  });
  require$$0$1.ipcMain.handle("skills:list", () => {
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
  require$$0$1.ipcMain.handle("skills:getConfig", (_event, skillId) => {
    return getSkillManager().getSkillConfig(skillId);
  });
  require$$0$1.ipcMain.handle("skills:setConfig", (_event, skillId, config2) => {
    return getSkillManager().setSkillConfig(skillId, config2);
  });
  require$$0$1.ipcMain.handle("skills:testEmailConnectivity", async (_event, skillId, config2) => {
    return getSkillManager().testEmailConnectivity(skillId, config2);
  });
  require$$0$1.ipcMain.handle("skills:setEnabled", (_event, options) => {
    try {
      const skills = getSkillManager().setSkillEnabled(options.id, options.enabled);
      return { success: true, skills };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update skill" };
    }
  });
  require$$0$1.ipcMain.handle("skills:download", async (_event, source) => {
    return getSkillManager().downloadSkill(source);
  });
  require$$0$1.ipcMain.handle("skills:delete", (_event, id) => {
    try {
      const skills = getSkillManager().deleteSkill(id);
      return { success: true, skills };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete skill" };
    }
  });
  require$$0$1.ipcMain.handle("skills:getRoot", () => {
    try {
      const root = getSkillManager().getSkillsRoot();
      return { success: true, path: root };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to resolve skills root" };
    }
  });
  require$$0$1.ipcMain.handle("skills:autoRoutingPrompt", () => {
    try {
      const prompt = getSkillManager().buildAutoRoutingPrompt();
      return { success: true, prompt };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to build auto-routing prompt" };
    }
  });
  require$$0$1.ipcMain.handle(
    "api:fetch",
    async (_event, options) => {
      try {
        const response = await require$$0$1.session.defaultSession.fetch(options.url, {
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
  require$$0$1.ipcMain.handle(
    "cowork:session:start",
    async (_event, options) => {
      var _a3, _b, _c;
      try {
        const coworkStoreInstance = getCoworkStore();
        const config2 = coworkStoreInstance.getConfig();
        const systemPrompt = options.systemPrompt ?? config2.systemPrompt;
        const selectedWorkspaceRoot = (options.cwd || config2.workingDirectory || "").trim();
        if (!selectedWorkspaceRoot) {
          return {
            success: false,
            error: "Please select a task folder before submitting."
          };
        }
        const fallbackTitle = options.prompt.split("\n")[0].slice(0, 50) || "New Session";
        const title = ((_a3 = options.title) == null ? void 0 : _a3.trim()) || fallbackTitle;
        const taskWorkingDirectory = resolveTaskWorkingDirectory(selectedWorkspaceRoot);
        const session2 = coworkStoreInstance.createSession(
          title,
          taskWorkingDirectory,
          systemPrompt,
          config2.executionMode || "local",
          options.activeSkillIds || []
        );
        const messageMetadata = {};
        if ((_b = options.activeSkillIds) == null ? void 0 : _b.length) {
          messageMetadata.skillIds = options.activeSkillIds;
        }
        if ((_c = options.imageAttachments) == null ? void 0 : _c.length) {
          messageMetadata.imageAttachments = options.imageAttachments;
        }
        coworkStoreInstance.addMessage(session2.id, {
          type: "user",
          content: options.prompt,
          metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : void 0
        });
        const probe = await probeCoworkModelReadiness();
        if (probe.ok === false) {
          coworkStoreInstance.updateSession(session2.id, { status: "error" });
          coworkStoreInstance.addMessage(session2.id, {
            type: "system",
            content: `Error: ${probe.error}`,
            metadata: { error: probe.error }
          });
          const failedSession = coworkStoreInstance.getSession(session2.id) || {
            ...session2,
            status: "error"
          };
          return { success: true, session: failedSession };
        }
        const runner = getCoworkRunner();
        coworkStoreInstance.updateSession(session2.id, { status: "running" });
        runner.startSession(session2.id, options.prompt, {
          skipInitialUserMessage: true,
          skillIds: options.activeSkillIds,
          workspaceRoot: selectedWorkspaceRoot,
          confirmationMode: "modal",
          imageAttachments: options.imageAttachments
        }).catch((error) => {
          console.error("Cowork session error:", error);
        });
        const sessionWithMessages = coworkStoreInstance.getSession(session2.id) || {
          ...session2,
          status: "running"
        };
        return { success: true, session: sessionWithMessages };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to start session"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle(
    "cowork:session:continue",
    async (_event, options) => {
      var _a3, _b;
      try {
        console.log("[main] cowork:session:continue handler", {
          sessionId: options.sessionId,
          hasImageAttachments: !!options.imageAttachments,
          imageAttachmentsCount: ((_a3 = options.imageAttachments) == null ? void 0 : _a3.length) ?? 0,
          imageAttachmentsNames: (_b = options.imageAttachments) == null ? void 0 : _b.map((a) => a.name)
        });
        const runner = getCoworkRunner();
        runner.continueSession(options.sessionId, options.prompt, {
          systemPrompt: options.systemPrompt,
          skillIds: options.activeSkillIds,
          imageAttachments: options.imageAttachments
        }).catch((error) => {
          console.error("Cowork continue error:", error);
        });
        const session2 = getCoworkStore().getSession(options.sessionId);
        return { success: true, session: session2 };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to continue session"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle("cowork:session:stop", async (_event, sessionId) => {
    try {
      const runner = getCoworkRunner();
      runner.stopSession(sessionId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to stop session"
      };
    }
  });
  require$$0$1.ipcMain.handle("cowork:session:delete", async (_event, sessionId) => {
    try {
      const coworkStoreInstance = getCoworkStore();
      coworkStoreInstance.deleteSession(sessionId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete session"
      };
    }
  });
  require$$0$1.ipcMain.handle("cowork:session:deleteBatch", async (_event, sessionIds) => {
    try {
      const coworkStoreInstance = getCoworkStore();
      coworkStoreInstance.deleteSessions(sessionIds);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to batch delete sessions"
      };
    }
  });
  require$$0$1.ipcMain.handle("cowork:session:pin", async (_event, options) => {
    try {
      const coworkStoreInstance = getCoworkStore();
      coworkStoreInstance.setSessionPinned(options.sessionId, options.pinned);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update session pin"
      };
    }
  });
  require$$0$1.ipcMain.handle("cowork:session:rename", async (_event, options) => {
    try {
      const title = options.title.trim();
      if (!title) {
        return { success: false, error: "Title is required" };
      }
      const coworkStoreInstance = getCoworkStore();
      coworkStoreInstance.updateSession(options.sessionId, { title });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to rename session"
      };
    }
  });
  require$$0$1.ipcMain.handle("cowork:session:get", async (_event, sessionId) => {
    try {
      const session2 = getCoworkStore().getSession(sessionId);
      return { success: true, session: session2 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get session"
      };
    }
  });
  require$$0$1.ipcMain.handle("cowork:session:list", async () => {
    try {
      const sessions = getCoworkStore().listSessions();
      return { success: true, sessions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list sessions"
      };
    }
  });
  require$$0$1.ipcMain.handle(
    "cowork:session:exportResultImage",
    async (event, options) => {
      try {
        const { rect, defaultFileName } = options || {};
        const captureRect = normalizeCaptureRect(rect);
        if (!captureRect) {
          return { success: false, error: "Capture rect is required" };
        }
        const image = await event.sender.capturePage(captureRect);
        return savePngWithDialog(event.sender, image.toPNG(), defaultFileName);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to export session image"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle(
    "cowork:session:captureImageChunk",
    async (event, options) => {
      try {
        const captureRect = normalizeCaptureRect(options == null ? void 0 : options.rect);
        if (!captureRect) {
          return { success: false, error: "Capture rect is required" };
        }
        const image = await event.sender.capturePage(captureRect);
        const pngBuffer = image.toPNG();
        return {
          success: true,
          width: captureRect.width,
          height: captureRect.height,
          pngBase64: pngBuffer.toString("base64")
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to capture session image chunk"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle(
    "cowork:session:saveResultImage",
    async (event, options) => {
      try {
        const base642 = typeof (options == null ? void 0 : options.pngBase64) === "string" ? options.pngBase64.trim() : "";
        if (!base642) {
          return { success: false, error: "Image data is required" };
        }
        const pngBuffer = Buffer.from(base642, "base64");
        if (pngBuffer.length <= 0) {
          return { success: false, error: "Invalid image data" };
        }
        return savePngWithDialog(event.sender, pngBuffer, options == null ? void 0 : options.defaultFileName);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save session image"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle(
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
  require$$0$1.ipcMain.handle(
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
  require$$0$1.ipcMain.handle(
    "cowork:memory:listEntries",
    async (_event, input) => {
      var _a3;
      try {
        const entries = getCoworkStore().listUserMemories({
          query: ((_a3 = input == null ? void 0 : input.query) == null ? void 0 : _a3.trim()) || void 0,
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
  require$$0$1.ipcMain.handle("cowork:memory:getStats", async () => {
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
  require$$0$1.ipcMain.handle(
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
  require$$0$1.ipcMain.handle("cowork:sandbox:status", async () => {
    return getSandboxStatus();
  });
  require$$0$1.ipcMain.handle("cowork:sandbox:install", async () => {
    const result = await ensureSandboxReady();
    return {
      success: result.ok,
      status: getSandboxStatus(),
      error: result.ok ? void 0 : "error" in result ? result.error : void 0
    };
  });
  require$$0$1.ipcMain.handle("cowork:config:get", async () => {
    try {
      const config2 = getCoworkStore().getConfig();
      return { success: true, config: config2 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get config"
      };
    }
  });
  require$$0$1.ipcMain.handle(
    "cowork:config:set",
    async (_event, config2) => {
      try {
        const normalizedExecutionMode = config2.executionMode && String(config2.executionMode) === "container" ? "sandbox" : config2.executionMode;
        const normalizedMemoryEnabled = typeof config2.memoryEnabled === "boolean" ? config2.memoryEnabled : void 0;
        const normalizedMemoryImplicitUpdateEnabled = typeof config2.memoryImplicitUpdateEnabled === "boolean" ? config2.memoryImplicitUpdateEnabled : void 0;
        const normalizedMemoryLlmJudgeEnabled = typeof config2.memoryLlmJudgeEnabled === "boolean" ? config2.memoryLlmJudgeEnabled : void 0;
        const normalizedMemoryGuardLevel = config2.memoryGuardLevel === "strict" || config2.memoryGuardLevel === "standard" || config2.memoryGuardLevel === "relaxed" ? config2.memoryGuardLevel : void 0;
        const normalizedMemoryUserMemoriesMaxItems = typeof config2.memoryUserMemoriesMaxItems === "number" && Number.isFinite(config2.memoryUserMemoriesMaxItems) ? Math.max(
          MIN_MEMORY_USER_MEMORIES_MAX_ITEMS,
          Math.min(MAX_MEMORY_USER_MEMORIES_MAX_ITEMS, Math.floor(config2.memoryUserMemoriesMaxItems))
        ) : void 0;
        const normalizedConfig = {
          ...config2,
          executionMode: normalizedExecutionMode,
          memoryEnabled: normalizedMemoryEnabled,
          memoryImplicitUpdateEnabled: normalizedMemoryImplicitUpdateEnabled,
          memoryLlmJudgeEnabled: normalizedMemoryLlmJudgeEnabled,
          memoryGuardLevel: normalizedMemoryGuardLevel,
          memoryUserMemoriesMaxItems: normalizedMemoryUserMemoriesMaxItems
        };
        const previousWorkingDir = getCoworkStore().getConfig().workingDirectory;
        getCoworkStore().setConfig(normalizedConfig);
        if (normalizedConfig.workingDirectory !== void 0 && normalizedConfig.workingDirectory !== previousWorkingDir) {
          getSkillManager().handleWorkingDirectoryChange();
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to set config"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle("shell:openPath", async (_event, filePath) => {
    try {
      const normalizedPath = normalizeWindowsShellPath(filePath);
      const result = await require$$0$1.shell.openPath(normalizedPath);
      if (result) {
        return { success: false, error: result };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  require$$0$1.ipcMain.handle("shell:showItemInFolder", async (_event, filePath) => {
    try {
      const normalizedPath = normalizeWindowsShellPath(filePath);
      require$$0$1.shell.showItemInFolder(normalizedPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  require$$0$1.ipcMain.handle("shell:openExternal", async (_event, url2) => {
    try {
      await require$$0$1.shell.openExternal(url2);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  require$$0$1.ipcMain.handle("log:getPath", () => {
    return getLogFilePath();
  });
  require$$0$1.ipcMain.handle("log:openFolder", () => {
    const logPath = getLogFilePath();
    if (logPath) {
      require$$0$1.shell.showItemInFolder(logPath);
    }
  });
  require$$0$1.ipcMain.handle("log:exportZip", async (event) => {
    try {
      const ownerWindow = require$$0$1.BrowserWindow.fromWebContents(event.sender);
      const saveOptions = {
        title: "Export Logs",
        defaultPath: path$8.join(require$$0$1.app.getPath("downloads"), buildLogExportFileName()),
        filters: [{ name: "Zip Archive", extensions: ["zip"] }]
      };
      const saveResult = ownerWindow ? await require$$0$1.dialog.showSaveDialog(ownerWindow, saveOptions) : await require$$0$1.dialog.showSaveDialog(saveOptions);
      if (saveResult.canceled || !saveResult.filePath) {
        return { success: true, canceled: true };
      }
      const outputPath = ensureZipFileName(saveResult.filePath);
      const archiveResult = await exportLogsZip({
        outputPath,
        entries: [
          { archiveName: "main.log", filePath: getLogFilePath() },
          { archiveName: "cowork.log", filePath: getCoworkLogPath() }
        ]
      });
      return {
        success: true,
        canceled: false,
        path: outputPath,
        missingEntries: archiveResult.missingEntries
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export logs"
      };
    }
  });
  require$$0$1.ipcMain.handle("app:getAutoLaunch", () => {
    const stored = getStore().get("auto_launch_enabled");
    const enabled = stored ?? getAutoLaunchEnabled();
    return { enabled };
  });
  require$$0$1.ipcMain.handle("app:setAutoLaunch", (_event, enabled) => {
    if (typeof enabled !== "boolean") {
      return { success: false, error: "Invalid parameter: enabled must be boolean" };
    }
    try {
      setAutoLaunchEnabled(enabled);
      getStore().set("auto_launch_enabled", enabled);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set auto-launch"
      };
    }
  });
  const MAX_READ_AS_DATA_URL_BYTES = 20 * 1024 * 1024;
  const MIME_BY_EXT = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml"
  };
  require$$0$1.ipcMain.handle(
    "dialog:readFileAsDataUrl",
    async (_event, filePath) => {
      try {
        if (typeof filePath !== "string" || !filePath.trim()) {
          return { success: false, error: "Missing file path" };
        }
        const resolvedPath = path$8.resolve(filePath.trim());
        const stat = await fs$b.promises.stat(resolvedPath);
        if (!stat.isFile()) {
          return { success: false, error: "Not a file" };
        }
        if (stat.size > MAX_READ_AS_DATA_URL_BYTES) {
          return {
            success: false,
            error: `File too large (max ${Math.floor(MAX_READ_AS_DATA_URL_BYTES / (1024 * 1024))}MB)`
          };
        }
        const buffer = await fs$b.promises.readFile(resolvedPath);
        const ext = path$8.extname(resolvedPath).toLowerCase();
        const mimeType = MIME_BY_EXT[ext] || "application/octet-stream";
        const base642 = buffer.toString("base64");
        return { success: true, dataUrl: `data:${mimeType};base64,${base642}` };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to read file"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle("dialog:selectDirectory", async (event) => {
    const ownerWindow = require$$0$1.BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      properties: ["openDirectory", "createDirectory"]
    };
    const result = ownerWindow ? await require$$0$1.dialog.showOpenDialog(ownerWindow, dialogOptions) : await require$$0$1.dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, path: null };
    }
    return { success: true, path: result.filePaths[0] };
  });
  require$$0$1.ipcMain.handle("dialog:selectFile", async (event, options) => {
    const ownerWindow = require$$0$1.BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      properties: ["openFile"],
      title: options == null ? void 0 : options.title,
      filters: options == null ? void 0 : options.filters
    };
    const result = ownerWindow ? await require$$0$1.dialog.showOpenDialog(ownerWindow, dialogOptions) : await require$$0$1.dialog.showOpenDialog(dialogOptions);
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, path: null };
    }
    return { success: true, path: result.filePaths[0] };
  });
  require$$0$1.ipcMain.handle(
    "dialog:saveInlineFile",
    async (_event, options) => {
      try {
        const dataBase64 = typeof (options == null ? void 0 : options.dataBase64) === "string" ? options.dataBase64.trim() : "";
        if (!dataBase64) {
          return { success: false, path: null, error: "Missing file data" };
        }
        const buffer = Buffer.from(dataBase64, "base64");
        if (!buffer.length) {
          return { success: false, path: null, error: "Invalid file data" };
        }
        if (buffer.length > MAX_INLINE_ATTACHMENT_BYTES) {
          return {
            success: false,
            path: null,
            error: `File too large (max ${Math.floor(MAX_INLINE_ATTACHMENT_BYTES / (1024 * 1024))}MB)`
          };
        }
        const dir = resolveInlineAttachmentDir(options == null ? void 0 : options.cwd);
        await fs$b.promises.mkdir(dir, { recursive: true });
        const safeFileName = sanitizeAttachmentFileName(options == null ? void 0 : options.fileName);
        const extension = inferAttachmentExtension(safeFileName, options == null ? void 0 : options.mimeType);
        const baseName = extension ? safeFileName.slice(0, -extension.length) : safeFileName;
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const finalName = `${baseName || "attachment"}-${uniqueSuffix}${extension}`;
        const outputPath = path$8.join(dir, finalName);
        await fs$b.promises.writeFile(outputPath, buffer);
        return { success: true, path: outputPath };
      } catch (error) {
        return {
          success: false,
          path: null,
          error: error instanceof Error ? error.message : "Failed to save inline file"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle("get-api-config", async () => {
    return getCurrentApiConfig();
  });
  require$$0$1.ipcMain.handle("check-api-config", async (_event, options) => {
    const { config: config2, error } = resolveCurrentApiConfig();
    if (config2 && (options == null ? void 0 : options.probeModel)) {
      const probe = await probeCoworkModelReadiness();
      if (probe.ok === false) {
        return { hasConfig: false, config: null, error: probe.error };
      }
    }
    return { hasConfig: config2 !== null, config: config2, error };
  });
  require$$0$1.ipcMain.handle(
    "save-api-config",
    async (_event, config2) => {
      try {
        saveCoworkApiConfig(config2);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save API config"
        };
      }
    }
  );
  require$$0$1.ipcMain.handle("generate-session-title", async (_event, userInput) => {
    return generateSessionTitle(userInput);
  });
  require$$0$1.ipcMain.handle("get-recent-cwds", async (_event, limit) => {
    const boundedLimit = limit ? Math.min(Math.max(limit, 1), 20) : 8;
    return getCoworkStore().listRecentCwds(boundedLimit);
  });
  require$$0$1.ipcMain.handle("app:getVersion", () => require$$0$1.app.getVersion());
  require$$0$1.ipcMain.handle("app:getSystemLocale", () => require$$0$1.app.getLocale());
  require$$0$1.app.on("second-instance", (_event, commandLine, workingDirectory) => {
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
    require$$0$1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      var _a3, _b;
      const devPort = ((_b = (_a3 = process.env.ELECTRON_START_URL) == null ? void 0 : _a3.match(/:(\d+)/)) == null ? void 0 : _b[1]) || "5176";
      const cspDirectives = [
        "default-src 'self'",
        isDev ? `script-src 'self' 'unsafe-inline' http://localhost:${devPort} ws://localhost:${devPort}` : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http:",
        // 允许连接到任意域名，不额外限制。
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
    var _a3;
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      if (!mainWindow.isFocused()) mainWindow.focus();
      return;
    }
    mainWindow = new require$$0$1.BrowserWindow({
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
      const iconPath = path$8.join(__dirname, "../build/icons/png/512x512.png");
      if (fs$b.existsSync(iconPath)) {
        (_a3 = require$$0$1.app.dock) == null ? void 0 : _a3.setIcon(require$$0$1.nativeImage.createFromPath(iconPath));
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
              mainWindow.loadFile(path$8.join(__dirname, "../resources/error.html"));
            }
          }
        });
      };
      tryLoadURL();
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path$8.join(__dirname, "../dist/index.html"));
    }
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
    mainWindow.once("ready-to-show", () => {
      mainWindow == null ? void 0 : mainWindow.show();
    });
    require$$0$1.app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (!mainWindow.isFocused()) mainWindow.focus();
        return;
      }
      if (require$$0$1.BrowserWindow.getAllWindows().length === 0) {
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
    console.log('app.getPath("userData")', require$$0$1.app.getPath("userData"));
    console.log("[Main] initApp: waiting for app.whenReady()");
    await require$$0$1.app.whenReady();
    console.log("[Main] initApp: app is ready");
    const defaultProjectDir = path$8.join(os$4.homedir(), "lobsterai", "project");
    if (!fs$b.existsSync(defaultProjectDir)) {
      fs$b.mkdirSync(defaultProjectDir, { recursive: true });
      console.log("Created default project directory:", defaultProjectDir);
    }
    console.log("[Main] initApp: default project dir ensured");
    console.log("[Main] initApp: starting initStore()");
    store = await initStore();
    console.log("[Main] initApp: store initialized");
    setStoreGetter(() => store);
    console.log("[Main] initApp: setStoreGetter done");
    setContentSecurityPolicy();
    console.log("[Main] initApp: creating window");
    createWindow();
    console.log("[Main] initApp: window created");
    require$$0$1.app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (!mainWindow.isFocused()) mainWindow.focus();
        return;
      }
      if (require$$0$1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  };
  initApp().catch(console.error);
  require$$0$1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      require$$0$1.app.quit();
    }
  });
}
//# sourceMappingURL=main.js.map
