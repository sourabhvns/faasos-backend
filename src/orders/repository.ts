import { Client } from "../lib/db";
import { Utils } from "../lib/utils";
import { Client as SocketClient } from "../lib/socket";


export let dashboard_data: any = {
	delivered: 0,
	pending: 0,
	canceled: 0,
	new_users: 0,
	existing_users: 0
};

function updateDashboard() {
	try {
		SocketClient.broadcast("orders", dashboard_data);
	} catch(err) {
	}
}

export function newConnectionDashboard() {
	let temp: number = dashboard_data.new_users;
}

export class User {
	private db: any;
	protected collection: any;
	protected allowed_filters: any = {
		name: { name: "name" },
		created__gt: { key: 'created', filter: (data: string) => { return { $gt: parseInt(data) }; } },
		created__gte: { key: 'created', filter: (data: string) => { return { $gte: parseInt(data) }; } },
		updated__gt: { key: 'updated', filter: (data: string) => { return { $gt: parseInt(data) }; } },
		updated__gte: { key: 'updated', filter: (data: string) => { return { $gte: parseInt(data) }; } },
	};

	constructor() {
		this.db = Client("mongo", "fassos");
		this.collection = this.db.collection("users");
	}

	create(data: any) {
		return new Promise((resolve, reject) => {
			data.refid = Utils.uuid();
			data.created = Date.now();
			data.updated = Date.now();
			this.collection.insertOne(data, (err: Error, res: any) => {
				if(err) {
					console.log(err);
					return reject(err);
				}
				if(res.ops.length > 0) {
					dashboard_data['new_users'] = dashboard_data['new_users'] + 1;
					updateDashboard();
					resolve(res.ops[0]);
				} else {
					reject(new Error("Unknow error"));
				}
			});
		});
	}

	filter(data: any) {
		let query: { [x: string]: string|boolean|Object } = {
		};
		let addQuery: Function = (key: string, value: any) => {
			query[this.allowed_filters[key].key] = this.allowed_filters[key].filter ? this.allowed_filters[key].filter(value) : value;
		};
		for(let key in this.allowed_filters) {
			if(key in data) {
				addQuery(key, data[key]);
			}
		}

		return this.collection.find(query).toArray();
	}
}

export class Order {
	private db: any;
	protected collection: any;
	protected allowed_filters: any = {
		user: { name: "user_id" },
		created__gt: { key: 'created', filter: (data: string) => { return { $gt: parseInt(data) }; } },
		created__gte: { key: 'created', filter: (data: string) => { return { $gte: parseInt(data) }; } },
		updated__gt: { key: 'updated', filter: (data: string) => { return { $gt: parseInt(data) }; } },
		updated__gte: { key: 'updated', filter: (data: string) => { return { $gte: parseInt(data) }; } },
		timestamp__gt: { key: 'timestamp', filter: (data: string) => { return { $gt: parseInt(data) }; } },
		timestamp__gte: { key: 'timestamp', filter: (data: string) => { return { $gte: parseInt(data) }; } },
	};

	constructor() {
		this.db = Client("mongo", "fassos");
		this.collection = this.db.collection("orders");
	}

	filter(data: any) {
		let query: { [x: string]: string|boolean|Object } = {
		};
		let addQuery: Function = (key: string, value: any) => {
			query[this.allowed_filters[key].key] = this.allowed_filters[key].filter ? this.allowed_filters[key].filter(value) : value;
		};
		for(let key in this.allowed_filters) {
			if(key in data) {
				addQuery(key, data[key]);
			}
		}

		if(data.graph == 'true') {
			return new Promise((resolve, reject) => {
				this.collection.aggregate([
					{ $match: query }, 
					{ $group: { _id: "$status", count: { $sum: 1 }}}
				]).toArray((err: Error, docs: any) => {
					if(err) {
						console.log(err);
						return reject(err);
					}

					let res: any = {'pending':0, 'canceled':0, 'delivered':0, 'new_users': 0, 'existing_users': 0};
					for(let doc of docs) {
						res[doc._id] = doc.count;
					}
					resolve(res);
				})
			});
		}
		return this.collection.find(query).toArray();
	}

	create(data: any) {
		return new Promise((resolve, reject) => {
			data.refid = Utils.uuid();
			data.status = "pending";
			data.timestamp = 0;
			data.created = Date.now();
			data.updated = Date.now();
			this.collection.insertOne(data, (err: Error, res: any) => {
				if(err) {
					console.log(err);
					return reject(err);
				}
				if(res.ops.length > 0) {
					dashboard_data['pending'] = dashboard_data['pending'] + 1;
					updateDashboard();
					resolve(res.ops[0]);
				} else {
					reject(new Error("Unknow error"));
				}
			});
		});
	}

	update(query: any, data: any) {
		return new Promise((resolve, reject) => {
			this.collection.findOneAndUpdate(query, data, (err: Error, res: any) => {
				if(err) {
					console.log(err);
					return reject(err);
				}
				if(res.value) {
					resolve(res.value);
				} else {
					reject(new Error("Order not found"));
				}
			});
		});
	}

	changeStatus(id: string, status: string) {
		return new Promise(async (resolve, reject) => {
			try {
				let order: any = await this.update({ refid: id, status: "pending" }, { $set: { status: status, timestamp: Date.now() }});
				switch(status) {
					case "delivered":
						dashboard_data['delivered'] = dashboard_data['delivered'] + 1;
						dashboard_data['pending'] = dashboard_data['pending'] - 1;
						break;
					case "canceled":
						dashboard_data['canceled'] = dashboard_data['canceled'] + 1;
						dashboard_data['pending'] = dashboard_data['pending'] - 1;
						break;
					default:
						break;
				}
				updateDashboard();
				resolve(order);
			} catch(err) {
				reject(err);
			}
		});
	}

	static updateInMemoryDashboard() {
		console.log("Updating in memory dashboard");
		let db: any = Client("mongo", "fassos");
		db.collection("orders").aggregate([
			{ $group: {
				_id: "$status",
				count: { $sum: 1 }
			}},
		]).toArray((err: Error, docs: any) => {
			if(err) {
				console.log(err);
				process.exit(1);
			}

			console.log(docs);
			for(let doc of docs) {
				dashboard_data[doc._id] = doc.count;
			}
		});

		db.collection("users").countDocuments().then((res: any) => {
			dashboard_data['existing_users'] = res;
		}).catch((err: Error) => {
			console.log(err);
		})
	}
}
