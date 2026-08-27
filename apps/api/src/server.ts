import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';

const start = async () => {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const app = createApp({ env });
  app.listen(env.API_PORT, () => {
    process.stdout.write(`core-api listening on ${env.API_PORT}\n`);
  });
};

start().catch((error) => {
  process.stderr.write(
    `core-api startup failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exit(1);
});
