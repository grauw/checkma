Checkma
=======

Checkma, or checkmate, is a JavaScript static analysis tool which helps you to
detect and investigate problems with your JavaScript code.

It tries to do this in a manner that is easy to use, configurable, correct, and
tolerant towards different coding styles.

Installation
------------

    npm install -g checkma

Usage
-----

    checkma file.js                        # check a single script
    checkma code/*.js                      # check all scripts in a directory
    find . -name "*.js" | xargs checkma    # check scripts in all directories

Features
--------

Checkma is able to detect:

  * Undefined variables
  * New global variables
  * Unreferenced variables
  * Redeclared variables
  * Syntax errors

Ariya Hidayat’s [Esprima][1] is used for the JavaScript parsing.

[1]: http://esprima.org/

Developer information
---------------------

If you would like to do some hacking on checkma, clone the source code into your
development environment using [Mercurial][2]:

    hg clone https://bitbucket.org/grauw/checkma

Install a convenient global symlink with the following command:

    npm link

To contribute, [contact me][3] with a link to a repository with your changes and a
description. Please adhere to the existing code style, and make small commits
with good commit messages. If you like, send in your changes for review early,
so we can discuss them and agree on their direction.

[2]: http://mercurial.selenic.com/
[3]: http://www.grauw.nl/about.php

Authors
-------

  * Laurens Holst, <http://www.grauw.nl/>

Source code
-----------

<https://bitbucket.org/grauw/checkma>

License
-------

Copyright 2012 Laurens Holst

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  <http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
