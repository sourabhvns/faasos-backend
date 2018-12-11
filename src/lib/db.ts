import { Request, Response } from "express";

import { Config } from "../config";
import { IRequest } from "../models";
import { Utils } from "./utils";

const DB: any = Config.DB;

export let Client = (dbType: string, dbName: string) => {
    const db = DB[dbType].db[dbName];
	// console.log(DB[dbType].db, zone, dbName);
    return db;
    // return DB[dbType].dbHandler(db);
};

