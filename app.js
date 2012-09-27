var cluster = require('cluster')
	, numCPUs = require('os').cpus().length

if (cluster.isMaster) {
	var worker, i;
	// Fork workers.
	for (i = 0; i < numCPUs; i++) {
		worker = cluster.fork();
		console.info('Workerer #' + worker.id, 'with pid', worker.process.pid, 'is on');
	}

	cluster.on('exit', function(worker, code, signal) {
		console.info('Workerer #' + worker.id, 'with pid', worker.process.pid, 'died');
	});

} else {

	var express = require('express')
		, http = require('http')
		, path = require('path')
		, RedisStore = require('socket.io/lib/stores/redis')
		, redis = require('redis')
		, pub = redis.createClient()
		, sub = redis.createClient()
		, client = redis.createClient()
		, sio = require('socket.io');

	var app = express();
	var server
		, io;

	app.configure(function(){
		var i = 0;
		app.set('port', process.env.PORT || 3000);
		app.use(function (req, res, next) {
			console.info('Worker #' + cluster.worker.id, 'is going to handle the request');

			// do something to delay the worker
			while (i < 100000000) {
				i += 1;
			}

			next();
		});
		app.use(express.favicon());
		app.use(express.logger('dev'));
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(app.router);
		app.use(express.static(path.join(__dirname, 'public')));
	});

	app.configure('development', function(){
		app.use(express.errorHandler());
	});

	server = http.createServer(app).listen(app.get('port'), function(){
		console.info("Express server listening on port " + app.get('port'));
	});

	/* Setup Socket.IO */

	io = sio.listen(server);
	io.set('store', new RedisStore({
		redisPub: pub
		, redisSub: sub
		, redisClient: client
	}));
	io.sockets.on('connection', function (socket) {
		var i = 0;

		// do something to delay the worker
		while (i < 100000000) {
			i += 1;
		}

		// create a private room for each client
		// use connect time as private room name
		// you might want to use the client's session id instead
		socket.join(Date.now());

		// print out all rooms
		console.log('Worker #' + cluster.worker.id, 'receive a connection');
		console.log('Current rooms:');
		console.log(io.sockets.manager.rooms);

		socket.broadcast.emit('user connected');
	});

	/* End Setup Socket.IO */

}
