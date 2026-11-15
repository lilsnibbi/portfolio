import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : 4,
	reporter: [["list"], ["html", { open: "never" }]],
	outputDir: "./test-results",
	use: {
		baseURL,
		colorScheme: "dark",
		reducedMotion: "reduce",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium-desktop",
			use: {
				...devices["Desktop Chrome"],
				browserName: "chromium",
				viewport: { width: 1440, height: 900 },
			},
		},
		{
			name: "chromium-mobile",
			use: {
				...devices["Pixel 5"],
				browserName: "chromium",
			},
		},
	],
	webServer: {
		command: "bun run dev",
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
