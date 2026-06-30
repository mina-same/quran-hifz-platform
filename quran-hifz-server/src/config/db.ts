import mongoose from 'mongoose';
import { ENV } from './env';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    console.log(`✅  MongoDB connected → ${ENV.MONGO_URI}`),
  );
  mongoose.connection.on('error', (err) =>
    console.error('MongoDB error:', err),
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('MongoDB disconnected'),
  );

  await mongoose.connect(ENV.MONGO_URI);
}
