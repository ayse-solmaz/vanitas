export function buildSystemPrompt(projects) {
  const projectList = projects.map(p => 
    `${p.id}: ${p.title} [${p.category}] - ${p.status} - Son güncelleme: ${p.updated_at}`
  ).join('\n');

  return `Sen bir proje takip asistanısın. Kullanıcının mesajından hangi projenin bahsedildiğini ve ne güncellemesi yapılması gerektiğini çıkar.

Mevcut projeler:
${projectList}

Kurallar:
1. Cevap SADECE geçerli JSON formatında olmalı
2. Eğer mesaj bir proje güncellemesi içermiyorsa: {"action": "none", "response": "Anladım, nasıl yardımcı olabilirim?"}
3. Eğer proje bulunamazsa: {"action": "none", "response": "Hangi projeyi kastediyorsun? Mevcut projeler: " + liste}
4. JSON formatı:
{
  "action": "update",
  "project_id": <id>,
  "new_note": "<eklenecek not>",
  "status_change": "<yeni durum: aktif|beklemede|fikir|arsiv|null>",
  "response": "<kullanıcıya dönecek doğal dil cevap>"
}`;
}

export function parseAgentResponse(responseText, projects) {
  try {
    const parsed = JSON.parse(responseText);
    
    if (parsed.action === 'none') {
      return { success: false, response: parsed.response };
    }

    if (!parsed.project_id || !projects.find(p => p.id === parsed.project_id)) {
      return { 
        success: false, 
        response: `Proje bulunamadı. Mevcut projeler: ${projects.map(p => `${p.id}: ${p.title}`).join(', ')}` 
      };
    }

    return { 
      success: true, 
      projectId: parsed.project_id,
      newNote: parsed.new_note || '',
      statusChange: parsed.status_change || null,
      response: parsed.response || 'Proje güncellendi.'
    };
  } catch (e) {
    // JSON parse hatası - regex fallback
    const idMatch = responseText.match(/project[_\s]?id["\s:]+(\d+)/i);
    const noteMatch = responseText.match(/new[_\s]?note["\s:]+["']([^"']+)["']/i);
    const statusMatch = responseText.match(/status[_\s]?change["\s:]+["']([^"']+)["']/i);
    const responseMatch = responseText.match(/response["\s:]+["']([^"']+)["']/i);

    if (idMatch) {
      const projectId = parseInt(idMatch[1]);
      if (projects.find(p => p.id === projectId)) {
        return {
          success: true,
          projectId,
          newNote: noteMatch?.[1] || '',
          statusChange: statusMatch?.[1] || null,
          response: responseMatch?.[1] || 'Proje güncellendi (parse edildi).'
        };
      }
    }

    return { 
      success: false, 
      response: 'Yanıt anlaşılamadı. Lütfen tekrar deneyin.' 
    };
  }
}