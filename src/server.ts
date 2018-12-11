import * as express from 'express';
import * as http from 'http';
import * as Websocket from 'ws';
// import * as url from 'url';
const url = require('url');

import { Config } from './config';
import { DATABASES, DBINIT, ALLOW_HEADERS } from "./settings";
import { Router } from './router';
import { RoutesType } from './models';
import { init } from './boot';
import { SocketServer, Socket } from './lib/socket';
import { Client } from './lib/db';
import { Utils } from "./lib/utils";


let port  = Config.port || 3000;

// Process name for easy Killing================
process.title = "fassos-server"
// =============================================

// Increase max listeners=======================
require("events").EventEmitter.defaultMaxListeners = 100;
// =============================================

let socket_handlers: any = {};

function mountRoutes (app: any): void {
	for (let thisApp in Router) {
		let router = require(Router[thisApp]).Router;
		app.use("/" + thisApp, router);	
	}
}

function mountWebSockets() {
	for(let thisApp in Router){
		let socket_routes = require(Router[thisApp]).AppSockets;
		if(!socket_routes){
			continue
		}
        
		let ws: any = new SocketServer(socket_routes.socket_class || Socket, { noServer: true });
		socket_handlers[socket_routes.path.replace(/^\/+|\/$/g, '')] = ws;
		socket_routes.webSocketHandler(ws);
		// console.log(socket_handlers);
	}
}

function websocketUpgradeHandler(request: Request, socket: WebSocket | any, head: any) {
	const pathname: string = url.parse(request.url).pathname.replace(/^\/+|\/$/g, '');
	// console.log('path', pathname);

	if(pathname in socket_handlers) {
		let websocket: any = socket_handlers[pathname];
		websocket.upgradeRequest(request, socket, head);
	} else {
		// if(pathname != 'socket.io') {
			console.log("Not path found");
			socket.destroy("No path found", function() {
				console.log("Destroyed", arguments);
			});
			// socket.destroy();
		// }
	}
}

function errorHandler() {
	(process as NodeJS.EventEmitter).on('unhandledRejection', function(err: Error) {
		console.warn("Unhandled promise rejection", err);
		// throw err;
		// process.exit(1);
	});
	return (err: Error, req: any, res: any, next: any) => {
		console.log("Unhandled Error", err);
		if (res.headersSent) {
			return next(err);
		}
		Utils.respond(res, err.message, "500", err.message);
	}
}


init((app: any) => {
    mountRoutes(app);
	app.use(errorHandler()); // This should be at last of middleware

    const server= http.createServer(app);
	server.on('upgrade', websocketUpgradeHandler);
	// mountSockets(server);
	mountWebSockets();

	let pnum: any = process.env.NODE_APP_INSTANCE; // For PM2 config
	port  = port + parseInt(pnum ? pnum : 0);
	console.log("PORT: ", port);
		(process as NodeJS.EventEmitter).on('SIGINIT', function() {
			console.log("Terminating server");
			process.exit();
			// Remove all clients
		});
    server.listen(port, (err: any) => {
        if (err) {
            return console.log(err)
        }

        return console.log(`server is listening on ${port}`)
    });

});

