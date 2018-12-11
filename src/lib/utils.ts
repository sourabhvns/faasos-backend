import * as crypto from 'crypto';
import { Db, MongoError } from 'mongodb';
import { Request, Response } from 'express';
import { UtilsType } from '../models';
import * as http from 'http';
import * as https from 'https';
import { Config } from '../config';
import { APP_DEBUG } from '../settings';
import * as url from 'url';
import { Client } from "./db";


interface CommonResObject {
    status: String,
    code: String,
    data?: any,
    message?: String
}

function applyRule(rule: any, data: any, prepend?: string): boolean|[boolean, string[]] {
	let validationMsgs: string[] = [];
	let valid: boolean = true;
	prepend = prepend || "";
	for (const r in rule) {
		const column = rule[r];
		let log_r: string = prepend + r;
		if (column.required && data[r] === undefined) {
			valid = false;
			console.log(`${log_r} is required`);
			validationMsgs.push(`${log_r} is required`);
		}
		switch (column.type) {
			case "enum": {
				if (data[r] !== undefined 
					&& column.in.indexOf(data[r]) === -1) {
					valid = false;
					console.log(`${log_r} data must be '${column.in}', got '${data[r]}' instead`);
					validationMsgs.push(`${log_r} data must be '${column.in}', got '${data[r]}' instead`);
				}
				break;
			}
			case "array": {
				if (data[r] !== undefined 
					&& data[r].constructor != Array) {
					valid = false;
					console.log(`${log_r} must be of type array, got '${data[r]}' instead`);
					validationMsgs.push(`${log_r} must be of type array, got '${data[r]}' instead`);
				}
				break;
			}
			case "object": {
				if(data[r] !== undefined && rule[r].properties) {
					let recursiveResult: any | [boolean, string[]] = applyRule(rule[r].properties, data[r], r + ".");
					if(!recursiveResult[0]) {
						valid = false;
						validationMsgs = validationMsgs.concat(recursiveResult[1]);
					}
				}
				break;
			}
			default: {
				if(data[r] !== undefined && (typeof data[r] !== column.type)) {
					if(!(column.allow_null && data[r] === null)) {
						valid = false;
						console.log(`${log_r} data must be of ${column.type}`);
						validationMsgs.push(`${log_r} data must be of ${column.type}`);
					}
				}
				break;
			}
		}
	}
	return [valid, validationMsgs];
	// return valid;
}


export let Utils: UtilsType = {
    respond: (res: Response, data: any, code: String, message?: String) => {
        let sendData: CommonResObject = {
            "status": "failure",
            "code": code,
            "data": {},
            "message": ""
        }
        if (code == "200") {
            sendData["status"] = "success";
            sendData["data"] = data
        } else {
            sendData["message"] = message;
        }

        res.json(sendData);
    },
	uuid(length: number = 16, toHex: boolean = false): string {
		const buffer = crypto.randomBytes(length);

		if (toHex) {
			return buffer.toString("base64");
		}

		return buffer.toString("hex");
	},
	applyRule
}
