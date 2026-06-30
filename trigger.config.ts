import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "personal-aiagent",
  dirs: ["./trigger"],
  runtime: "node",
  maxDuration: 3600,
});
