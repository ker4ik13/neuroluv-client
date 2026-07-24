const DEFAULT_PRODUCTION_API_URL = 'https://api.neuroluv.ru/v1';
const DEFAULT_DEVELOPMENT_API_URL = 'http://localhost:4000/v1';

export const AI_API_URL = (
	process.env.NEXT_PUBLIC_AI_API_URL ||
	(process.env.NODE_ENV === 'production'
		? DEFAULT_PRODUCTION_API_URL
		: DEFAULT_DEVELOPMENT_API_URL)
).replace(/\/$/, '');

export const AI_APP_URL = '/ai';

export const AI_SUPPORT_URL = (
	process.env.NEXT_PUBLIC_SUPPORT_URL || 'https://t.me/neuroluv_support'
).trim();
