var fs = require("fs");
var esprima = require("esprima");
var format = require("./utils").format;
var Program = require("./ast").Program;
var BuiltInVariable = require("./ast").BuiltInVariable;
var AutoGlobalVariable = require("./ast").AutoGlobalVariable;
var scopes = require("./ast").scopes;


function main()
{
	if (process.argv.length != 3)
		throw new Error("Missing required argument.");

	var path = process.argv[2];
	var content = fs.readFileSync(path, "ascii");
	var ast = esprima.parse(content);

	var program = new Program(ast);
	
	program.initialiseScope();
	program.initialiseReferences();

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
}


main();
