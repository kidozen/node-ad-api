var ldap = require("ldapjs");
var server = ldap.createServer();

server.listen(5555, function() {
  console.log('LDAP server up at: %s', server.url);
});

server.bind('cn=root', function(req, res, next) {
	if (req.dn.toString() !== 'cn=root' || req.credentials !== 'secret')
		return next(new ldap.InvalidCredentialsError());

	res.end();
	return next();
});

server.search('o=foo', function(req, res, next) {
    res.send({dn:"o=foo", attributes: []});
	res.end();
	return next();
});

server.search('o=notFound', function(req, res, next) {
	res.end();
	return next();
});