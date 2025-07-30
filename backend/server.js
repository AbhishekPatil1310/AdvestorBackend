const buildApp = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');

(async () => {
  const app = buildApp();
  await connectDB(app);
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server running on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
})();
