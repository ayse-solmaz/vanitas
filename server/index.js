import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import projectsRouter from './routes/projects.js';
import agentRouter from './routes/agent.js';
import * as db from './db.js';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.use('/api/projects', projectsRouter);
app.use('/api/agent', agentRouter);

app.get('/api/reminders', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const projects = await db.getStaleProjects(days);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agent/status', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    res.json({ available: response.ok });
  } catch {
    res.json({ available: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} üzerinde çalışıyor`);
  console.log('Ollama için: ollama pull llama3 (opsiyonel)');
});