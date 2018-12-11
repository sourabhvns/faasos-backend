import { Utils } from '../lib/utils';


export function validateOrderCreation(data: Object): any {
	let rule: any = {
		user: { "type": "string", "required": true },
		address: { "type": "string", "required": true },
		// auth_method: { "type": "enum", "in": ["otp", "password"], "required": false },
		// allow_course_groups: { "type": "boolean", "required": false },
	};

	return Utils.applyRule(rule, data);
}

export function validateUserCreation(data: Object): any {
	let rule: any = {
		name: { "type": "string", "required": true },
	};

	return Utils.applyRule(rule, data);
}
