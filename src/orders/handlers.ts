import { Request, Response } from "express";
import * as Websocket from 'ws';

import { Utils } from "../lib/utils";
import { IRequest } from '../models';
import { Client as SockClient, SocketServer, Socket } from '../lib/socket';
// import { SyncSocket } from "./socket";
import { User, Order, dashboard_data } from "./repository";
import { BaseHandler, route } from "../lib/request";
import * as validators from "./validators";


export class UserHandler extends BaseHandler {
	initialize(request: IRequest, response: Response) {
		this.repo = new User();
	}

	get validator() {
		return validators.validateUserCreation;
	}

	get(request: IRequest, response: Response) {
		console.log("GET request", request.query);
		this.repo.filter(request.query).then((orders: any[]) => {
			Utils.respond(response, orders, 200, "");
		}).catch((err: Error) => {
			console.log(err);
			Utils.respond(response, [], 500, err.message);
		});
	}

	post(request: IRequest, response: Response) {
		console.log("POST request");
		this.repo.create(request.body).then((order: any) => {
			Utils.respond(response, order, 200, "");
		}).catch((err: Error) => {
			console.log(err);
			Utils.respond(response, [], 500, err.message);
		});
	}
}

export class OrderHandler extends BaseHandler {
	initialize(request: IRequest, response: Response) {
		console.log("initializing");
		this.repo = new Order();
	}

	get validator() {
		return validators.validateOrderCreation;
	}

	get(request: IRequest, response: Response) {
		console.log("GET request", request.query);
		this.repo.filter(request.query).then((orders: any[]) => {
			Utils.respond(response, orders, 200, "");
		}).catch((err: Error) => {
			console.log(err);
			Utils.respond(response, [], 500, err.message);
		});
	}

	post(request: IRequest, response: Response) {
		console.log("POST request");
		this.repo.create(request.body).then((order: any) => {
			Utils.respond(response, order, 200, "");
		}).catch((err: Error) => {
			console.log(err);
			Utils.respond(response, [], 500, err.message);
		});
	}
}

export class OrderDetailsHandler extends BaseHandler {
	initialize(request: IRequest, response: Response) {
		console.log("initializing");
		this.repo = new Order();
	}

	get(request: IRequest, response: Response) {
		console.log("GET request", request.query);
		this.repo.filter(request.query).then((orders: any[]) => {
			Utils.respond(response, orders, 200, "");
		}).catch((err: Error) => {
			console.log(err);
			Utils.respond(response, [], 500, err.message);
		});
	}

	post(request: IRequest, response: Response) {
		console.log("POST request");
		this.repo.changeStatus(request.params.refid, request.params.status).then((order: any) => {
			Utils.respond(response, order, 200, "");
		}).catch((err: Error) => {
			console.log(err);
			Utils.respond(response, [], 500, err.message);
		});
	}
}

export function websocketHandler(websocket: SocketServer) {
	let client: SockClient = new SockClient(websocket);

	/*
	websocket.use((sock: Socket, req: Request, next: Function) => {
		console.log("Socket authentication check 2", typeof sock);
		next(sock, req);
	});
	websocket.use(async (socket: SyncSocket, request: IRequest, next: Function) => {
		console.log("Socket authentication check 1", typeof sock);
		next(sock, req);
	});
	 */

	websocket.on('connection', function(socket: Socket, request: Request) {
		let client_id: string = socket.id; // Generate unique id using socket id and user id or headers
		client.add(client_id, socket);

		socket.send("orders", dashboard_data);
		console.log(dashboard_data);

		socket.on('error', function(error: any) {
			console.log("socket error", error);
		});
		socket.on('orders', function(info: { time: number, client: string }){
			client.broadcast("orders", { delivered: 1, canceled: 5, not_delivered: 5 });
		});
		socket.on('close', function(reason: any, message?: any) {
			console.log("Closing reason", reason, message);
			if(reason == 4009) {
				console.log("Previous session closed", socket.id);
				return;
			}
			client.remove(client_id);
			// socket.session.endSession();
		});
	});
}
