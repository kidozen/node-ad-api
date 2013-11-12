require("./server.js");
var assert      = require("assert");
var Connector   = require("../index.js");
var settings    = null;

describe("ldap", function () {

    beforeEach ( function () {
        settings = {
            url: "ldap://localhost:5555"
        };
    })

    describe ("constructor", function ( ) {

        it("should fail if no arguments", function () {
            
            try {

                var con = new Connector();
                throw new Error ("Had to be thrown")

            } catch ( e ) {
                assert.ok(e);
                assert.ok(e instanceof Error);
                assert.equal("Constructor's argument is missing or invalid.", e.message);
            }
        });

        it("should fail if no url", function () {
            
            try {

                var con = new Connector({});
                throw new Error ("Had to be thrown")

            } catch ( e ) {
                assert.ok(e);
                assert.ok(e instanceof Error);
                assert.ok(e.message.indexOf("'url'") > -1);
            }
        });

        it("should be able to create an instance", function () {

            var con = new Connector(settings);
            assert.ok(con instanceof Connector);
        });
    });



    describe("authentication", function() {

        it("should fail if invalid credentials", function ( done ) {
            var con = new Connector(settings);
            con.authenticate("invalid credentials", function(err, result){
                assert.ok(err);
                assert.ok(err instanceof Error);
                assert.ok(err.message.indexOf('credentials') > -1);
                done();
            });
        });

        describe("authenticate using user and password", function() {
            
            it("should fail if no username", function ( done ) {
                var con = new Connector(settings);
                var options = {
                    password:"secret"
                };

                con.authenticate(options, function(err, result){
                    assert.ok(err);
                    assert.ok(err instanceof Error);
                    assert.ok(err.message.indexOf('username') > -1);
                    done();
                });
            });

            it("should fail if no password", function ( done ) {
                var con = new Connector(settings);
                var options = {
                    username:"cn=root"
                };

                con.authenticate(options, function(err, result){
                    assert.ok(err);
                    assert.ok(err instanceof Error);
                    assert.ok(err.message.indexOf('password') > -1);
                    done();
                });
            });
 
            it("should authenticate", function ( done ) {

                var con = new Connector(settings);
                var options = {
                    username:"cn=root",
                    password:"secret"
                };

                con.authenticate(options, function(err, result) {
                    assert.ok(!err);
                    assert.ok(result);
                    assert.equal('string', typeof result.auth);
                    assert.equal(36, result.auth.length);
                    done();
                });
            });
        });
    });

    describe("query", function ( ) {

        describe("if no credentials were configured", function() {

            it("should fail if not auth value, user credentials were passed within option argument, ", function ( done ) {

                var con = new Connector(settings);
                con.query({ base:"o=foo" }, function (err, result) {
                    assert.ok(err);
                    assert.ok(err instanceof Error);
                    assert.ok(err.message.indexOf('username') > -1);
                    done();
                });
            });

            it("should be able to authenticate and invoke a method passing auth value" , function (done) {

                var con = new Connector(settings);
                con.authenticate({ username:"cn=root", password:"secret" }, function (err, result) {
                    assert.ok(!err);
                    assert.ok(result);
                    assert.equal("string", typeof result.auth);
                    assert.equal(36, result.auth.length);

                    con.query({ auth: result.auth, base:"o=foo" }, function (err, result) {
                        assert.ok(!err);
                        assert.ok(result);
                        assert.ok(result.entries[0]);
                        assert.equal("o=foo", result.entries[0].objectName);
                        assert.ok(result.entries[0].attributes);
                        assert.equal(1, result.entries[0].attributes.bar.length);
                        assert.equal("baz", result.entries[0].attributes.bar[0]);
                        done();
                    });
                });
            });

            it ("should invoke if user credentials were passed" , function (done) {
                var con = new Connector(settings);
                con.query({ username:"cn=root", password:"secret", base:"o=foo" }, function (err, result) {
                    assert.ok(!err);
                    assert.ok(result);
                    assert.ok(result.entries[0]);
                    assert.equal("o=foo", result.entries[0].objectName);
                    done();
                });
            });
        });

        describe ("if credentials were configured", function() {

            it ("should use configured user credentials if not auth value was passed within option argument, ", function ( done ) {

                var con = new Connector({ username: "cn=root", password: "secret", url: settings.url });
                con.query({ base:"o=foo" }, function (err, result) {
                    assert.ok(!err);
                    assert.ok(result);
                    assert.ok(result.entries[0]);
                    assert.equal("o=foo", result.entries[0].objectName);
                    done();
                });
            });
        });
    });
});
