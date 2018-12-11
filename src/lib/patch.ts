import { init } from "../boot";
import { Config } from '../config';


function runPatch(args: any[]) {
	if(args.length <= 2) {
		console.log("Please provide a patch name to run");
		process.exit();
	}
	let patch_name: string = args[2];
	let patch: any;
	try {
		patch = require("../patches/" + patch_name);
	} catch(error) {
		console.log(error);
		process.exit();
	}
	if(patch.run) {
		patch.run();
	} else {
		console.log(`${patch_name} does not have run method or you haven't exported run method`);
		process.exit();
	}
}

init((app: any) => {
	runPatch(process.argv);
});
