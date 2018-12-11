import { Db } from 'mongodb';
import { Request, Response } from 'express';
import { Socket } from './lib/socket';


export interface DatabaseObject {
	urlGenerator: Function,
	db: any,
	client?: any,
	connect: Function,
	ensureIndexes: Function,
	initSchema?: Function
}
export interface RoutesType {
	path: string;
	method: string;
	action: (req: Request, res: Response, callback: Function) => void;
}

export interface ApiResponse {
	status: string;
	code  : number;
	data  : any;
}

export interface SocketType {
	path: string;
	instance?: Function;
	webSocketHandler: Function;
	socket_class?: Socket | any;
}

export interface UtilsType {
	respond : Function;
    uuid    : Function;
	applyRule: Function;
}


export interface IRequest extends Request {
	zone: string;
}

export class Indexable {
	[key: string] : any;
}

