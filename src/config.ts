import { MongoClient, MongoError, MongoClientOptions } from 'mongodb';

import { DatabaseObject } from './models';
import Schema from "./schema";
import * as settings from "./settings";



let MONGO: DatabaseObject = {
	urlGenerator: function (creds: any) {
		var self = this;
		let authStr = creds.user + ":" + creds.pwd+'@';
		if(!creds.user || !creds.pwd)
			authStr = '';
		let hostStr: any = [];
		if (creds.host.constructor !== [].constructor) {
			return false;
		}
		for (var i = 0; i < creds.host.length; i++) {
			hostStr.push(creds.host[i] + ":" + creds.port[i]);
		}
		hostStr = hostStr.join(",");
		let dbName = creds.db;
		let replicaSet = "";
		if (creds.replicaSet) {
			replicaSet = "?replicaSet=" + creds.replicaSet;
		}
		var murl = "mongodb://" + authStr + hostStr + "/" + dbName + replicaSet;
		return murl;
	},
	db: {},
	client: {},
	connect: function (creds:any, callback: Function) {
		let self = this;
		let dbName:string = creds["db"];
		let url: string = self.urlGenerator(creds);
		if (!url) {
			callback(false);
			return false;
		}
		MongoClient.connect(url, { useNewUrlParser: true } as MongoClientOptions, (err: MongoError, client: any) => {
			if (err) {
				console.log("MONGO CONNECT ERROR", err);
				callback(false);
				throw "Mongo connection error, abort abort abort...";
			}
			self.client[dbName] = client;
			self.db[dbName] = client.db(dbName);
			if(self.initSchema){
				self.initSchema(self.db[dbName], dbName).then(() => {
					console.log("SCHEMA INIT SUCCESS: ", dbName);
					self.ensureIndexes(self.db[dbName], dbName).then(() => {
						console.log("Indexing Done for", dbName);
						callback(true);
					}).catch((err: any) => {
						console.log("Indexing Err: ", err);
						callback(false);
					});
				}).catch((err: any) => {
					console.log("SCHEMA INIT ERR: ", err);
					callback(false);
				});	
			}else{
				callback(true);
			}
		});
	},
	initSchema: function(db:any, dbName: string){

		return new Promise((resolve, reject) => {
			db.listCollections().toArray(function (err: any, collInfos: any) {
				if (err) {
					console.log("ERR: ", err.message);
					reject(err);
					return;
				}
				let s = new Schema.mongoSchema();
				let qList = s.getQueryList(dbName);
				// console.log("QLIST: ", qList);
				if (!qList) {
					console.log("No schema list found for: ", dbName);
					resolve();
					return;
				}
				let colls = [];
				for (var i in collInfos) {
					colls.push(collInfos[i]["name"]);
				}
				// console.log("Colls: ", colls);
				let count = 0, collLen = qList.length, errors:any = [];

				let respond = () => {
					count += 1;
					if (count === collLen) {
						if (errors.length) {
							reject(errors);
						} else {
							resolve();
						}
					}
				};

				for (var i in qList) {
					let sname = qList[i];
					let strct = s.getQuery(dbName, sname);
					// console.log("STRCT: ", strct);
					if (!strct) {
						respond();
						continue;
					}
					if (colls.indexOf(sname) > -1) {
						attachValidator(db, sname, strct).then((res:any)=>{
							respond();
						}).catch((err:any)=>{
							errors.push(err);
							respond();
						});
					} else {
						createCollection(db, sname, strct).then((res: any) => {
							respond();
						}).catch((err: any) => {
							errors.push(err);
							respond();
						});
					}
				}
			});
		});
	},
	ensureIndexes(db: any, dbName: string) {
		return new Promise((resolve, reject) => {
			const s = new Schema.mongoSchema();
			let list: any = s.getIndexList(dbName);
			for(let i in list) {
				let collection: string = list[i];
				let indexes: any = s.getIndex(dbName, collection);
				if(indexes) {
					for(let j in indexes) {
						let index: any = indexes[j];
						try {
							let res: any = db.collection(collection).ensureIndex(index);
						} catch(e) {
							console.log("Err in ensuring index", e);
						}
					}
				}
			}
			resolve(true);
		});
	}
}

function attachValidator(db: any, coll: string, querySet: any) {
	// console.log("Attach called");
	return new Promise((resolve, reject) => {
		let s = new Schema.mongoSchema();
		db.command({
			"collMod": coll,
			"validator": querySet,
			"validationLevel": "strict"
		}, (err:any, res:any) => {
			if(err){
				console.log("Attach Validation err: ", coll, err.message);
				reject(err);
				return;
			}
			console.log("Attach validation: ", coll);
			resolve(res);
		});
	});
}

function createCollection(db: any, coll: string, querySet: any) {
	// console.log("Create Called");
	return new Promise((resolve, reject) => {
		let options = {
			"validator": querySet,
			"validationLevel": "strict"
		}
		db.createCollection(coll, options, (err:any, res:any) => {
			if(err){
				console.log("Create Collection with Validation err: ", coll, err.message);
				reject(err);
				return;
			}
			console.log("Create Collection with Validation: ", coll);
			resolve(res);
		});
	});
}

export let Config: any = {
	port: 3001,
	DB  : {
		mongo: MONGO,
	},
}
