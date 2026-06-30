const { tasks } = require("@trigger.dev/sdk");

async function run() {
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    console.error("Error: TRIGGER_SECRET_KEY is not set in your environment or .env file.");
    process.exit(1);
  }

  console.log("Triggering the hello-world task...");
  try {
    const handle = await tasks.trigger("hello-world", {
      message: "Hello from Trigger Script!"
    });
    console.log("Successfully triggered!");
    console.log("Run Handle ID:", handle.id);
    console.log("View the run at: https://cloud.trigger.dev");
  } catch (error) {
    console.error("Failed to trigger task:", error);
  }
}

run();
