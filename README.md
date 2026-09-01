# Vanitas

**Çoklu proje takip ve ajan destekli güncelleme uygulaması.**  
PARA yöntemine (Projects, Areas, Resources, Archives) dayalı, tamamen local-first, ücretsiz ve açık kaynak.

> **Sorun:** Eğitim projeleri + kişisel projeler + araştırma notları aynı anda ilerliyorsa, hangisi durdu?  
> **Çözüm:** Tek arayüzde görün, sohbet ederek güncelle, durgunları hatırlat.

---

## ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Proje Yönetimi** | Ekle, düzenle, sil, kategori/değişkenlerle filtrele |
| **PARA Uyarlaması** | Kategoriler: `eğitim` · `kişisel` · `araştırma` · Durumlar: `aktif` · `beklemede` · `fikir` · `arşiv` |
| **Hatırlatma Paneli** | 7+ gündür `updated_at` değişmeyen aktif projeler üstte, dikkat çekici |
| **Ajan (Opsiyonel)** | Ollama (yerel LLM) ile doğal dil: *"Vanitas'ta veritabanı bitti, arayüz sıra"* → proje güncellenir |
| **Ajansız Mod** | Ollama yoksa da manuel formla **tam işlevsel** |
| **Tek Komut** | `npm install && npm start` — derleme, Docker, bulut yok |

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- **Node.js 18+**
- (Opsiyonel) [Ollama](https://ollama.ai) — ajan için

### Kurulum

```bash
# 1. Repoyu klonla
git clone <repo-url>
cd vanitas

# 2. Bağımlılıkları yükle
npm install

# 3. (Opsiyonel) Ollama ile yerel model indir
# ollama pull llama3

# 4. Başlat
npm start
```

🌐 **http://localhost:3000** — hemen kullanmaya başla.

### Geliştirme Modu
```bash
npm run dev  # --watch ile auto-reload
```

---

## 🖥️ Arayüz Tanıtımı

### Üst Bar
- **Ajan durumu**: Yeşil = Ollama bağlı, Kırmızı = Ajansız mod

### Hatırlatma Paneli (Kırmızı/Sarı uyarı kutusu)
- `status = aktif` VE `updated_at > 7 gün` olan projeler
- "Güncelle" butonu → modal açar, not ekle / durum değiştir

### Sekmeler (Alt alta değil, yan yana tab'lar)
| Sekme | Filtre |
|-------|--------|
| Aktif Projeler | `status=aktif` + `category≠araştırma` |
| Kaynaklar (Araştırma) | `category=araştırma` |
| Arşiv | `status=arşiv` |
| Beklemede | `status=beklemede` |
| Fikirler | `status=fikir` |

### Proje Kartı
```
┌─────────────────────────────────┐
│ Proje Adı          [EĞİTİM][AKTİF]│
│ Son güncelleme: 28.08.2026 14:30 │
│                                 │
│ Notlar...                       │
│                                 │
│ [Düzenle] [Sil]                 │
└─────────────────────────────────┘
```

### Sohbet Kutusu (Alt kısım)
```
Sen: "X projesinde API entegrasyonu bitti, test yazıyorum"
Asistan: "X projesi güncellendi, 'test yazıyorum' notu eklendi."
```
- Proje adı geçerse otomatik eşleştirir
- Yeni not ekler, istersen `status` değiştirir
- Yanıt anında kart güncellenir

---

## 📦 API Dokümantasyonu

| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/projects` | Liste (query: `?category=egitim&status=aktif`) |
| `POST` | `/api/projects` | Oluştur `{title, category, status?, notes?}` |
| `PATCH` | `/api/projects/:id` | Güncelle (alanları partial) |
| `DELETE` | `/api/projects/:id` | Sil |
| `GET` | `/api/reminders` | Durgun projeler (`?days=7`) |
| `POST` | `/api/agent/message` | Ajan mesajı `{message: "..."}` |
| `GET` | `/api/agent/status` | Ollama erişilebilir mi? |

### Ajan İsteği Örneği
```bash
curl -X POST http://localhost:3000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Vanitas projesinde migration tamamlandı, seed scripti yazıyorum"}'
```
```json
{
  "success": true,
  "response": "Vanitas projesi güncellendi, 'seed scripti yazıyorum' notu eklendi.",
  "projectId": 3,
  "agentMode": true
}
```

---

## 🗄️ Veri Modeli

```sql
CREATE TABLE projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('egitim','kisisel','arastirma')),
  status       TEXT NOT NULL CHECK (status IN ('aktif','beklemede','fikir','arsiv')),
  notes        TEXT DEFAULT '',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**PARA Eşlemesi**
- **Projects (P)** → `status = aktif`
- **Resources (R)** → `category = arastirma` (henüz proje olmayan notlar)
- **Archives (A)** → `status = arsiv`
- **Areas** → v2'de eklenebilir (şimdilik kategori içinde)

---

## 🏗️ Mimari

```
vanitas/
├── package.json
├── .gitignore
├── README.md
├── server/
│   ├── index.js           # Express entry, static serve, reminders endpoint
│   ├── db.js              # SQLite (sqlite3), tablo oluşturma, CRUD fonksiyonları
│   ├── routes/
│   │   ├── projects.js    # REST CRUD
│   │   └── agent.js       # Ollama proxy + parser koordinasyonu
│   └── agent/
│       └── parser.js      # System prompt builder + JSON/regex parser
└── public/
    ├── index.html         # Sekmeli UI, modal, chat
    ├── app.js             # Vanilla ES modules: fetch, render, event delegation
    └── style.css          # Responsive, badge'li kartlar, chat balonları
```

### Teknoloji Yığını
| Katman | Seçim | Neden |
|--------|-------|-------|
| Backend | Node.js + Express | Basit, yaygın, type=module destekli |
| DB | SQLite (sqlite3) | Dosya tabanlı, kurulum yok, `better-sqlite3` Windows build sorunu yaşandı |
| Frontend | Vanilla JS + ES Modules | Build yok, 0 dependency, tarayıcıda doğal çalışır |
| LLM | Ollama (llama3/mistral) | Yerel, ücretsiz, API key yok, `format: json` destekli |
| Deployment | `npm start` tek komut | `git clone && npm install && npm start` |

---

## 🔧 Yapılandırma

| Ortam Değişkeni | Varsayılan | Açıklama |
|-----------------|------------|----------|
| `PORT` | `3000` | Sunucu portu |
| `OLLAMA_MODEL` | `llama3` | Kullanılacak model (Ollama'da indirilmiş olmalı) |
| `REMINDER_DAYS` | `7` | Hatırlatma eşiği (gün) |

`.env` dosyası oluşturulabilir (`.gitignore`'da hariç tutulmuş).

---

## 🧪 Test Etme

```bash
# Veritabanı manuel test
node -e "import('./server/db.js').then(m => m.createProject({title:'Test',category:'kisisel',status:'aktif'})).then(console.log)"

# Parser test
node -e "import('./server/agent/parser.js').then(m => { const p=[{id:1,title:'A',category:'kisisel',status:'aktif',updated_at:new Date()}]; console.log(m.parseAgentResponse('{\"action\":\"update\",\"project_id\":1,\"new_note\":\"deneme\"}',p)); })"

# API test (server çalışırken)
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/reminders
```

---

## 🗺️ Yol Haritası (v1 sonrası)

- [ ] **Çoklu kullanıcı** + basit auth (bcrypt + cookie)
- [ ] **Alanlar (Areas)** ayrı tablo + projeye bağlama
- [ ] **Tarayıcı bildirimleri** (Service Worker + Push API)
- [ ] **Dış LLM** opsiyonu (OpenAI/Anthropic key ile)
- [ ] **Mobil PWA** (manifest + offline cache)
- [ ] **Export/Import** (JSON, Markdown)
- [ ] **Proje içi görevler** (todo listesi)

---

## 🤝 Katkı

1. Fork → branch → commit → PR
2. Kod stili: Prettier (varsayılan), ESLint (yok, gerekirse eklenir)
3. Commit mesajları: Conventional Commits (`feat:`, `fix:`, `chore:`)

---

## 📄 Lisans

**MIT License** — serbest kullanım, değiştirme, dağıtım.

---

## 🙏 Teşekkürler

- [PARA Method](https://fortelabs.com/blog/para/) — Tiago Forte
- [Ollama](https://ollama.ai) — Yerel LLM çalıştırmayı bu kadar kolay yapan ekip
- [sqlite3](https://github.com/TryGhost/node-sqlite3) — Native SQLite binding
- [Express](https://expressjs.com) — Minimalist web framework

---

> **Not:** Bu proje "kendi ihtiyacımı giderdim" mantığıyla yazıldı. Eğer sen de aynı dertleri yaşıyorsan — eğitim projeleri, yan projeler, araştırma notları birbirine giriyor, hangisi durdu takip edemiyorsan — umarım faydalı olur. 

**Sorun/Öneri:** [Issue aç](https://github.com/<kullanici>/vanitas/issues) veya PR gönder.