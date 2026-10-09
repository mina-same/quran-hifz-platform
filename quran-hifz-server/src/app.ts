import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { ENV } from './config/env';
import { errorHandler, notFound } from './middleware/error';

import authRoutes       from './routes/auth.routes';
import studentRoutes    from './routes/student.routes';
import teacherRoutes    from './routes/teacher.routes';
import masjidRoutes     from './routes/masjid.routes';
import attendanceRoutes from './routes/attendance.routes';
import evaluationRoutes from './routes/evaluation.routes';
import hifzRoutes       from './routes/hifz.routes';
import homeworkRoutes   from './routes/homework.routes';
import messageRoutes    from './routes/message.routes';
import kpiRoutes             from './routes/kpi.routes';
import statsRoutes           from './routes/stats.routes';
import parentRoutes          from './routes/parent.routes';
import trackRoutes           from './routes/track.routes';
import lessonRecordingRoutes from './routes/lesson-recording.routes';
import groupHomeworkRoutes   from './routes/group-homework.routes';
import quranPlanRoutes       from './routes/quran-plan.routes';
import adminRoutes           from './routes/admin.routes';
import tenantRoutes          from './routes/tenant.routes';
import platformRoutes        from './routes/platform.routes';

const app = express();

// ── Security & utilities ──────────────────────────────────────────────────────
app.use(helmet());
// CLIENT_URL may list several origins, comma-separated (production domain,
// custom domain, …) — e.g. "https://wardi-app.vercel.app,https://wardi.app".
const allowedOrigins = ENV.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin:      allowedOrigins.length > 1 ? allowedOrigins : allowedOrigins[0],
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: ENV.NODE_ENV, timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/tenants',    tenantRoutes);
app.use('/api/platform',   platformRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/students',   studentRoutes);
app.use('/api/teachers',   teacherRoutes);
app.use('/api/masajid',    masjidRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/hifz',       hifzRoutes);
app.use('/api/homework',   homeworkRoutes);
app.use('/api/messages',   messageRoutes);
app.use('/api/kpis',              kpiRoutes);
app.use('/api/stats',             statsRoutes);
app.use('/api/parent',            parentRoutes);
app.use('/api/tracks',            trackRoutes);
app.use('/api/lesson-recordings', lessonRecordingRoutes);
app.use('/api/group-homework',    groupHomeworkRoutes);
app.use('/api/quran-plans',       quranPlanRoutes);
app.use('/api/admin',            adminRoutes);

// ── 404 & error handler ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
