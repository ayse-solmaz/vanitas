import { Router } from 'express';
import * as db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    const projects = await db.getAllProjects({ category, status });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await db.getProjectById(parseInt(req.params.id));
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, category, status, notes } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'title ve category zorunlu' });
    }
    const project = await db.createProject({ title, category, status: status || 'aktif', notes: notes || '' });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const project = await db.updateProject(parseInt(req.params.id), req.body);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.deleteProject(parseInt(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Proje bulunamadı' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;