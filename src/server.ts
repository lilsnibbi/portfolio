const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);
		const { pathname } = url;

		console.log(pathname)

		switch (true) {
			case pathname === "/":
			case pathname === "/index.html": {
				return new Response(Bun.file("./public/index.html"), { headers });
			}

			case pathname === "/favicon.ico": {
				return new Response(Bun.file("./public/img/favicon.ico"), {
					headers: {
						...headers,
						"Content-Type": "image/x-icon"
					}
				});
			}

			case pathname.startsWith("/public/"): {
				const file = Bun.file(`.${pathname}`);

				if (await file.exists()) {
					return new Response(file, { headers });
				}
				return new Response(null, { status: 404 });
			}

			case pathname.startsWith("/chunk-"): {
				const file = Bun.file(`./public${pathname}`);

				if (await file.exists()) {
					return new Response(file, { headers });
				}

				return new Response(null, { status: 404 });
			}

			default: {
				return new Response(null, { status: 404 });
			}
		}
	},
});
console.log("Server online");