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
	this.addMember("undefined", new Reference());
}

extend(Scope, GlobalScope);




function Reference(declaration)
{
	this.declaration = declaration || null;
}




function Program(json)
{
	Node.call(this, json);
	
	this.scope = null;
	
	this.initialiseScope();
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





function Statement(json)
{
	Node.call(this, json);
}

extend(Node, Statement);

Statement.prototype.traverseStatements = function(callback)
{
	callback(this);
};




function VariableDeclaration(json)
{
	Statement.call(this, json);
}

types.VariableDeclaration = extend(Statement, VariableDeclaration);




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




function ExpressionStatement(json)
{
	Statement.call(this, json);
}

types.ExpressionStatement = extend(Statement, ExpressionStatement);




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




function ContinueStatement(json)
{
	Statement.call(this, json);
}

types.ContinueStatement = extend(Statement, ContinueStatement);




function ThrowStatement(json)
{
	Statement.call(this, json);
}

types.ThrowStatement = extend(Statement, ThrowStatement);




function TryStatement(json)
{
	Statement.call(this, json);
}

types.TryStatement = extend(Statement, TryStatement);




/**
 * Catch clause of a try statement.
 * @param json
 */
function CatchClause(json)
{
	Node.call(this, json);
}

types.CatchClause = extend(Node, CatchClause);




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




function ReturnStatement(json)
{
	Statement.call(this, json);
}

types.ReturnStatement = extend(Statement, ReturnStatement);




function LabeledStatement(json)
{
	Statement.call(this, json);
}

types.LabeledStatement = extend(Statement, LabeledStatement);




function WithStatement(json)
{
	Statement.call(this, json);
}

types.WithStatement = extend(Statement, WithStatement);




function DebuggerStatement(json)
{
	Statement.call(this, json);
}

types.DebuggerStatement = extend(Statement, DebuggerStatement);




function EmptyStatement(json)
{
	Statement.call(this, json);
}

types.EmptyStatement = extend(Statement, EmptyStatement);




function Literal(json)
{
	Node.call(this, json);
}

types.Literal = extend(Node, Literal);




function Expression(json)
{
	Node.call(this, json);
}

extend(Node, Expression);




function Identifier(json)
{
	Expression.call(this, json);
}

types.Identifier = extend(Expression, Identifier);




function MemberExpression(json)
{
	Expression.call(this, json);
}

types.MemberExpression = extend(Expression, MemberExpression);




function CallExpression(json)
{
	Expression.call(this, json);
}

types.CallExpression = extend(Expression, CallExpression);




function AssignmentExpression(json)
{
	Expression.call(this, json);
}

types.AssignmentExpression = extend(Expression, AssignmentExpression);




function UpdateExpression(json)
{
	Expression.call(this, json);
}

types.UpdateExpression = extend(Expression, UpdateExpression);




function NewExpression(json)
{
	Expression.call(this, json);
}

types.NewExpression = extend(Expression, NewExpression);




function ThisExpression(json)
{
	Expression.call(this, json);
}

types.ThisExpression = extend(Expression, ThisExpression);




function UnaryExpression(json)
{
	Expression.call(this, json);
}

types.UnaryExpression = extend(Expression, UnaryExpression);




function BinaryExpression(json)
{
	Expression.call(this, json);
}

types.BinaryExpression = extend(Expression, BinaryExpression);




function ConditionalExpression(json)
{
	Expression.call(this, json);
}

types.ConditionalExpression = extend(Expression, ConditionalExpression);




function LogicalExpression(json)
{
	Expression.call(this, json);
}

types.LogicalExpression = extend(Expression, LogicalExpression);




function ArrayExpression(json)
{
	Expression.call(this, json);
}

types.ArrayExpression = extend(Expression, ArrayExpression);




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




/**
 * Object literal expression.
 * @param json
 */
function ObjectExpression(json)
{
	Expression.call(this, json);
}

types.ObjectExpression = extend(Expression, ObjectExpression);




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




main();
