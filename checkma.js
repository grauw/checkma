var fs = require("fs");
var esprima = require("esprima");
var checkTypes = require("./utils").checkTypes;
var format = require("./utils").format;
var Program = require("./ast").Program;
var BuiltInVariable = require("./ast").BuiltInVariable;
var AutoGlobalVariable = require("./ast").AutoGlobalVariable;


function main()
{
	if (process.argv.length < 3)
		throw new Error("Missing source path parameter.");
	
	var checkers = [];
	for (var i = 2; i < process.argv.length; i++)
		checkers.push(new Checker(process.argv[i]));
	
	var self = this;
	var loadQueue = checkers.slice(0);
	loadQueue.slice(0).forEach(function(checker) {
		checker.addLoadListener(function() {
			loadQueue.splice(loadQueue.indexOf(checker), 1);
			if (!loadQueue.length)
				checkAll();
		});
		checker.load();
	});
	
	function checkAll() {
		checkers.forEach(function(checker) {
			checker.check();
		});
	}
}


function Checker(path)
{
	this._path = path;
	this._program = null;
	this._loadListeners = [];
}

Checker.prototype.load = function()
{
	var checker = this;
	fs.readFile(this._path, "ascii", function(error, source) {
		if (error)
			throw error;
		checker.parse(source);
	});
};

Checker.prototype.parse = function(source)
{
	checkTypes(arguments, "string");
	
	var ast = esprima.parse(source);

	var program = new Program(ast);
	
	program.initialiseScope();
	program.initialiseReferences();
	
	this._program = program;
	
	for (var i = 0; i < this._loadListeners.length; i++)
		this._loadListeners[i]();
};

Checker.prototype.addLoadListener = function(listener)
{
	checkTypes(arguments, Function);
	this._loadListeners.push(listener);
};

Checker.prototype.check = function()
{
	if (!this._program)
		throw new Error("Program not initialised.");

	console.log("Checking " + this._path + "...\n");
	
	var scopes = this._program.getGlobalScope().getScopes();
	
	scopes.forEach(function(scope) {
		scope.getMembers().forEach(function(member) {
			if (!(member instanceof BuiltInVariable))
			{
				if (!member.isReferenced())
				{
					console.log(format("Unreferenced variable \"%1\" in scope \"%2\".", member.getName(), scope.getName()));
				}
				
				if (member.isRedeclared())
				{
					console.log(format("Redeclared variable \"%1\" in scope \"%2\".", member.getName(), scope.getName()));
				}
				
				if (member instanceof AutoGlobalVariable)
				{
					if (member.isModified())
						console.log(format("New global variable \"%1\".", member.getName()));
					else
						console.log(format("Undefined variable \"%1\".", member.getName()));
				}
			}
		});
	});
	
	console.log();
};


main();
