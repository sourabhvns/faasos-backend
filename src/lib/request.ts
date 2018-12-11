import * as express from "express";
import { Request, Response } from "express";

// import { Voldemort } from "../lib/error";
import { Indexable } from "../models";
import { Utils } from "./utils";
import { IRequest } from "../models";

// const expressRouter: (options?: express.RouterOptions | undefined) => express.Router = express.Router;
const expressRouter: any = express.Router;


export function route(context: any) {
    return function(req: IRequest, res: Response, next: any) {
        let method = req.method.toLowerCase();
        let handler = context[method];

        if (typeof handler !== "function") {
			// throw new Voldemort("Method not allowed", 405);
            throw new Error("Method not allowed");
        }
        return handler.call(context, req, res, next);
    }
}

export class BaseHandler extends Indexable {

    public static route() {
        let Construct = this;
        let instance = new Construct();

		return function(request: Request, response: Response, next: Function) {
		// return function(request: IRequest, response: Response, next: Function) {
            let method: string = (typeof request.method == 'string') ? request.method.toLowerCase() : '';
            let handler: Function = instance[method];

			if(typeof instance["initialize"] === "function") {
				instance["initialize"].call(instance, request, response, next);
			}

            if (typeof handler !== "function") {
				// throw new Voldemort("Method not allowed", 405);
                throw new Error("Method not allowed");
            } else {
				if(method == "post" && instance.validator) {
					const [isValid, validationMsgs] = instance.validator(request.body);
					if(!isValid) {
						return Utils.respond(response, "", "400", validationMsgs);
					}
				}
                const result = handler.call(instance, request, response, next);
                return result;
            }
        }
    }
}

export let router = expressRouter(); // No need of this for now, but to add custom functionalities in future
