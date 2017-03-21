'use strict';

// During the test the env variable is set to test
process.env.NODE_ENV = 'test';

// Require the app after setting NODE_ENV
let app = require('../app.js');

// DB, Models and Schema
let mongoose = require("mongoose");
let Models = require(__base + 'models/User.js');
let User = Models.User;
let Car = Models.Car;
let Service = Models.Service;

// JSON Schema
let Schema = require(__base + 'jsonschema/schema.js');

// Authentication
let jwt = require('jsonwebtoken');

// Dev-dependencies
let chai = require('chai');
let expect = require('chai').expect;

// Chai setup
chai.use(require('chai-http'));
chai.use(require('chai-json-schema'));

// Top-level test block
describe('Tests', () => {
    // Top-level cleanup before all tests
    before((done) => {
        mongoose.connection.dropDatabase((err) => {
            done(err);
        });
    });

    // Top-level cleanup after all tests
    after((done) => {
        mongoose.connection.dropDatabase((err) => {
            done(err);
        });
    });

    describe('System', () => {
        describe('register', () => {
            // Cleanup
            before((done) => {
                mongoose.connection.dropDatabase((err) => {
                    done(err);
                });
            });

            it('should register a new user', (done) => {
                chai.request(app)
                    .post('/api/register')
                    .send({
                        email: "test@test.com",
                        password: "testpass",
                        name: "Test Testingson",
                        telephone: "420420420"
                    })
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                        }
                        expect(err).to.be.null;
                        expect(res).to.have.status(201);
                        expect(res.body).to.be.jsonSchema(Schema.Response.Basic);
                        done();
                    });
            });

            it('should not register a new user with illegal email', (done) => {
                chai.request(app)
                    .post('/api/register')
                    .send({
                        email: "bademail",
                        password: "testpass",
                        name: "Test Testingson",
                        telephone: "420420420"
                    })
                    .end((err, res) => {
                        expect(err).to.not.be.null;
                        expect(res).to.have.status(400);
                        done();
                    });
            });
        });

        describe('authenticate', () => {
            // Cleanup
            before((done) => {
                mongoose.connection.dropDatabase((err) => {
                    done(err);
                });
            });

            // Add test user
            before((done) => {
                TestHelper.addTestUser().then((user) => {
                    done();
                }, (err) => {
                    done(err);
                });
            });

            it('should authenticate a registered user', (done) => {
                chai.request(app)
                    .post('/api/authenticate')
                    .send({
                        email: "test@test.com",
                        password: "testpass"
                    })
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                        }
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        done();
                    });
            });

            it('should not authenticate a registered user against a bad password', (done) => {
                chai.request(app)
                    .post('/api/authenticate')
                    .send({
                        email: "test@test.com",
                        password: "badpass"
                    })
                    .end((err, res) => {
                        expect(err).to.not.be.null;
                        expect(res).to.have.status(500);
                        done();
                    });
            });
        });
    });

    describe('User', () => {
        // Test user object for use in tests
        let testUser;

        // Top-level cleanup before all tests
        before((done) => {
            mongoose.connection.dropDatabase((err) => {
                done(err);
            });
        });

        // Top-level cleanup after all tests
        after((done) => {
            mongoose.connection.dropDatabase((err) => {
                done(err);
            });
        });

        // The API key
        var authkey;

        // Cleanup
        before((done) => {
            mongoose.connection.dropDatabase((err) => {
                done(err);
            });
        });

        // Add test user and get Auth key
        before((done) => {
            TestHelper.addTestUser()
                .catch((err) => {
                    done(err);
                })
                .then((user) => {
                    authkey = TestHelper.getAuthKey(user);
                    testUser = user;
                    done();
                });
        });

        it('should get the user document', (done) => {
            chai.request(app)
                .get('/api/user')
                .set('x-access-token', authkey)
                .end((err, res) => {
                    if (err) {
                        console.log(err);
                    }
                    expect(err).to.be.null;
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.jsonSchema(Schema.Response.Basic);
                    expect(res.body.user).to.be.jsonSchema(Schema.Type.User);
                    done();
                });
        });

        describe('Car', () => {
            it("should get user's cars", (done) => {
                chai.request(app)
                    .get('/api/user/cars')
                    .set('x-access-token', authkey)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                        }
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res.body).to.be.jsonSchema(Schema.Response.Basic);
                        expect(res.body.cars).to.be.jsonSchema(Schema.Type.CarArray);
                        done();
                    });
            });

            it("should add new car", (done) => {
                chai.request(app)
                    .post('/api/user/cars')
                    .set('x-access-token', authkey)
                    .send({
                        model: "Test Model",
                        year: "2420"
                    })
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                        }
                        expect(err).to.be.null;
                        expect(res).to.have.status(201);
                        expect(res.body).to.be.jsonSchema(Schema.Response.Basic);
                        expect(res.body.car).to.be.jsonSchema(Schema.Type.Car);
                        done();
                    });
            });

            it("should remove a car", (done) => {
                // Get a random car ID
                var randomCarId = testUser.cars[Math.floor(Math.random()*testUser.cars.length)]._id;
                var id = new TextDecoder("utf-8").decode(randomCarId.id);
                chai.request(app)
                    .delete('/api/user/cars/' + id)
                    .set('x-access-token', authkey)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                        }
                        expect(err).to.be.null;
                        expect(res).to.have.status(204);
                        done();
                    });
            });
        });
    });
});

/**
 * Contains common helper methods for tests
 *
 * @class TestHelper
 */
class TestHelper {
    /**
     * Adds a test user to the DB
     *
     * @param {any} done Callback for Mocha to finish
     * @param {any} user The newly created User document
     * @memberOf TestHelper
     */
    static addTestUser() {
        return new Promise((resolve, reject) => {
            var testUser = new User({
                email: "test@test.com",
                password: "testpass",
                name: "Test Testingson",
                telephone: "420420420",
                cars: [
                    new Car({
                        model: 'Skoda Octavia',
                        year: '2011',
                        serviceBook: [
                            new Service({
                                date: new Date(Date.now()),
                                cost: '3200',
                                description: 'Replaced brakes'
                            })
                        ]
                    })
                ]
            });

            testUser.save((err, user) => {
                if (err) {
                    reject(err);
                }
                resolve(user);
            });
        });
    }

    /**
     * Signs a new Auth Token for the user specified
     *
     * @param {any} user
     * @returns Auth Token
     *
     * @memberOf TestHelper
     */
    static getAuthKey(user) {
        return jwt.sign(user, app.get('superSecret'), {
            expiresIn: '24h'
        });
    }
}