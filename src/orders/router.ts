import * as express from "express"
import { RoutesType, SocketType } from '../models';
import { websocketHandler } from "./handlers";
// import { SyncSocket } from './socket';
import { Socket } from '../lib/socket';
import * as handlers from './handlers';

let router = express.Router()


router.all("/users", handlers.UserHandler.route());
router.all("/", handlers.OrderHandler.route());
router.all("/:refid/:status((delivered|live|canceled)$)", handlers.OrderDetailsHandler.route());

router.get("/test", function(request: any, response: any) {
    var fs = require("fs");
	fs.readFile(process.cwd() + "/src/orders/index.html", "utf8", function(err:any, res: any) {
        // console.log(err, res);
        if (err) {
            response.send(err);
        }
        response.send(res);
    });
});

export let Router = router
export let AppSockets: SocketType = {
	path: 'orders',
	webSocketHandler: websocketHandler,
	socket_class: Socket
}
