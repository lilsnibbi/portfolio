const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);
		let res: Response;
		switch (url.pathname) {
			case "/":
			case "/index.html": {
				res = new Response(Bun.file(`./public${url.pathname}`), {
					headers
				});
				break;
			}

			case "/favicon.ico": {
				res = new Response(null, {
					status: 204
				});

				break;
			}

			default: {
				res = new Response(null, {
					status: 404
				})
			}
		}

		return res;
	},
});