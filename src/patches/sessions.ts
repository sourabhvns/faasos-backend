import { ReadPreference, MongoError } from "mongodb";

import { Config } from '../config';
import { Client } from '../lib/db';

function execute(batch: any) {
	if(batch.length > 0) {
		batch.execute((err: any, res: any) => {
			if(err) {
				console.log("Error executing batch", err);
			} else {
				console.log("Batch execution success", res.toJSON());
			}
		});
	}
}

function addOrganizations() {
	let coll: any = Config.DB.mongo.db['default']['harmony'].collection('sessions');
	let psql: any = Client("pgsql", "handytrain");// Config.DB.pgsql.db['default']['handytrain'];
	coll.distinct("userid", {},
		{ readPreference: ReadPreference.SECONDARY_PREFERRED }, 
		function(err: MongoError, userids: string[]) {
			if(err) {
				console.log(err);
				process.exit(1);
			}
			console.log(userids);
			let query: string = `
				SELECT 
					cu.refid as cu_refid,
					org.refid as org_refid
				FROM
					authentication_customuser as cu
				LEFT JOIN
					organizations_organization as org
				ON
					cu.organization_id = org.id
				WHERE
					cu.refid in (${"'" + userids.join("','") + "'"})
			`;
			console.log(query);

			psql.query(query, (err: any, res: any) => {
				if(err) {
					console.log(err);
					process.exit(1);
				}
				let batch: any = coll.initializeUnorderedBulkOp();
				let batchsize: number = 500;
				for(let r in res.rows) {
					let row: any = res.rows[r];
					batch.find({ userid: row.cu_refid }).update({ $set: { organization: row.org_refid }});
					if(batch.length % batchsize === 0) {
						execute(batch);
						batch = coll.initializeUnorderedBulkOp();
					}
				}
				execute(batch);
			});
		});
}

export function run() {
	console.log("Patch called");
	addOrganizations();
}
