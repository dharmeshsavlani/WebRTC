var WebSocketServer = require('ws').Server;
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

app.use(express.static(__dirname + "/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)
//creating a websocket server at port 9090
var wss = new WebSocketServer({server: server});

var users = {};

//when a user connects to our sever
wss.on('connection', function(connection) {
    console.log("user connected");

    //when server gets a message from a connected user
    connection.on('message', function(message){
        var data;
        //accepting only JSON messages
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        switch(data.type){
            case "login":
                console.log("User logged:", data.name);
                //if anyone is logged in with this username then refuse
                if(users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false,
                        users: []
                    });
                } else {
                    var ulist = [];
                    for(var key in users) {
                        ulist.push(key);
                    }
                    
                    //save user connection on the server
                    users[data.name] = connection;
                    connection.name = data.name;
                    sendTo(connection, {
                        type: "login",
                        success: true,
                        users: ulist
                    });
                }
                break;
            case "offer":
                //for ex. UserA wants to call UserB
                console.log("Sending offer to: ", data.name);
                
                //if UserB exists then send him offer details
                var conn = users[data.name];
                
                if(conn != null){
                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;
            case "answer":
                console.log("Sending answer to: ", data.name);
                
                //for ex. UserB answers UserA
                var conn = users[data.name];
                
                if(conn != null) {
                    connection.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer,
                        name: connection.name
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to:", data.name);
                var conn = users[data.name];
                
                if(conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate,
                        name: connection.name
                    });
                }
                break;
            case "leave":
                console.log("Disconnecting from ", data.name);

                if(users.hasOwnProperty(data.name)){
                    delete users[data.name];
                }

                var conn = users[data.name];

                for (const key in users) {
                    if (users.hasOwnProperty(key)) {
                        const user = users[key];
                        if(user.connection != null) {
                            sendTo(user.connection, {
                                type: "leave",
                                name: data.name
                            });
                        }
                    }
                }
                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command no found: " + data.type
                });
                break;
        }
    });

    connection.on("close", function() {
        if(connection.name) {
            console.log('Closing connection...' + connection.name);
            delete users[connection.name];
            for (const key in users) {
                if (users.hasOwnProperty(key)) {
                    const user = users[key];
                    if(user.connection != null) {
                        console.log("Disconnecting from ", key);
                        sendTo(user.connection, {
                            type: "leave",
                            name: key
                        });
                    }       
                }
            }
        }
    });
	
    function sendTo(connection, message) {
        connection.send(JSON.stringify(message));
    }

    connection.send("Hello from server");
});