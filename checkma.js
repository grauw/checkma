var fs = require("fs");
var esprima = require("esprima");
var format = require("./utils").format;
var Program = require("./ast").Program;
var BuiltInVariable = require("./ast").BuiltInVariable;
var AutoGlobalVariable = require("./ast").AutoGlobalVariable;


function main()
{
	if (process.argv.length < 3)
		throw new Error("Missing source path parameter.");
	
	for (var i = 2; i < process.argv.length; i++)
		loadProgram(process.argv[i]);
}

function loadProgram(path)
{
	var source = fs.readFileSync(path, "ascii");
	parseProgram(path, source);
}

function parseProgram(path, source)
{
	var ast = esprima.parse(source);

	var program = new Program(ast);
	
	program.initialiseScope();
	program.initialiseReferences();
	
	checkProgram(path, program);
}

function checkProgram(path, program)
{
	console.log("Checking " + path + "...\n");
	
	var scopes = program.getGlobalScope().getScopes();
	
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
}


main();
