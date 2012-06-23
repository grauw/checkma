var fs = require('fs');
var esprima = require('esprima');

function main()
{
	if (process.argv.length != 3)
		throw new Error("Missing required argument.");

	var path = process.argv[2];
	var content = fs.readFileSync(path, 'ascii');
	var ast = esprima.parse(content);

	var program = new Program(ast);
	
	program.initialiseScope();
	program.initialiseReferences();

	scopes.forEach(function(scope) {
		for (var member in scope._members)
		{
			if (!(scope._members[member] instanceof BuiltInReference))
			{
				var name = scope instanceof GlobalScope ? "global" : scope._owner && (scope._owner instanceof Program ? "program" : scope._owner.getId && scope._owner.getId() || scope._owner.constructor.name);
				
				if (scope._members[member]._references.length == 0)
				{
					console.log("Scope", name, "member", member, "is not referenced.");
				}
				
				if (scope._members[member] instanceof AutoGlobalReference)
				{
					console.log("Scope", name, "member", member, "is a global.");
				}
			}
		}
	});
}




/**
 * Class extension utility function.
 * @param base The base class.
 * @param constructor The constructor function for the new class.
 */
function extend(base, constructor) {
	var prototype = new Function();
	prototype.prototype = base.prototype;
	constructor.prototype = new prototype();
	constructor.prototype.constructor = constructor;
	return constructor;
}

/**
 * Type checker, intended for use at the start of any function.
 * Primitive types are checked by a string, objects by their constructor.
 * Use an array to denote optionality. Example:
 * 
 * function myFunction(aNumber, aFunction, anOptionalString) {
 *     checkTypes(arguments, "number", Function, ["string"])
 * }
 * 
 * @param {Array} args Any array-like list of arguments.
 */
function checkTypes(args) {
	for (var i = 1; i < arguments.length; i++) {
		var type = arguments[i], arg = args[i - 1];
		if (!(type instanceof Array && (type = type[0]) && arg == null) &&
				!(typeof type == "string" && typeof arg == type) &&
				!(type instanceof Function && arg instanceof type)) {
			if (typeof type != "string" && !(type instanceof Function))
				throw new Error("Unsupported type " + type + ".");
			throw new Error("Argument of type " + (typeof type != "string" && type.constructor.name || type) + " expected at index " + (i - 1) + ". " +
					"Was: " + (arg && typeof arg != "string" && arg.constructor && arg.constructor.name || arg) + ".");
		}
	}
}




function Node(json)
{
	if (json.type != this.constructor.name)
		throw new Error(this.constructor.name + " type expected.");
	
	for (var property in json)
	{
		if (property == "type")
			continue;
		
		this["_" + property] = createFromJson(json[property]);
	}
}

Node.prototype.toString = function()
{
	return this.constructor.name;
};

function createFromJson(json)
{
	if (json instanceof Array)
	{
		return json.map(function(json) {
			return createFromJson(json);
		});
	}
	if (json instanceof Object && !(json instanceof RegExp))
	{
		if (!json.type)
			{ console.log(json); throw new Error("No type."); }
		if (!types[json.type])
			{ console.log(json); throw new Error("Type " + json.type + " not found."); }
		
		return new types[json.type](json);
	}
	return json;
}

var types = {};
var scopes = [];




function Scope(owner, parent)
{
	scopes.push(this);
	
	this._owner = owner;
	this._parent = parent || null;
	this._members = {};
	this._members["this"] = new BuiltInReference();
}

Scope.prototype.lookupMember = function(id)
{
	checkTypes(arguments, "string");
	return this._members[id] || (this._parent && this._parent.lookupMember(id)) || null;
};

Scope.prototype.addMember = function(id, reference)
{
	checkTypes(arguments, "string", Reference);
	this._members[id] = reference;
};




function GlobalScope()
{
	Scope.call(this, null, null);
	this._members["NaN"] = new BuiltInReference();
	this._members["Infinity"] = new BuiltInReference();
	this._members["undefined"] = new BuiltInReference();
	this._members["eval"] = new BuiltInReference();
	this._members["parseInt"] = new BuiltInReference();
	this._members["parseFloat"] = new BuiltInReference();
	this._members["isNaN"] = new BuiltInReference();
	this._members["isFinite"] = new BuiltInReference();
	this._members["decodeURI"] = new BuiltInReference();
	this._members["decodeURIComponent"] = new BuiltInReference();
	this._members["encodeURI"] = new BuiltInReference();
	this._members["encodeURIComponent"] = new BuiltInReference();
	this._members["Object"] = new BuiltInReference();
	this._members["Function"] = new BuiltInReference();
	this._members["Array"] = new BuiltInReference();
	this._members["String"] = new BuiltInReference();
	this._members["Boolean"] = new BuiltInReference();
	this._members["Number"] = new BuiltInReference();
	this._members["Date"] = new BuiltInReference();
	this._members["RegExp"] = new BuiltInReference();
	this._members["Error"] = new BuiltInReference();
	this._members["EvalError"] = new BuiltInReference();
	this._members["RangeError"] = new BuiltInReference();
	this._members["ReferenceError"] = new BuiltInReference();
	this._members["SyntaxError"] = new BuiltInReference();
	this._members["TypeError"] = new BuiltInReference();
	this._members["URIError"] = new BuiltInReference();
	this._members["Math"] = new BuiltInReference();
	this._members["JSON"] = new BuiltInReference();
}

extend(Scope, GlobalScope);

GlobalScope.prototype.lookupMember = function(id)
{
	return this._members[id] || (this._members[id] = new AutoGlobalReference());
};




function Reference(declaration)
{
	this._declaration = declaration || null;
	this._references = [];
}

Reference.prototype.addReferrer = function(identifier)
{
	this._references.push(identifier);
};




function BuiltInReference(declaration)
{
	Reference.call(this, declaration);
}

extend(Reference, BuiltInReference);




function AutoGlobalReference(declaration)
{
	Reference.call(this, declaration);
}

extend(Reference, AutoGlobalReference);




function Program(json)
{
	Node.call(this, json);
	
	this._scope = null;
}

types.Program = extend(Node, Program);

Program.prototype.initialiseScope = function()
{
	var scope = new Scope(this, new GlobalScope());
	
	for (var i = 0; i < this._body.length; i++)
		this._body[i].initialiseScope(scope);
	
	this._scope = scope;
};

Program.prototype.initialiseReferences = function()
{
	for (var i = 0; i < this._body.length; i++)
		this._body[i].initialiseReferences(this._scope);
};




function Statement(json)
{
	Node.call(this, json);
}

extend(Node, Statement);

Statement.prototype.initialiseScope = function(scope)
{
	throw new Error("Must implement initialiseScope().");
};

Statement.prototype.initialiseReferences = function(scope)
{
	throw new Error("Must implement initialiseReferences().");
};




function VariableDeclaration(json)
{
	Statement.call(this, json);
}

types.VariableDeclaration = extend(Statement, VariableDeclaration);

VariableDeclaration.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._declarations.length; i++)
		this._declarations[i].initialiseScope(scope);
};

VariableDeclaration.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._declarations.length; i++)
		this._declarations[i].initialiseReferences(scope);
};




function VariableDeclarator(json)
{
	Node.call(this, json);
}

types.VariableDeclarator = extend(Node, VariableDeclarator);

VariableDeclarator.prototype.getId = function()
{
	return this._id._name;
};

VariableDeclarator.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	scope.addMember(this.getId(), new Reference(this));
	if (this._init)
		this._init.initialiseScope(scope);
};

VariableDeclarator.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	if (this._init)
		this._init.initialiseReferences(scope);
};




function FunctionDeclaration(json)
{
	Statement.call(this, json);
	
	this._scope = null;
}

types.FunctionDeclaration = extend(Statement, FunctionDeclaration);

FunctionDeclaration.prototype.getId = function()
{
	return this._id._name;
};

FunctionDeclaration.prototype.initialiseScope = function(parent)
{
	checkTypes(arguments, Scope);
	parent.addMember(this.getId(), new Reference(this));
	
	var scope = new Scope(this, parent);
	
	// add parameters
	this._params.forEach(function(param) {
		scope.addMember(param.name, new Reference());
	});
	
	// add arguments object
	// FIXME: this._needs to be set inbetween the function and the variable declarations
	scope.addMember("arguments", new BuiltInReference());
	
	this._body.initialiseScope(scope);
	
	this._scope = scope;
};

FunctionDeclaration.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._body.initialiseReferences(this._scope);
};




function ExpressionStatement(json)
{
	Statement.call(this, json);
}

types.ExpressionStatement = extend(Statement, ExpressionStatement);

ExpressionStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._expression.initialiseScope(scope);
};

ExpressionStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._expression.initialiseReferences(scope);
};




function IfStatement(json)
{
	Statement.call(this, json);
}

types.IfStatement = extend(Statement, IfStatement);

IfStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseScope(scope);
	this._consequent.initialiseScope(scope);
	if (this._alternate)
		this._alternate.initialiseScope(scope);
};

IfStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseReferences(scope);
	this._consequent.initialiseReferences(scope);
	if (this._alternate)
		this._alternate.initialiseReferences(scope);
};




function ForStatement(json)
{
	Statement.call(this, json);
}

types.ForStatement = extend(Statement, ForStatement);

ForStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	if (this._init)
		this._init.initialiseScope(scope);
	if (this._test)
		this._test.initialiseScope(scope);
	if (this._update)
		this._update.initialiseScope(scope);
	this._body.initialiseScope(scope);
};

ForStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	if (this._init)
		this._init.initialiseReferences(scope);
	if (this._test)
		this._test.initialiseReferences(scope);
	if (this._update)
		this._update.initialiseReferences(scope);
	this._body.initialiseReferences(scope);
};




function ForInStatement(json)
{
	Statement.call(this, json);
}

types.ForInStatement = extend(Statement, ForInStatement);

ForInStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseScope(scope);
	this._right.initialiseScope(scope);
	this._body.initialiseScope(scope);
};

ForInStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseReferences(scope);
	this._right.initialiseReferences(scope);
	this._body.initialiseReferences(scope);
};




function WhileStatement(json)
{
	Statement.call(this, json);
}

types.WhileStatement = extend(Statement, WhileStatement);

WhileStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseScope(scope);
	this._body.initialiseScope(scope);
};

WhileStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseReferences(scope);
	this._body.initialiseReferences(scope);
};




function DoWhileStatement(json)
{
	Statement.call(this, json);
}

types.DoWhileStatement = extend(Statement, DoWhileStatement);

DoWhileStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseScope(scope);
	this._body.initialiseScope(scope);
};

DoWhileStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseReferences(scope);
	this._body.initialiseReferences(scope);
};




function SwitchStatement(json)
{
	Statement.call(this, json);
}

types.SwitchStatement = extend(Statement, SwitchStatement);

SwitchStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._discriminant.initialiseScope(scope);
	for (var i = 0; i < this._cases.length; i++)
		this._cases[i].initialiseScope(scope);
};

SwitchStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._discriminant.initialiseReferences(scope);
	for (var i = 0; i < this._cases.length; i++)
		this._cases[i].initialiseReferences(scope);
};




function SwitchCase(json)
{
	Node.call(this, json);
}

types.SwitchCase = extend(Node, SwitchCase);

SwitchCase.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._consequent.length; i++)
		this._consequent[i].initialiseScope(scope);
};

SwitchCase.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._consequent.length; i++)
		this._consequent[i].initialiseReferences(scope);
};




function BreakStatement(json)
{
	Statement.call(this, json);
}

types.BreakStatement = extend(Statement, BreakStatement);

BreakStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

BreakStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
};




function ContinueStatement(json)
{
	Statement.call(this, json);
}

types.ContinueStatement = extend(Statement, ContinueStatement);

ContinueStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

ContinueStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
};




function ThrowStatement(json)
{
	Statement.call(this, json);
}

types.ThrowStatement = extend(Statement, ThrowStatement);

ThrowStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._argument.initialiseScope(scope);
};

ThrowStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._argument.initialiseReferences(scope);
};




function TryStatement(json)
{
	Statement.call(this, json);
}

types.TryStatement = extend(Statement, TryStatement);

TryStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._block.initialiseScope(scope);
	for (var i = 0; i < this._handlers.length; i++)
		this._handlers[i].initialiseScope(scope);
	if (this._finalizer)
		this._finalizer.initialiseScope(scope);
};

TryStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._block.initialiseReferences(scope);
	for (var i = 0; i < this._handlers.length; i++)
		this._handlers[i].initialiseReferences(scope);
	if (this._finalizer)
		this._finalizer.initialiseReferences(scope);
};




/**
 * Catch clause of a try statement.
 * @param json
 */
function CatchClause(json)
{
	Node.call(this, json);
}

types.CatchClause = extend(Node, CatchClause);

CatchClause.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._body.initialiseScope(scope);
};

CatchClause.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._body.initialiseReferences(scope);
};




function BlockStatement(json)
{
	Statement.call(this, json);
}

types.BlockStatement = extend(Statement, BlockStatement);

BlockStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._body.length; i++)
		this._body[i].initialiseScope(scope);
};

BlockStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._body.length; i++)
		this._body[i].initialiseReferences(scope);
};




function ReturnStatement(json)
{
	Statement.call(this, json);
}

types.ReturnStatement = extend(Statement, ReturnStatement);

ReturnStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	if (this._argument)
		this._argument.initialiseScope(scope);
};

ReturnStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	if (this._argument)
		this._argument.initialiseReferences(scope);
};




function LabeledStatement(json)
{
	Statement.call(this, json);
}

types.LabeledStatement = extend(Statement, LabeledStatement);

LabeledStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._body.initialiseScope(scope);
};

LabeledStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._body.initialiseReferences(scope);
};




function WithStatement(json)
{
	Statement.call(this, json);
}

types.WithStatement = extend(Statement, WithStatement);

WithStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	// FIXME: the with statment establishes a scope of its own...
	this._object.initialiseScope(scope);
	this._body.initialiseScope(scope);
};

WithStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._object.initialiseReferences(scope);
	this._body.initialiseReferences(scope);
};




function DebuggerStatement(json)
{
	Statement.call(this, json);
}

types.DebuggerStatement = extend(Statement, DebuggerStatement);

DebuggerStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

DebuggerStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
};




function EmptyStatement(json)
{
	Statement.call(this, json);
}

types.EmptyStatement = extend(Statement, EmptyStatement);

EmptyStatement.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

EmptyStatement.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
};




function Expression(json)
{
	Node.call(this, json);
}

extend(Node, Expression);

Expression.prototype.initialiseScope = function(scope)
{
	throw new Error("Must implement initialiseScope().");
};

Expression.prototype.initialiseReferences = function(scope)
{
	throw new Error("Must implement initialiseReferences().");
};




function Literal(json)
{
	Expression.call(this, json);
}

types.Literal = extend(Expression, Literal);

Literal.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

Literal.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
};




function Identifier(json)
{
	Expression.call(this, json);
	
	this._reference = null;
}

types.Identifier = extend(Expression, Identifier);

Identifier.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

Identifier.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	var reference = scope.lookupMember(this._name);
	if (!reference)
		throw new Error("Reference not found for identifier " + this._name);

	this._reference = reference;
	reference.addReferrer(this);
};




function MemberExpression(json)
{
	Expression.call(this, json);
}

types.MemberExpression = extend(Expression, MemberExpression);

MemberExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._object.initialiseScope(scope);
};

MemberExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._object.initialiseReferences(scope);
};




function CallExpression(json)
{
	Expression.call(this, json);
}

types.CallExpression = extend(Expression, CallExpression);

CallExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._callee.initialiseScope(scope);
	for (var i = 0; i < this._arguments.length; i++)
		this._arguments[i].initialiseScope(scope);
};

CallExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._callee.initialiseReferences(scope);
	for (var i = 0; i < this._arguments.length; i++)
		this._arguments[i].initialiseReferences(scope);
};




function AssignmentExpression(json)
{
	Expression.call(this, json);
}

types.AssignmentExpression = extend(Expression, AssignmentExpression);

AssignmentExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseScope(scope);
	this._right.initialiseScope(scope);
};

AssignmentExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseReferences(scope);
	this._right.initialiseReferences(scope);
};




function UpdateExpression(json)
{
	Expression.call(this, json);
}

types.UpdateExpression = extend(Expression, UpdateExpression);

UpdateExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._argument.initialiseScope(scope);
};

UpdateExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._argument.initialiseReferences(scope);
};




function NewExpression(json)
{
	Expression.call(this, json);
}

types.NewExpression = extend(Expression, NewExpression);

NewExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._callee.initialiseScope(scope);
};

NewExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._callee.initialiseReferences(scope);
};




function ThisExpression(json)
{
	Expression.call(this, json);
	
	this._reference = null;
}

types.ThisExpression = extend(Expression, ThisExpression);

ThisExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
};

ThisExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._reference = scope.lookupMember("this");
	this._reference.addReferrer(this);
};




function UnaryExpression(json)
{
	Expression.call(this, json);
}

types.UnaryExpression = extend(Expression, UnaryExpression);

UnaryExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._argument.initialiseScope(scope);
};

UnaryExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._argument.initialiseReferences(scope);
};




function BinaryExpression(json)
{
	Expression.call(this, json);
}

types.BinaryExpression = extend(Expression, BinaryExpression);

BinaryExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseScope(scope);
	this._right.initialiseScope(scope);
};

BinaryExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseReferences(scope);
	this._right.initialiseReferences(scope);
};




function ConditionalExpression(json)
{
	Expression.call(this, json);
}

types.ConditionalExpression = extend(Expression, ConditionalExpression);

ConditionalExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseScope(scope);
	this._consequent.initialiseScope(scope);
	this._alternate.initialiseScope(scope);
};

ConditionalExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._test.initialiseReferences(scope);
	this._consequent.initialiseReferences(scope);
	this._alternate.initialiseReferences(scope);
};




function LogicalExpression(json)
{
	Expression.call(this, json);
}

types.LogicalExpression = extend(Expression, LogicalExpression);

LogicalExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseScope(scope);
	this._right.initialiseScope(scope);
};

LogicalExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._left.initialiseReferences(scope);
	this._right.initialiseReferences(scope);
};




function ArrayExpression(json)
{
	Expression.call(this, json);
}

types.ArrayExpression = extend(Expression, ArrayExpression);

ArrayExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._elements.length; i++)
		this._elements[i].initialiseScope(scope);
};

ArrayExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._elements.length; i++)
		this._elements[i].initialiseReferences(scope);
};




function FunctionExpression(json)
{
	Expression.call(this, json);
	
	this._scope = null;
}

types.FunctionExpression = extend(Expression, FunctionExpression);

FunctionExpression.prototype.getId = function()
{
	return this._id && this._id._name || null;
};

FunctionExpression.prototype.initialiseScope = function(parent)
{
	checkTypes(arguments, Scope);
	if (this._id)
	{
		// insert wrapper scope for the identifier
		// XXX: what about the identifier on object getters/setters?
		parent = new Scope(this, parent);
		parent.addMember(this._id._name, new Reference(this));
	}
	
	var scope = new Scope(this, parent);
	
	// add parameters
	this._params.forEach(function(param) {
		scope.addMember(param._name, new Reference());
	});
	
	// add arguments object
	// FIXME: this._needs to be set inbetween the function and the variable declarations
	scope.addMember("arguments", new Reference());
	
	this._body.initialiseScope(scope);
	
	// add parameters
	this._params.forEach(function(param) {
		scope.addMember(param._name, new Reference());
	});
	
	this._scope = scope;
};

FunctionExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._body.initialiseReferences(this._scope);
};




/**
 * Object literal expression.
 * @param json
 */
function ObjectExpression(json)
{
	Expression.call(this, json);
}

types.ObjectExpression = extend(Expression, ObjectExpression);

ObjectExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._properties.length; i++)
		this._properties[i].initialiseScope(scope);
};

ObjectExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._properties.length; i++)
		this._properties[i].initialiseReferences(scope);
};




/**
 * Property of an object literal expression.
 * @param json
 */
function Property(json)
{
	Node.call(this, json);
}

types.Property = extend(Node, Property);

Property.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	this._value.initialiseScope(scope);
};

Property.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	this._value.initialiseReferences(scope);
};




function SequenceExpression(json)
{
	Expression.call(this, json);
}

types.SequenceExpression = extend(Expression, SequenceExpression);

SequenceExpression.prototype.initialiseScope = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._expressions.length; i++)
		this._expressions[i].initialiseScope(scope);
};

SequenceExpression.prototype.initialiseReferences = function(scope)
{
	checkTypes(arguments, Scope);
	for (var i = 0; i < this._expressions.length; i++)
		this._expressions[i].initialiseReferences(scope);
};




main();
