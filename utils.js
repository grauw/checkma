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

function format(string) {
	checkTypes(arguments, "string");
	for (var i = 1; i < arguments.length; i++)
		string = string.replace("%" + i, arguments[i]);
	return string;
}


/**
 * A limited parallel queue.
 * It allows you to iterate over items n at a time.
 * 
 * @param {Array} items The items to iterate over.
 * @param {number} limit The limit.
 */
function LimitQueue(items, limit)
{
	checkTypes(arguments, Array, "number");
	if (limit < 1)
		throw new Error("Limit must be a positive number.");
	
	this._remaining = items.slice(0).reverse();
	this._processing = [];
	this._limit = limit;
}

/**
 * Loop over all items in the queue, invoking a callback.
 * The callback has two parameters, the item and a done-callback function. When
 * the item has been processed, the done callback should be invoked to continue.
 * 
 * @param {Function} processCallback Callback invoked for each item.
 * @param {Function} doneCallback Callback invoked when the loop has finished.
 */
LimitQueue.prototype.forEach = function(processCallback, doneCallback)
{
	if (this._remaining.length == 0 && this._processing.length == 0)
		return doneCallback();
	
	while (this._remaining.length > 0 && this._processing.length < this._limit)
	{
		var item = this._remaining.pop();
		this._processing.push(item);
		processCallback(item, function(item) {
			this._processing.splice(this._processing.indexOf(item), 1);
			this.forEach(processCallback, doneCallback);
		}.bind(this, item));
	}
};


exports.extend = extend;
exports.checkTypes = checkTypes;
exports.format = format;
exports.LimitQueue = LimitQueue;
