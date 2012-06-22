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

	console.log(program.scope);
}




/**
 * Class extension utility function
 * @param base The base class
 * @param constructor The constructor function for the new class
 */
function extend(base, constructor) {
	var prototype = new Function();
	prototype.prototype = base.prototype;
	constructor.prototype = new prototype();
	constructor.prototype.constructor = constructor;
	return constructor;
}




function Node(json)
{
	if (json.type != this.constructor.name)
		throw new Error(this.constructor.name + " type expected.");
	
	for (var property in json)
	{
		if (property == "type")
			continue;
		
		this[property] = createFromJson(json[property]);
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




function Scope(parent)
{
	this.parent = parent || null;
	this.members = {};
	this.members["this"] = new Reference();
}

Scope.prototype.lookupMember = function(id)
{
	return this.members[id] || (this.parent && this.parent.lookupMember(id)) || null;
};

Scope.prototype.addMember = function(id, reference)
{
	this.members[id] = reference;
};




function GlobalScope()
{
	Scope.call(this, null);
	this.members["undefined"] = new Reference();
}

extend(Scope, GlobalScope);

GlobalScope.prototype.lookupMember = function(id)
{
	if (this.members[id])
		return this.members[id];
	
	var reference = new Reference();
	reference.autoGlobal = true;
	this.members[id] = reference;
	return reference;
};




function Reference(declaration)
{
	this.declaration = declaration || null;
	this.references = [];
}

Reference.prototype.addReferrer = function(identifier)
{
	this.references.push(identifier);
};




function Program(json)
{
	Node.call(this, json);
	
	this.scope = null;
}

types.Program = extend(Node, Program);

Program.prototype.traverseStatements = function(callback)
{
	for (var i = 0; i < this.body.length; i++)
		this.body[i].traverseStatements(callback);
};

Program.prototype.initialiseScope = function()
{
	var scope = new Scope(new GlobalScope());
	
	// add function declarations
	this.traverseStatements(function(statement) {
		if (statement instanceof FunctionDeclaration)
			scope.addMember(statement.getId(), new Reference(statement));
	});
	
	// add variable declarations
	this.traverseStatements(function(statement) {
		if (statement instanceof VariableDeclaration)
			for (var i = 0; i < statement.declarations.length; i++)
				scope.addMember(statement.declarations[i].getId(), new Reference(statement.declarations[i]));
	});
	
	this.scope = scope;
};

Program.prototype.initialiseReferences = function()
{
	for (var i = 0; i < this.body.length; i++)
		this.body[i].initialiseReferences(this.scope);
};




function Statement(json)
{
	Node.call(this, json);
}

extend(Node, Statement);

Statement.prototype.traverseStatements = function(callback)
{
	callback(this);
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

VariableDeclaration.prototype.initialiseReferences = function(scope)
{
	for (var i = 0; i < this.declarations.length; i++)
		this.declarations[i].init.initialiseReferences(scope);
};




function VariableDeclarator(json)
{
	Node.call(this, json);
}

types.VariableDeclarator = extend(Node, VariableDeclarator);

VariableDeclarator.prototype.getId = function()
{
	return this.id.name;
};




function FunctionDeclaration(json)
{
	Statement.call(this, json);
	
	this.scope = null;
}

types.FunctionDeclaration = extend(Statement, FunctionDeclaration);

FunctionDeclaration.prototype.getId = function()
{
	return this.id.name;
};

FunctionDeclaration.prototype.initialiseScope = function(parent)
{
	var scope = new Scope(parent);
	
	// add parameters
	this.params.forEach(function(param) {
		scope.addMember(param.name, new Reference());
	});
	
	// add function declarations
	this.traverseStatements(function(statement) {
		if (statement instanceof FunctionDeclaration)
			scope.addMember(statement.getId(), new Reference(statement));
	});
	
	// add arguments object
	scope.addMember("arguments", new Reference());
	
	// add variable declarations
	this.traverseStatements(function(statement) {
		if (statement instanceof VariableDeclaration)
			for (var i = 0; i < statement.declarations.length; i++)
				scope.addMember(statement.declarations[i].getId(), new Reference(statement.declarations[i]));
	});
	
	this.scope = scope;
};

FunctionDeclaration.prototype.initialiseReferences = function(scope)
{
	this.body.initialiseReferences(this.scope);
};




function ExpressionStatement(json)
{
	Statement.call(this, json);
}

types.ExpressionStatement = extend(Statement, ExpressionStatement);

ExpressionStatement.prototype.initialiseReferences = function(scope)
{
	this.expression.initialiseReferences(scope);
};




function IfStatement(json)
{
	Statement.call(this, json);
}

types.IfStatement = extend(Statement, IfStatement);

IfStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.consequent.traverseStatements(callback);
	if (this.alternate)
		this.alternate.traverseStatements(callback);
};

IfStatement.prototype.initialiseReferences = function(scope)
{
	this.test.initialiseReferences(scope);
	this.consequent.initialiseReferences(scope);
	if (this.alternate)
		this.alternate.initialiseReferences(scope);
};




function ForStatement(json)
{
	Statement.call(this, json);
}

types.ForStatement = extend(Statement, ForStatement);

ForStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.body.traverseStatements(callback);
};

ForStatement.prototype.initialiseReferences = function(scope)
{
	if (this.init)
		this.init.initialiseReferences(scope);
	if (this.test)
		this.test.initialiseReferences(scope);
	if (this.update)
		this.update.initialiseReferences(scope);
	this.body.initialiseReferences(scope);
};




function ForInStatement(json)
{
	Statement.call(this, json);
}

types.ForInStatement = extend(Statement, ForInStatement);

ForInStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.body.traverseStatements(callback);
};

ForInStatement.prototype.initialiseReferences = function(scope)
{
	this.left.initialiseReferences(scope);
	this.right.initialiseReferences(scope);
	this.body.initialiseReferences(scope);
};




function WhileStatement(json)
{
	Statement.call(this, json);
}

types.WhileStatement = extend(Statement, WhileStatement);

WhileStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.body.traverseStatements(callback);
};

WhileStatement.prototype.initialiseReferences = function(scope)
{
	this.test.initialiseReferences(scope);
	this.body.initialiseReferences(scope);
};




function DoWhileStatement(json)
{
	Statement.call(this, json);
}

types.DoWhileStatement = extend(Statement, DoWhileStatement);

DoWhileStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.body.traverseStatements(callback);
};

DoWhileStatement.prototype.initialiseReferences = function(scope)
{
	this.test.initialiseReferences(scope);
	this.body.initialiseReferences(scope);
};




function SwitchStatement(json)
{
	Statement.call(this, json);
}

types.SwitchStatement = extend(Statement, SwitchStatement);

SwitchStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	for (var i = 0; i < this.cases.length; i++)
		for (var j = 0; j < this.cases[i].consequent.length; j++)
			this.cases[i].consequent[j].traverseStatements(callback);
};

SwitchStatement.prototype.initialiseReferences = function(scope)
{
	this.discriminant.initialiseReferences(scope);
	for (var i = 0; i < this.cases.length; i++)
		for (var j = 0; j < this.cases[i].consequent.length; j++)
			this.cases[i].consequent[j].initialiseReferences(scope);
};




function SwitchCase(json)
{
	Node.call(this, json);
}

types.SwitchCase = extend(Node, SwitchCase);




function BreakStatement(json)
{
	Statement.call(this, json);
}

types.BreakStatement = extend(Statement, BreakStatement);

BreakStatement.prototype.initialiseReferences = function(scope)
{
};




function ContinueStatement(json)
{
	Statement.call(this, json);
}

types.ContinueStatement = extend(Statement, ContinueStatement);

ContinueStatement.prototype.initialiseReferences = function(scope)
{
};




function ThrowStatement(json)
{
	Statement.call(this, json);
}

types.ThrowStatement = extend(Statement, ThrowStatement);

ThrowStatement.prototype.initialiseReferences = function(scope)
{
	this.argument.initialiseReferences(scope);
};




function TryStatement(json)
{
	Statement.call(this, json);
}

types.TryStatement = extend(Statement, TryStatement);

TryStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.block.traverseStatements(callback);
	for (var i = 0; i < this.handlers.length; i++)
		this.handlers[i].body.traverseStatements(callback);
	if (this.finalizer)
		this.finalizer.traverseStatements(callback);
};

TryStatement.prototype.initialiseReferences = function(scope)
{
	this.block.initialiseReferences(scope);
	for (var i = 0; i < this.handlers.length; i++)
		this.handlers[i].initialiseReferences(scope);
	if (this.finalizer)
		this.finalizer.initialiseReferences(scope);
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

CatchClause.prototype.initialiseReferences = function(scope)
{
	this.body.initialiseReferences(scope);
};




function BlockStatement(json)
{
	Statement.call(this, json);
}

types.BlockStatement = extend(Statement, BlockStatement);

BlockStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	for (var i = 0; i < this.body.length; i++)
		this.body[i].traverseStatements(callback);
};

BlockStatement.prototype.initialiseReferences = function(scope)
{
	for (var i = 0; i < this.body.length; i++)
		this.body[i].initialiseReferences(scope);
};




function ReturnStatement(json)
{
	Statement.call(this, json);
}

types.ReturnStatement = extend(Statement, ReturnStatement);

ReturnStatement.prototype.initialiseReferences = function(scope)
{
	this.argument.initialiseReferences(scope);
};




function LabeledStatement(json)
{
	Statement.call(this, json);
}

types.LabeledStatement = extend(Statement, LabeledStatement);

LabeledStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.body.traverseStatements(callback);
};

LabeledStatement.prototype.initialiseReferences = function(scope)
{
	this.body.initialiseReferences(scope);
};




function WithStatement(json)
{
	Statement.call(this, json);
}

types.WithStatement = extend(Statement, WithStatement);

WithStatement.prototype.traverseStatements = function(callback)
{
	callback(this);
	this.body.traverseStatements(callback);
};

WithStatement.prototype.initialiseReferences = function(scope)
{
	this.object.initialiseReferences(scope);
	this.body.initialiseReferences(scope);
};




function DebuggerStatement(json)
{
	Statement.call(this, json);
}

types.DebuggerStatement = extend(Statement, DebuggerStatement);

DebuggerStatement.prototype.initialiseReferences = function(scope)
{
};




function EmptyStatement(json)
{
	Statement.call(this, json);
}

types.EmptyStatement = extend(Statement, EmptyStatement);

EmptyStatement.prototype.initialiseReferences = function(scope)
{
};




function Expression(json)
{
	Node.call(this, json);
}

extend(Node, Expression);

Expression.prototype.initialiseReferences = function(scope)
{
	throw new Error("Must implement initialiseReferences().");
};




function Literal(json)
{
	Expression.call(this, json);
}

types.Literal = extend(Expression, Literal);

Literal.prototype.initialiseReferences = function(scope)
{
};




function Identifier(json)
{
	Expression.call(this, json);
	
	this.reference = null;
}

types.Identifier = extend(Expression, Identifier);

Identifier.prototype.initialiseReferences = function(scope)
{
	var reference = scope.lookupMember(this.name);
	if (!reference)
		throw new Error("Reference not found for identifier " + this.name);

	this.reference = reference;
	reference.addReferrer(this);
};




function MemberExpression(json)
{
	Expression.call(this, json);
}

types.MemberExpression = extend(Expression, MemberExpression);

MemberExpression.prototype.initialiseReferences = function(scope)
{
	this.object.initialiseReferences(scope);
};




function CallExpression(json)
{
	Expression.call(this, json);
}

types.CallExpression = extend(Expression, CallExpression);

CallExpression.prototype.initialiseReferences = function(scope)
{
	this.callee.initialiseReferences(scope);
};




function AssignmentExpression(json)
{
	Expression.call(this, json);
}

types.AssignmentExpression = extend(Expression, AssignmentExpression);

AssignmentExpression.prototype.initialiseReferences = function(scope)
{
	this.left.initialiseReferences(scope);
	this.right.initialiseReferences(scope);
};




function UpdateExpression(json)
{
	Expression.call(this, json);
}

types.UpdateExpression = extend(Expression, UpdateExpression);

UpdateExpression.prototype.initialiseReferences = function(scope)
{
	this.argument.initialiseReferences(scope);
};




function NewExpression(json)
{
	Expression.call(this, json);
}

types.NewExpression = extend(Expression, NewExpression);

NewExpression.prototype.initialiseReferences = function(scope)
{
	this.callee.initialiseReferences(scope);
};




function ThisExpression(json)
{
	Expression.call(this, json);
	
	this.reference = null;
}

types.ThisExpression = extend(Expression, ThisExpression);

ThisExpression.prototype.initialiseReferences = function(scope)
{
	this.reference = scope.lookupMember("this");
	this.reference.addReferrer(this);
};




function UnaryExpression(json)
{
	Expression.call(this, json);
}

types.UnaryExpression = extend(Expression, UnaryExpression);

UnaryExpression.prototype.initialiseReferences = function(scope)
{
	this.argument.initialiseReferences(scope);
};




function BinaryExpression(json)
{
	Expression.call(this, json);
}

types.BinaryExpression = extend(Expression, BinaryExpression);

BinaryExpression.prototype.initialiseReferences = function(scope)
{
	this.left.initialiseReferences(scope);
	this.right.initialiseReferences(scope);
};




function ConditionalExpression(json)
{
	Expression.call(this, json);
}

types.ConditionalExpression = extend(Expression, ConditionalExpression);

ConditionalExpression.prototype.initialiseReferences = function(scope)
{
	this.test.initialiseReferences(scope);
	this.consequent.initialiseReferences(scope);
	this.alternate.initialiseReferences(scope);
};




function LogicalExpression(json)
{
	Expression.call(this, json);
}

types.LogicalExpression = extend(Expression, LogicalExpression);

LogicalExpression.prototype.initialiseReferences = function(scope)
{
	this.left.initialiseReferences(scope);
	this.right.initialiseReferences(scope);
};




function ArrayExpression(json)
{
	Expression.call(this, json);
}

types.ArrayExpression = extend(Expression, ArrayExpression);

ArrayExpression.prototype.initialiseReferences = function(scope)
{
	for (var i = 0; i < this.elements.length; i++)
		this.elements[i].initialiseReferences(scope);
};




function FunctionExpression(json)
{
	Expression.call(this, json);
	
	this.scope = null;
}

types.FunctionExpression = extend(Expression, FunctionExpression);

FunctionExpression.prototype.getId = function()
{
	return this.id.name;
};

FunctionExpression.prototype.initialiseScope = function(parent)
{
	if (this.id)
	{
		// insert wrapper scope for the identifier
		// XXX: what about the identifier on object getters/setters?
		parent = new Scope(parent);
		parent.addMember(this.id.name, new Reference(this));
	}
	
	var scope = new Scope(parent);
	
	// add parameters
	this.params.forEach(function(param) {
		scope.addMember(param.name, new Reference());
	});
	
	// add function declarations
	this.traverseStatements(function(statement) {
		if (statement instanceof FunctionDeclaration)
			scope.addMember(statement.getId(), new Reference(statement));
	});
	
	// add arguments object
	scope.addMember("arguments", new Reference());
	
	// add variable declarations
	this.traverseStatements(function(statement) {
		if (statement instanceof VariableDeclaration)
			for (var i = 0; i < statement.declarations.length; i++)
				scope.addMember(statement.declarations[i].getId(), new Reference(statement.declarations[i]));
	});
	
	this.scope = scope;
};

FunctionExpression.prototype.initialiseReferences = function(scope)
{
	this.body.initialiseReferences(this.scope);
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

ObjectExpression.prototype.initialiseReferences = function(scope)
{
	for (var i = 0; i < this.properties.length; i++)
		this.properties[i].value.initialiseReferences(scope);
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




function SequenceExpression(json)
{
	Expression.call(this, json);
}

types.SequenceExpression = extend(Expression, SequenceExpression);

SequenceExpression.prototype.initialiseReferences = function(scope)
{
	for (var i = 0; i < this.expressions.length; i++)
		this.expressions[i].initialiseReferences(scope);
};




main();
