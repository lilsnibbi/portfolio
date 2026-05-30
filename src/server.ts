import staticPlugin from "@elysiajs/static";
import Elysia from "elysia";

const htmlContent = await Bun.file("./public/index.html").text();

new Elysia({
	name: "@core",
})
	.use(staticPlugin({
		prefix: "/p",
		indexHTML: false
	}))
	.get(
		"/",
		() =>
			new Response(htmlContent, {
				headers: { "Content-Type": "text/html" },
			}),
	)
	.listen(3000); 

console.log("🐼 LilSnibbi is running at http://localhost:3000");
