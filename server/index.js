import { createApp } from './app.js';

try {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer between 1 and 65535.');
  const host = process.env.HOST || '127.0.0.1';
  const backend = await createApp();
  const httpServer = backend.app.listen(port, host, () => {
    console.info(`NoteHub API: http://${host}:${port}`);
    console.info(`Connected to MongoDB database: ${backend.db.databaseName}`);
  });
  httpServer.on('error', async (error) => {
    console.error(`Backend could not listen on ${host}:${port}: ${error.message}`);
    await backend.close();
    process.exitCode = 1;
  });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    httpServer.close(async () => {
      await backend.close();
      process.exit(0);
    });
    httpServer.closeIdleConnections();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error(`NoteHub backend could not start: ${error.message}`);
  console.error('Check MONGODB_URI in .env and make sure your local MongoDB service is running.');
  process.exitCode = 1;
}
