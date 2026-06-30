import { ENV } from './config/env';
import { connectDB } from './config/db';
import app from './app';

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(ENV.PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${ENV.PORT}`);
    console.log(`📖  API prefix:  http://localhost:${ENV.PORT}/api`);
    console.log(`🌿  Environment: ${ENV.NODE_ENV}\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received — shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
