'use strict';

var should = require('should'),
    testPort = 5000,
    io = require('socket.io-client'),
    server = require('socket.io').listen(testPort),
    base = require('../../sockets/base');

var socketURL = 'http://0.0.0.0:' + testPort;

var options ={
    transports: ['websocket'],
    'force new connection': true
},
    //Pah!
    clients = base(server);

var chatUser1 = {'name': 'Tom'},
    chatUser2 = {'name': 'Sally'},
    chatUser3 = {'name': 'Dana'};

describe("Chat Server", function() {

    /* Test 1 - A Single User */
    it('Should broadcast new user once they connect', function (done) {
        var client = io.connect(socketURL, options);

        client.on('connect', function(data) {
            client.emit('connection name', chatUser1);
        });

        client.on('new user', function(usersName) {
            usersName.should.be.type('string');
            usersName.should.equal(chatUser1.name + " has joined.");
            /* If this client doesn't disconnect it will interfere
             with the next test */
            client.disconnect();
            done();
        });
    });

    /* Test 2 - Two Users */
    it('Should broadcast new user to all users', function(done){
        var client1 = io.connect(socketURL, options);

        client1.on('connect', function(data){
            client1.emit('connection name', chatUser1);

            client1.on('new user', function(firstUserName) {
                /* Since first client is connected, we connect
                 the second client. */
                var client2 = io.connect(socketURL, options);

                client2.on('connect', function(data){
                    client2.emit('connection name', chatUser2);
                });

                client2.on('new user', function(usersName){
                    usersName.should.equal(chatUser2.name + " has joined.");
                    client2.disconnect();
                });
            });
        });

        var numUsers = 0;
        client1.on('new user', function(usersName){
            numUsers += 1;

            if(numUsers === 2){
                usersName.should.equal(chatUser2.name + " has joined.");
                client1.disconnect();
                done();
            }
        });
    });

    /* Test 3 - User sends a message to chat room. */
    it('Should be able to broadcast messages', function(done){
        var client1,
            client2,
            client3,
            nickForClient2 = 'Boaz',
            message = 'Hello BB';
        var messages = 0;

        var checkMessage = function(client){
            client.on('broadcast', function(msg){
                message.should.equal(msg.payload);
                nickForClient2.should.equal(msg.source);
                client.disconnect();
                messages++;
                if(messages === 3){
                    done();
                };
            });
        };

        client1 = io.connect(socketURL, options);
        checkMessage(client1);

        client1.on('connect', function(data){
            client2 = io.connect(socketURL, options);
            checkMessage(client2);

            client2.on('connect', function(data){
                client3 = io.connect(socketURL, options);
                checkMessage(client3);

                client3.on('connect', function(data){
                    client2.send(nickForClient2, message);
                });
            });
        });
    });

    /* Test 4 - User sends a private message to another user. */
    it('Should be able to send private messages', function(done){
        var client1, client2, client3;
        var message = {to: chatUser1.name, txt:'Private Hello World'};
        var messages = 0;

        var completeTest = function(){
            messages.should.equal(1);
            client1.disconnect();
            client2.disconnect();
            client3.disconnect();
            done();
        };


        var checkPrivateMessage = function(client){
            client.on('private message', function(msg){
                message.txt.should.equal(msg.txt);
                msg.from.should.equal(chatUser3.name);
                messages++;
                if(client === client1){
                    /* The first client has received the message
                     we give some time to ensure that the others
                     will not receive the same message.
                     TODO: Find better solution
                     */
                    setTimeout(completeTest, 40);
                };
            });
        };

        client1 = io.connect(socketURL, options);
        checkPrivateMessage(client1);

        client1.on('connect', function(data){
            client1.emit('connection name', chatUser1);
            client2 = io.connect(socketURL, options);
            checkPrivateMessage(client2);

            client2.on('connect', function(data){
                client2.emit('connection name', chatUser2);
                client3 = io.connect(socketURL, options);

                checkPrivateMessage(client3);

                client3.on('connect', function(data){
                    client3.emit('connection name', chatUser3);
                    client3.emit('private message', message);
                });
            });
        });
    });

    /* Test 5 - Test rename user. */
    it.skip('Should be able to change a name', function(done){
        var client1,
            message = {to: chatUser1.name, txt:'Private Hello World'},
            newUser,
            changed = false;

        client1 = io.connect(socketURL, options);

        client1.on('connect', function(data){
            client1.emit('connection name', chatUser1);
            //clone 'elegantly'
            newUser = JSON.parse(JSON.stringify(chatUser2));
            newUser.oldName = chatUser1.name;
            changed = true;
            client1.emit('connection name', newUser);

            client1.on('new user', function(msg) {
                if (changed) {
                    msg.from.should.equal(chatUser1.name);
                } else {
                    msg.from.should.equal(newUser.name);
                }
            });
        });
    });
});
