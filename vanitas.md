# Vanitas — Teknik Spesifikasyon

## Amaç
Birden fazla projeyi (eğitim/zorunlu projeler, kişisel projeler, araştırma/ilham notları) aynı anda yürüten kullanıcı için, projelerin durumunu tutan, kullanıcıyla sohbet ederek güncellenen ve durgun projeler için hatırlatma üreten, tamamen açık kaynak ve ücretsiz çalışan bir web uygulaması.

Kullanıcı hiçbir ücretli API'ye bağımlı olmak istemiyor. Sistem yerel olarak (kullanıcının kendi bilgisayarında veya kendi sunucusunda) `git clone` + `npm install && npm start` ile ayağa kalkmalı.

---

## Kapsam (v1)

1. Proje kayıtlarını tutan bir veri modeli (PARA yöntemine dayalı)
2. Bu kayıtları listeleyen/güncelleyen basit bir web arayüzü
3. Kullanıcıyla doğal dilde "sohbet" edip mesajdan proje güncellemesi çıkaran bir ajan katmanı
4. N gündür güncellenmeyen aktif projeler için hatırlatma paneli

---

## Veri Modeli (PARA)

Her proje kaydı şu alanlara sahip olmalı:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | integer | otomatik artan birincil anahtar |
| `title` | string | proje adı |
| `category` | enum | `egitim` \| `kisisel` \| `arastirma` |
| `status` | enum | `aktif` \| `beklemede` \| `fikir` \| `arsiv` |
| `notes` | text | serbest metin notlar, ajan tarafından da eklenebilir |
| `created_at` | datetime | oluşturulma tarihi |
| `updated_at` | datetime | son güncelleme tarihi — hatırlatma mantığı bunu kullanır |

**PARA eşlemesi:**
- Projeler (P) → `status = aktif` olan tüm kayıtlar
- Alanlar (A) → gerekirse v2'de eklenebilir, v1'de atlanabilir
- Kaynaklar (R) → `category = arastirma` olan kayıtlar (henüz proje olmayan ilham/referans notları)
- Arşivler (A) → `status = arsiv`

---

## Teknoloji Yığını (tamamen açık kaynak, ücretsiz)

- **Backend:** Node.js + Express
- **Veritabanı:** SQLite (dosya tabanlı, kurulum gerektirmez — `better-sqlite3` paketi önerilir)
- **Frontend:** Sade HTML + vanilla JS veya hafif bir framework (React zorunlu değil); build aracı gerektirmeyecek şekilde tutulabilir
- **Ajan / LLM katmanı:** Ollama (yerel, ücretsiz, API anahtarı gerektirmez) — `llama3` veya `mistral` gibi bir model önerilir. Ollama kurulu değilse bu katman devre dışı bırakılabilir ve uygulama "ajansız" (sadece manuel form ile proje güncelleme) modda çalışabilmeli.

---

## Klasör Yapısı (önerilen)

```
vanitas/
├── package.json
├── README.md
├── server/
│   ├── index.js          # Express giriş noktası
│   ├── db.js              # SQLite bağlantısı ve şema oluşturma
│   ├── routes/
│   │   ├── projects.js    # CRUD endpoint'leri
│   │   └── agent.js       # sohbet mesajını alıp Ollama'ya yönlendiren endpoint
│   └── agent/
│       └── parser.js      # LLM cevabını proje güncellemesine çeviren mantık
└── public/
    ├── index.html
    ├── app.js
    └── style.css
```

---

## API Uç Noktaları (v1)

| Metod | Yol | Açıklama |
|---|---|---|
| GET | `/api/projects` | tüm projeleri listeler, `category`/`status` query filtresi destekler |
| POST | `/api/projects` | yeni proje oluşturur |
| PATCH | `/api/projects/:id` | mevcut projeyi günceller (status, notes vb.) |
| DELETE | `/api/projects/:id` | proje siler (veya arşive taşır) |
| GET | `/api/reminders` | N günden (varsayılan 7) uzun süredir güncellenmeyen aktif projeleri döner |
| POST | `/api/agent/message` | kullanıcının sohbet mesajını alır, Ollama'ya gönderir, cevaptan proje güncellemesi çıkarır, ilgili projeyi günceller, kullanıcıya doğal dilde cevap döner |

---

## Ajan Davranışı

Kullanıcı örneğin şunu yazdığında:

> "X projesinde veritabanı kısmını bitirdim, sırada arayüz var"

Ajan şunları yapmalı:
1. Mesajı Ollama'ya, mevcut proje listesiyle birlikte bir prompt içinde gönderir (system prompt: "Sen bir proje takip asistanısın, kullanıcı mesajından hangi projenin bahsedildiğini ve durumun ne olduğunu JSON olarak çıkar")
2. Modelden yapılandırılmış JSON cevap ister: `{ "project_id": ..., "new_note": "...", "status_change": "..." }`
3. Bu JSON'u ilgili projeye uygular (`notes` alanına ekler, gerekiyorsa `status` günceller, `updated_at` yeniler)
4. Kullanıcıya doğal dilde onay cevabı döner ("X projesi güncellendi, arayüz kısmı sırada notu eklendi.")

**Not:** Ollama'nın JSON formatı garanti etmemesi ihtimaline karşı, cevabı parse ederken try/catch ile hataya dayanıklı yazılmalı; parse başarısız olursa kullanıcıya "anlayamadım, tekrar dener misin" gibi bir cevap dönülmeli.

---

## Hatırlatma Mantığı

- Sayfa yüklendiğinde `/api/reminders` çağrılır
- `status = aktif` olan projeler arasından `updated_at` üzerinden N günden (varsayılan 7, kullanıcı ayarlayabilir) eski olanlar üstte, dikkat çekici bir şekilde listelenir
- Cron job veya arka plan servisi gerekmez — istek anında hesaplanır, basit tutulur

---

## Arayüz (v1 minimum)

- Üstte hatırlatma paneli (durgun aktif projeler)
- Üç sütun/sekme: Aktif Projeler / Kaynaklar (Araştırma) / Arşiv
- Her proje kartında: başlık, kategori etiketi, son güncelleme tarihi, notlar
- Altta/yanda basit bir sohbet kutusu: mesaj yaz, gönder, ajan cevabı ve güncellenen proje kartı anında görünür güncellenir

---

## Sonraki Aşamalar (v1 sonrası, şimdi yapılmayacak)

- Kullanıcı girişi / çoklu kullanıcı desteği
- "Alanlar" (Areas) kategorisinin eklenmesi
- Bildirim/push (tarayıcı bildirimleri, e-posta vb.)
- Opsiyonel ücretli API entegrasyonu (kullanıcı isterse kendi anahtarını girebilsin diye ayar sayfası)
- Mobil uyumlu arayüz iyileştirmeleri

---

## Kabul Kriterleri (v1'in "bitti" sayılması için)

- [ ] Uygulama `npm install && npm start` ile tek komutla ayağa kalkıyor
- [ ] SQLite veritabanı otomatik oluşturuluyor (migration gerekmiyor)
- [ ] Proje ekleme/güncelleme/listeleme arayüzden çalışıyor
- [ ] Ollama kuruluysa sohbet üzerinden proje güncelleme çalışıyor
- [ ] Ollama kurulu değilse uygulama çökmeden "ajansız mod"a düşüyor
- [ ] 7 günden uzun süredir güncellenmeyen aktif projeler hatırlatma panelinde görünüyor
- [ ] README.md kurulum adımlarını (Node.js sürümü, Ollama kurulumu opsiyonel, `npm start`) açıkça anlatıyor
