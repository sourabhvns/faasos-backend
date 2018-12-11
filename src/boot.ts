import * as express from 'express';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';

import { Config } from './config';
import { Router } from './router';
import app from './app'
import { DATABASES, DBINIT, ALLOW_HEADERS } from "./settings";

import { Utils } from "./lib/utils";
import { Order } from "./orders/repository";


// Process name for easy Killing================
process.title = "harmony"
// =============================================

// Increase max listeners=======================
require("events").EventEmitter.defaultMaxListeners = 100;
// =============================================


function createDbConnections() {
	return new Promise((resolve, reject) => {
		let idx = 0, dbLen = 0;

		for (let dbType in DBINIT) {
			dbLen += DBINIT[dbType].length;
		}

		if(dbLen == 0){
			return resolve(true);
		}

		for (let dbType in DBINIT) {
			if (!(dbType in DATABASES)) {
				console.log(dbType, "not found in config Databases");
				return reject(false);
			}
			for (let i in DBINIT[dbType]) {
				// let [zone, dbName] = DBINIT[dbType][i].split('.');
				let dbName = DBINIT[dbType][i];
				// console.log(dbType, zone, dbName, DATABASES[dbType][zone][dbName]);
				if (!(dbName in DATABASES[dbType])) {
					console.log(dbName, "is not in", dbType);
					return reject(false);
				}
				Config.DB[dbType].connect(DATABASES[dbType][dbName], (res: boolean) => {
					if (res) {
						idx += 1;
						if (idx === dbLen) {
							resolve(true);
						}
					} else {
						console.log(dbName, "DB", dbType, "Type is unable to connect.");
						reject(false);
					}
				});
			}
		}
	});
}


let initHeaders: express.RequestHandler | express.ErrorRequestHandler = (req: express.Request, res: express.Response, next: Function) => {
	res.setHeader('Access-Control-Allow-Origin', req.get('origin') as any);
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);

	// Pass to next layer of middleware
	next();
}

export function init(callback: Function){
	let booting: Promise<any>[] = [createDbConnections()];
	Promise.all(booting).then((result: boolean[]) => {
		Order.updateInMemoryDashboard();
		app.use(bodyParser.json());
		app.use(morgan("dev"));
		app.use(initHeaders);

		let gracefulExit: any = () => {
			console.log("Graceful exit started");
			for(let dbName in Config.DB.mongo.client){
				let dbObj: any = Config.DB.mongo.client[dbName];
				console.log(`Closing database connection to: ${dbName}`);
				dbObj.close();
			}
			process.exit();
		}
	
		let signals: Array<any> = ["SIGHUP", "SIGINT", "SIGQUIT", "SIGABRT", "SIGTERM"]
		for(let i in signals){
			let signal: any = signals[i];
			process.on(signal, gracefulExit)
		}
		callback(app);
	}).catch((err: any) => {
		console.log("Booting ERR:", err);
		process.exit(1);
	});
}

