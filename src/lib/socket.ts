import * as Websocket from 'ws';
import { Server } from 'ws';
import { Request } from 'express';

import { Utils } from './utils';
import { Indexable } from '../models';
import { PING_INTERVAL_TIME } from '../settings';


export class Message extends Indexable {
	public event_name: string;
	public data: any;

	constructor(event_name: string, data: any) {
		super();
		this.event_name = event_name;
		this.data = data;
	}

	toJSON() {
		// console.log("TOJSON");
		return {
			"event": this.event_name,
			"data": this.data
		};
	}

	toString() {
		// console.log("Tostring");
		return JSON.stringify(this.toJSON());
	}
}

export class SocketServer extends Server {
	public id: string;
	private middlewares: Function[] = [];
	private middleware_stack: Function;
	private socket_class: Socket | any;

	constructor(socket_class: Socket | any, ...args: any[]) {
		super(...args);
		this.id = Utils.uuid();
		this.socket_class = socket_class;
		this.middleware_stack = (socket: Socket, request: Request) => {
			this.emit('connection', socket, request);
		};
	}

	use(middleware: Function) {
		this.middleware_stack = this.build_next(middleware, this.middleware_stack)
		// this.middlewares.unshift(middleware);
	}

	private build_next(middleware: Function, next: Function) {
		return (socket: any, request: any) => {
			// console.log(middleware, typeof socket, typeof request, next);
			middleware(socket, request, next);
		};
	}

	upgradeRequest(request: Request | any, socket: WebSocket | any, head: any) {
		let self = this;
		super.handleUpgrade(request, socket, head, function done(sock: WebSocket | any) {
			let socket: Socket = new self.socket_class(sock, request);
			self.middleware_stack(socket, request);
		});
	}
}

export class Socket {
	public id: string;
	public _socket: WebSocket | any; // as WebSocket extends EventEmitter but TSC does not recognize it
	public isAlive: boolean;
	public timestamp: number;

	constructor(socket: WebSocket, request: Request) {
		// super(...args);
		this._socket = socket;
		this.isAlive = true;
		this.id = Utils.uuid();
		this.timestamp = Date.now();
		this.handleIncomingMessages();
		this.handlePong();
	}

	private handleIncomingMessages() {
		this._socket.on('message', (data: any) => {
			try {
				data = JSON.parse(data);
				this._socket.emit(data.event, data.data);
			} catch(err) {
				console.log("Error decoding message (Did you stringify before sending?)", err.message);
				this.send("error", "Error decoding message (Did you stringify before sending?)");
			}
		});
	}

	private handlePong() {
		let self = this;
		this._socket.on('pong', function heartbeat() {
			console.log("Pong received for", self.id);
			self.isAlive = true;
		});
	}

	on(...args: any[]) {
		this._socket.on(...args);
	}

	close(...args: any[]) {
		this.isAlive = false;
		this._socket.close(...args);
		this._socket.emit('close', 10006, "OWN Disconnection ");
	}

	ping(...args: any[]) {
		this._socket.ping(...args);
	}

	terminate(...args: any[]) {
		console.log("Terminating due to ping pong not received");
		this._socket.terminate(...args);
		this._socket.emit('close', 10006, "Terminating due to ping pong not received");
	}

	send(event_name: string, data: any, callback?: Function) {
		// console.log("Sending", JSON.stringify(new Message(event_name, data)));
		if(!this.isAlive) {
			console.warn("Socket is not alive currently.");
		}
		let self = this;
		this._socket.send(JSON.stringify(new Message(event_name, data)), function ack(error: any) {
			let response: boolean = true;
			if(error) {
				response = false;
				console.log("Error sending message to", self.id, event_name, data);
				self.close();
			}
			if(callback){
				callback(response);
			}
		});
	}

	emit(event_name: string, data:any) {
		this.send(event_name, data);
	}

	disconnect(...args: any[]) {
		this.close(...args);
	}
}

export class Client {
	static clients: any = {};
	static playingPingPong: boolean = false;
	static interval: any;
	static INTERVAL_TIME: number = PING_INTERVAL_TIME;
	private socket_server: SocketServer;

	constructor(socket_server: SocketServer) {
		this.socket_server = socket_server;
	}

	add(unique_id: string, socket: Socket) {
		if(unique_id in Client.clients) {
			console.log("Replacing", unique_id);
		}
		console.log("Added", unique_id);
		Client.clients[unique_id] = socket;
		// console.log(Client.clients);
		// now remove from sokcet server
		// this.socket_server.clients.delete(socket);
		if(!Client.playingPingPong) {
			Client.playPingPong();
		}
	}

	get list() {
		return Client.clients;
	}

	broadcast(event_name: string, message: any) {
			/*
			let data: string = JSON.stringify(new Message(event_name, data));
			this.socket_server.clients.forEach(function each(client) {
				if (client !== socket._socket && client.readyState === Websocket.OPEN) {
					client.send(data);
				}
			});
			 */
		for(let id in this.list) {
			let sock: Socket | null = Client.fetch(id);
			if(sock) {
				sock.send(event_name, message);
			}
		}
	}

	static broadcast(event_name: string, message: any) {
			/*
			let data: string = JSON.stringify(new Message(event_name, data));
			this.socket_server.clients.forEach(function each(client) {
				if (client !== socket._socket && client.readyState === Websocket.OPEN) {
					client.send(data);
				}
			});
			 */
		for(let id in Client.clients) {
			let sock: Socket | null = Client.fetch(id);
			if(sock) {
				sock.send(event_name, message);
			}
		}
	}

	static fetch(unique_id: string): Socket | null {
		return Client.clients[unique_id];
	}

	static removeSocket(unique_id: string) {
		try {
			delete Client.clients[unique_id];
			console.log("Removed", unique_id);
		} catch(err) {
		}
	}

	remove(unique_id: string) {
		delete Client.clients[unique_id];
		console.log("Removed", unique_id);
		// console.log(Client.clients);
	}

	static playPingPong() {
		Client.playingPingPong = true;
		Client.interval = setInterval(function ping() {
			console.log("Started ping");
			for(let unique_id in Client.clients) {
				let socket: Socket = Client.clients[unique_id];
				// (function each(unique_id: string, socket: Socket) {
				if (socket.isAlive === false) {
					console.log("Pong did not receive", socket.id);
					Client.removeSocket(socket.id);
					return socket.terminate();
				}

					socket.isAlive = false;
					socket.ping(function noop() {
						console.log('pinging Done for', socket.id);
					});
					// })(unique_id, socket);
			}
		}, Client.INTERVAL_TIME)
	}

	static clear() {
		Client.clients = [];
		Client.playingPingPong = false;
		clearInterval(Client.interval);
	}
}

