import Elysia from "elysia";

const htmlContent = await Bun.file("./src/routes/index.html").text();

new Elysia({
	name: "@core",
})
	.get(
		"/",
		() =>
			new Response(htmlContent, {
				headers: { "Content-Type": "text/html" },
			}),
	)
	.listen(3000); 

console.log("🐼 LilSnibbi is running at http://localhost:3000");
