var iolib = require('socket.io')
  , path = require("path")
  , fs = require('fs')
  , BoardData = require("./boardData.js").BoardData;


var boards = {
	"anonymous" : {
		"data" : new BoardData(),
	}
};
var boardName = "anonymous";

function socketConnection (socket) {
	//On the first connection, send all previously broadcasted data
	boards[boardName].data.getAll(function(data) {
		socket.emit("broadcast", data);
	});

	socket.on('broadcast', function (data) {
		//Send data to all other connected users
		socket.broadcast.emit('broadcast', data);

		//Use setTimeout in order to be sure that the message is broadcasted
		// as soon as possible (before we do anything else on the server side)
		saveHistory(data);
	});
}

function saveHistory(message) {
	var id = message.id;
	var boardData = boards[boardName].data;
	switch (message.type) {
		case "delete":
			if (id) boardData.delete(id);
			break;
		case "update":
			delete message.type;
			if (id) boardData.update(id, message);
			break;
		case "child":
			boardData.addChild(message.parent, message);
			break;
		default: //Add data
			if (!id) console.error("Invalid message: ", message);
			else boardData.set(id, message);
	}
}

function generateUID (prefix, suffix) {
	var uid = Date.now().toString(36); //Create the uids in chronological order
	uid += (Math.round(Math.random()*36)).toString(36); //Add a random character at the end
	if (prefix) uid = prefix + uid;
	if (suffix) uid = uid + suffix;
	return uid;
}

if (exports) {
	exports.start = function(app) {
		boards[boardName].data.on("ready", function() {
			io = iolib.listen(app, {'log':false});
			io.sockets.on('connection', socketConnection);
			return io;
		});
	};
}
