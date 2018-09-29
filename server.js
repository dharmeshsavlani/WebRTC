var WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090
var wss = new WebSocketServer({port: 9090});

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
                        success: false
                    });
                } else {
                    //save user connection on the server
                    users[data.name] = connection;
                    connection.name = data.name;
                    sendTo(connection, {
                        type: "login",
                        success: true
                     });
                }
                break;
            case "offer":
                //for ex. UserA wants to call UserB
                console.log("Sending offer to: ", data.name);
                
                //if UserB exists then send him offer details
                var conn = users[data.name];
                
                if(conn != null){
                    //setting that UserA connected with UserB
                    connection.otherName = data.name;
                    
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
                        answer: data.answer
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to:",data.name);
                var conn = users[data.name];
                
                if(conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }
                break;
            case "leave":
                console.log("Disconnecting from", data.name);
                var conn = users[data.name];
                conn.otherName = null;
                
                //notify the other user so he can disconnect his peer connection
                if(conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
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
            delete users[connection.name];
            
            if(connection.otherName) {
                console.log("Disconnecting from ", connection.otherName);
                var conn = users[connection.otherName];
                
                if(conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
    });
	
    function sendTo(connection, message) {
        connection.send(JSON.stringify(message));
    }

    connection.send("Hello from server");
});
// var http = require('http');
// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/plain'});
//   res.end('Hello World\n');
// }).listen(1337, "127.0.0.1");
// console.log('Server running at http://127.0.0.1:1337/');