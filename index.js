/*
* Module's dependencies
*/
var ldap    = require("ldapjs");
var Join    = require('join');
var Cache   = require("mem-cache");
var uuid    = require("node-uuid");

ldap.Attribute.settings.guid_format = ldap.GUID_FORMAT_N;

/**
 * LDAP class
 * Handles invocations to LDAP servicies.
 * @param settings {object} required
 *  -   url	     		: {string} Required. A valid LDAP url.
 *  -   username 		: {string} Optional.
 *  -   password 		: {string} Optional.
 *  -   timeout  		: {number} optional session timeout in milleseconds. Default 15 minutes. 
 *  -   socketPath       
 *  -   connectTimeout
 *  -   maxConnections
 *  -   bindDN
 *  -   bindCredentials
 *  -   checkInterval
 *  -   maxIdleTime 
*/

var LDAP = function(settings) {

	// Validates settings
	if (!settings || typeof settings!=='object') 			throw new Error("Constructor's argument is missing or invalid.");
    if (!settings.url   || typeof(settings.url)!=="string") throw new Error("'url' property is missing or invalid.");

    settings.timeout = settings.timeout || (15 * 60 * 1000);

    // Initialize members
    var self    = this;
    var config  = settings;
        
    var cacheOptions = {
        timeout: settings.timeout // 15 minutes in milliseconds
    };

    Object.defineProperty(this, "cacheAuth", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: new Cache(cacheOptions)
    });

    var cacheUser = new Cache(cacheOptions);


    this.authenticate = function (credentials, cb) {
        
        // defaults for credentials
        credentials = credentials || {};
        if (!cb && typeof credentials === 'function') {
            cb = credentials;
            credentials = {};
        }
        
        // defaults for cb
        cb = cb || function(err) { if(err) throw err; };
        if (typeof cb !== 'function') return cb(new Error("'cb' argument is invalid."));
        if (!credentials || typeof credentials !== 'object') return  cb(new Error("'credentials' argument is invalid."));

        // builds authentication data
        var username = credentials.username || config.username; 
        var password = credentials.password || config.password; 

        // Validates user credentials
        if (!username || typeof (username) !== 'string') return cb(new Error("'username' property is missing or invalid."));
        if (!password || typeof (password) !== 'string') return cb(new Error("'password' property is missing or invalid."));

        
        var auth = cacheUser.get(username);
        if (auth) {
            var item = self.cacheAuth.get(auth);
            if (item && item.password === password) return cb(null, { auth: auth, user: username });
        }

        var options = just(config, "url", "socketPath", "timeout", 
            "connectTimeout", "maxConnections", "bindDN", 
            "bindCredentials", "checkInterval", "maxIdleTime");

        var client = ldap.createClient(options);
        
        client.bind(username, password, function (err) {

            if (err) return cb(new Error("Authentication failed. " + (err instanceof Error) ? err.message : err.toString()));

            var auth = uuid.v4(); // Internal auth token 
            var item = {
                username: username,
                password: password,
                client  : client
            };

            self.cacheAuth.set(auth, item);  
            cacheUser.set(username, auth);
            
            cb(null, { auth: auth, user: username });
        });        
    };

    this.close = function (cb) {

        cb = cb || function() {};

        var count   = 0;
        var join    = new Join();
        self.cacheAuth.keys
            .forEach(function (key) { 
                var item = self.cacheAuth.get(key);
                if (item && item.client) {
                    count++;
                    item.client.unbind(join.add());
                };
            });


        if (count) {
            join.when(function () {
                self.cacheAuth.clean();
                cacheUser.clean();
                cb();
            });
        } else {
            self.cacheAuth.clean();
            cacheUser.clean();
            cb();
        }
    };

    /*
    * 	This method lets you send a query to LDAP.
	*
	*	@function query (args, cb)
	*   @param args : required options with two properties, base and options
	*       base    : Required string. Is a DN string.
	*       options : Optional object containing 
	*           scope 		: One of 'base', 'one', or 'sub'. Defaults to base.
	*           filter  	: A string version of an LDAP filter (see below), or a programatically constructed Filter object. Defaults to (objectclass=*).
	*           attributes  : Attributes to select and return (if these are set, the server will return only these attributes). Defaults to the empty set, which means all attributes.
	*           attrsOnly   : Boolean on whether you want the server to only return the names of the attributes, and not their values. Borderline useless. Defaults to false.
	*           sizeLimit   : The maximum number of entries to return. Defaults to 0 (unlimited).
	*           timeLimit   : The maximum amount of time the server should take in responding, in seconds. Defaults to 10. Lots of servers will ignore this.
	*   @param cb (function) Required. Callback function
    */
    this.query = function (args, cb) {

        // manage optional args
        if (!cb && typeof args === 'function') {
            cb = args;
            args = null;
        };

        // validates cb
        cb = cb || function(err) { if(err) throw err; };
        if (typeof cb !== 'function') throw new Error("'cb' argument is invalid.");
        
        // validates args
        args = args || {};
        if (typeof args !== 'object') return cb(new Error("'args' argument is invalid."));

        // validates args.base
        if (!args.base || typeof args.base !== 'string') return cb(new Error("'args.base' is missing or invalid."));
        
        // validates args.options
        args.options = args.options || {};
        if (typeof args.options !== 'object') return cb(new Error("'args.options' is invalid."));

        // gets client
        getItem(args, function(err, item) {
            if (err) return cb(err);

            try {
                item.client.search(args.base, args.options, function (err, res) {
                    if (err) return cb(err);

                    var data = {
                        entries: [],
                        referencies: []
                    };

                    res.on('searchEntry', function (entry) {
                        var entry = entry.json;
                        var atts = {};
                        if (entry.attributes && entry.attributes.length>0) {
                            entry.attributes.forEach(function (att) {
                                if (att.type && att.vals && att.vals.length>0) atts[att.type] = att.vals;
                            });
                        }

                        entry.attributes = atts;
                        data.entries.push(entry);
                    });

                    res.on('searchReference', function (ref) {
                        data.referencies.push(ref.json);
                    });

                    res.on('error', function (e) {
                        cb(e, data);
                    });

                    res.on('end', function (result) {
                        cb(null, data);
                    });
                });
            } catch (e) {
                cb(Error.create("Method threw an exception. " + (e instanceof Err ? e.message : e), e));
            }
        });
    };

    var getItem = function (args, cb) {
        
        // has the args an auth prop?
        if (!(args.auth)) {
        
            // try to authenticate an get a new auth
            self.authenticate(args, function (err, result) {
                if (err) return cb(err);    // an error ocurred on authentication proccess

                // returns access_token
                cb (null, self.cacheAuth.get(result.auth));
            });

        } else {

            // gets jive's info
            var item = self.cacheAuth.get(args.auth);
            if (!item) return cb(new Error("invalid 'auth' property.")); // tokens not found

            cb(null, item);
        }
    };
};

var just = function (source) {

    var result = {};
    Array.prototype.slice.call(arguments, 1)
        .forEach(function (prop) { result[prop] = source[prop]; });
    return result;
}

module.exports = LDAP;