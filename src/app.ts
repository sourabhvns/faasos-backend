import * as express from 'express';


class App {
	public express: express.Express;

	constructor () {
		this.express = express()
	}
}

export default new App().express
