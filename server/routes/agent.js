import { Router } from 'express';
import * as db from '../db.js';
import { buildSystemPrompt, parseAgentResponse } from '../agent/parser.js';

const router = Router();
const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    return res.ok;
  } catch {
    return false;
  }
}

router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mesaj gerekli' });

    const ollamaAvailable = await checkOllama();
    if (!ollamaAvailable) {
      return res.json({
        success: false,
        response: 'Ollama çalışmıyor. "Ajansız mod" - projeyi manuel güncelleyebilirsin.',
        agentMode: false
      });
    }

    const projects = await db.getAllProjects();
    const systemPrompt = buildSystemPrompt(projects);

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `${systemPrompt}\n\nKullanıcı: ${message}\n\nAsistan:`,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) throw new Error('Ollama hatası');

    const data = await response.json();
    const parsed = parseAgentResponse(data.response, projects);

    if (parsed.success) {
      const updates = {};
      if (parsed.newNote) {
        const project = await db.getProjectById(parsed.projectId);
        updates.notes = project.notes ? `${project.notes}\n${parsed.newNote}` : parsed.newNote;
      }
      if (parsed.statusChange) {
        updates.status = parsed.statusChange;
      }
      await db.updateProject(parsed.projectId, updates);
    }

    res.json({
      success: parsed.success,
      response: parsed.response,
      projectId: parsed.projectId,
      agentMode: true
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.json({
      success: false,
      response: 'Ajan hatası oluştu. Manuel güncelleme yapabilirsin.',
      agentMode: true
    });
  }
});

export default router;