const env = require("./config/env");
const { createApp } = require("./app");

const app = createApp();

function getMaskedKeySuffix(value) {
  if (!value) {
    return "missing";
  }

  return value.slice(-6);
}

app.listen(env.PORT, () => {
  const instanceInfo = {
    pid: process.pid,
    cwd: process.cwd(),
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    startedAt: new Date().toISOString()
  };

  console.log("Backend listening", instanceInfo);
});
