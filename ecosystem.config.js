module.exports = {
  apps: [
    {
      name: "nfc-backend",
      script: "nodemon",
      args: "server.js --watch",
      watch: true,
      cwd: "./",
      interpreter: "node",
      env: {
        NODE_ENV: "development"
      }
    },
    {
      name: "nfc-ngrok",
      script: "ngrok",
      args: "http --url=seriously-trusting-octopus.ngrok-free.app --host-header=localhost:3000 3000",
      interpreter: "none",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
