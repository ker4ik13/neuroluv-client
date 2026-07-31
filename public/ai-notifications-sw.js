self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = {};
	}

	const title =
		typeof payload.title === 'string' && payload.title
			? payload.title.slice(0, 160)
			: 'Нейросеть';
	const body =
		typeof payload.body === 'string' ? payload.body.slice(0, 400) : '';
	const href =
		typeof payload.href === 'string' && payload.href.startsWith('/ai')
			? payload.href
			: '/ai';
	const tag =
		typeof payload.tag === 'string' && payload.tag
			? payload.tag.slice(0, 160)
			: 'neuroluv-ai';
	const icon = safeNotificationAsset(
		payload.icon,
		'/web-app-manifest-192x192.png',
	);
	const image = safeNotificationAsset(payload.image, null);

	event.waitUntil(
		self.registration.showNotification(title, {
			badge: '/favicon-96x96.png',
			body,
			data: { href },
			icon,
			...(image ? { image } : {}),
			renotify: false,
			tag,
		}),
	);
});

function safeNotificationAsset(value, fallback) {
	if (typeof value !== 'string' || !value) return fallback;
	try {
		const url = new URL(value, self.location.origin);
		if (
			url.protocol !== 'https:' &&
			!(url.protocol === 'http:' && url.origin === self.location.origin)
		) {
			return fallback;
		}
		return url.href;
	} catch {
		return fallback;
	}
}

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const candidate =
		typeof event.notification.data?.href === 'string'
			? event.notification.data.href
			: '/ai';
	const href = candidate.startsWith('/ai') ? candidate : '/ai';
	const targetUrl = new URL(href, self.location.origin).href;

	event.waitUntil(
		self.clients
			.matchAll({ includeUncontrolled: true, type: 'window' })
			.then(async (clients) => {
				for (const client of clients) {
					if (new URL(client.url).origin !== self.location.origin) continue;
					await client.navigate(targetUrl);
					return client.focus();
				}
				return self.clients.openWindow(targetUrl);
			}),
	);
});
