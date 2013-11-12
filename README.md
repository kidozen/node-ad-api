# LDAP client for Nodejs
This node module provides a set of methods to interact as a client against a LDAP service.
The module was created as part of [KidoZen](http://www.kidozen.com) project, as a connector for its Enterprise API feature and it is based on module [ldapjs](ttps://github.com/mcavage/node-ldapjs).

## Installation

Use npm to install the module:

```
> npm install ldap-api
```

## Runing tests

Use npm to run the set of tests

```
> npA test
* `optional string. sOcketPath`:	If you're running an LDAP server over a Unix Domain Socket, use this.
```

## API

Due to the asynchronous nature of Nodejs, this module uses callbacks in requests. All callbacks have 2 arguments: `err` and `data`.

```
function callback (err, data) {
	// err contains an Error class instance, if a
	// data contains the resulting data
} 
``` 

### Constructor

The module exports a class and its constructor requires a configuration object with following properties:
* `url`: Required string. A valid LDAP url.
* `username`		: Optional string. AD's user name
* `password`		: Optional string. User's password
* `timeout`			: Optional number. Session timeout in milleseconds. Default 15 minutes.
* `socketPath` 		: Optional string. If you're running an LDAP server over a Unix Domain Socket, use this.       
* `connectTimeout`	: Optional number. How long the client should wait before timing out on TCP connections. Default is up to the OS.
* `maxConnections` 	: Optional number. Whether or not to enable connection pooling, and if so, how many to maintain.
* `bindDN`			: Optional string. The DN all connections should be bound as.
* `bindCredentials` : Optional string. The credentials to use with bindDN.
* `checkInterval`	: Optional number. How often to schedule health checks.
* `maxIdleTime`		: Optional number. How long a client can sit idle before initiating a health check (subject to the frequency set by checkInterval).

For more information about the optional properties, please read [ldapjs's page](http://ldapjs.org/client.html).


```
var AD = require("ad-api");
var ad = new AD({ url: "..." });
```

### Authentication
To invoke methods that require authentication, the developer can invoke them passing the user credentials (username & password) or the authentication token returned by the authenticate method.

#### authenticate(options, callback)
This method should be used to authenticate a user. A successed authentication will return an object instance containing the `auth` property. The value of this property is the authentication token that will be required by other methods.

**Parameters:**
* `options`: A required object instance containing authentication's parameters:
	* `username`: Required string.
	* `password`: Required string.
* `callback`: A required function for callback.

```
ad.authenticate({ username:"foo", password: "bar" }, function(err, result) {
	if (err) return console.error (err);
	console.log (result.auth);
});
```

### Methods
All public methods has the same signature, their have two arguments: `options` and `callback`.
* `options` must be an object instance containig all parameters for the method.
* `callback` must be a function.


#### query(args, callback)
This method sends an HTTP request to the REST service.

Parameters:

*   `args` (object) Required. Specifies query and options.
	* 	`auth`		: (string) optional. Authentication token.
	*	`username`	: (string) optional.
	* 	`password`	: (string) optional.	
	*	`base`		: (string) Require. Searchs against this DN.
	*	`options`	: (object) required.
		*	`scope`		  : (string) optional. One of `base`, `one`, or `sub`. Defaults to `base`.
		*	`filter`	  : (string) optional. A string version of an LDAP filter. Defaults to (objectclass=*).
		*	`attributes`  : (string array) optional. Attributes to select and return. Defaults to the empty set, which means all attributes.
		*	`attrsOnly`	  : (boolean) optional. Boolean on whether you want the server to only return the names of the attributes, and not their values. Defaults to false.
		*	`sizeLimit`	  : (number) optional. The maximum number of entries to return. Defaults to 0 (unlimited).
		*	`timeLimit`	  : (number) optional. The maximum amount of time the server should take in responding, in seconds. Defaults to 10. Lots of servers will ignore this.
*   `callback`: A required function for callback.

```
// get all users
ad.query({ auth:"....", base="o=foo", opions: { filter: "(&(objectCategory=person)(objectClass=user))" } }, function (err, result) {
	....
});
```