import type { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import app from '../src/app';

let dbConnected = false;

async function ensureDB() {
  if (dbConnected || mongoose.connection.readyState >= 1) return;
  await connectDB();
  dbConnected = true;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDB();
  app(req, res);
}
