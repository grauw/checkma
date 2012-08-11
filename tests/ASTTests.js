/*
 * Copyright 2012 Laurens Holst
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var extend = require("../utils.js").extend;
var Test = require("glunit/Test.js").Test;
var TestSuite = require("glunit/TestSuite.js").TestSuite;
var esprima = require("esprima");
var Program = require("../ast.js").Program;
var EmptyStatement = require("../ast.js").EmptyStatement;


var astTests = new TestSuite("AST",
	
	new Test("Program constructor()", function() {
		var ast = esprima.parse(";");
		var program = new Program(ast);

		this.assertEquals(1, program._body.length);
		this.assertType(EmptyStatement, program._body[0]);
	})
	
);


exports.astTests = astTests;
