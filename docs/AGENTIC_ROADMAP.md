# Agentic Ally — Akıllı Agent Roadmap

**Last Updated:** February 10, 2026

> Bu dosya "daha akıllı agentic" için fikirleri ve roadmap'i tutar. Referans için kullanılır.

---

## 0. 🧱 Foundation (Code Quality) — **✅ TAMAMLANDI** (Şubat 2026)

**Odak:** Kritik path'lerin test coverage'ı ve hata yönetimi standardizasyonu.

**Yapılanlar:**
- **kv-service:** 72% coverage, 41 test (save/get phishing, smishing, microlearning, namespace, LIST error handling)
- **autonomous-phishing-handlers:** 58% coverage, 17 test (tool-first, agent fallback, upload/assign edge cases)
- **autonomous-smishing-handlers:** 86% coverage, 10 test (user/group, resolveSmishingMethod, smishingId validation)
- **Error handling:** `docs/ERROR_HANDLING.md` — Tool'larda `{ success: false, error }` vs `throw` standardı dokümante edildi

**Sonuç:** Kritik modüller daha güvenli; yeni geliştirmelerde tutarlı hata pattern'i kullanılacak.

---

## 1. 🧠 Active Learning (Metadata Correlation) — **✅ TAMAMLANDI** (Şubat 2026)

**Sorun:** Kullanıcı simülasyona tıkladığında hangi psikolojik tetikleyicinin (Authority Bias, Scarcity vb.) etkili olduğu bilinmiyordu.

**Çözüm (uygulandı):** Her simülasyon upload edildiğinde D1 `campaign_metadata` tablosuna metadata yazılıyor:
```json
{ "resourceId": "sim-123", "tactic": "Authority, Fear", "scenario": "CEO Fraud", "difficulty": "Hard" }
```
UserInfoAgent timeline analiz ederken bu metadata ile JOIN yapıp "Bu kullanıcı Authority + Fear kombinasyonuna duyarlı" gibi insight üretebilir.

**Sonuç:** Eğitim önerileri kişiye özel hale gelir (örn. "Authority Figürlerini Sorgulama" modülü).

---

## 2. ⚖️ Critic Agent (Self-Correction)

**Akış:** Phishing/Smishing agent içerik ürettikten sonra bir Critic agent kontrol etsin:
- Ton tutarlı mı?
- PII / gerçek veri sızıntısı var mı? (kart no, SSN pattern — dil bağımsız)
- Gerçekçi mi?

**Not:** "Yasak kelime" listesi 200 dil için sürdürülemez; PII/pattern kontrolü dil bağımsızdır.

---

## 3. 🐝 Agent Swarm (Collaboration)

**Örnek:** MicrolearningAgent quiz sorusu yazarken PhishingEmailAgent'tan "Finans senaryosu için örnek subject line" isteyebilir.

**Sonuç:** Daha tutarlı ve gerçekçi eğitim içerikleri.

**Not:** Delegate tools yaklaşımı ile orta zorlukta uygulanabilir. Şimdilik roadmap'te kalsın; ihtiyaç olunca değerlendirilir.

---

## 4. 🗄️ Long-Term Memory (User Persona)

**Veri:** Cloudflare Vectorize ile kullanıcı "Security Persona":
- Zayıflıklar (örn. "3 QR phishing testinde başarısız")
- Tercihler (örn. "Türkçe içerik daha iyi")
- Geçmiş (örn. "Q1'de Badge Security eğitimini aldı")

**Sonuç:** Zorluk ve konu seçimi kişiye göre ayarlanır.

---

## 5. 🛠️ Daha Hızlı Uygulanabilecekler

- **Structured logging (JSON):** Datadog/Sentry entegrasyonu.

---

## 6. 📋 Kalite Önerileri (Öncelik Sırasına Göre)

| # | Öneri | Etki | Efor | Açıklama |
|---|-------|------|------|----------|
| 1 | **PII / Pattern kontrolü** | Yüksek | Düşük | Dil bağımsız: kredi kartı, SSN, gerçek email pattern — LLM çıktısında yanlışlıkla gerçek veri sızmasını engelle. Yasak kelime listesi 200 dil için sürdürülemez. |
| 2 | **Metrikler** | Orta | Orta | ✅ Tamamlandı — `generation_duration_ms` (chat + autonomous). Log tabanlı; Logpush/Datadog ile toplanabilir. json_repair log'u kaldırıldı (gereksiz gürültü). |
| 3 | **Schema validation tutarlılığı** | Orta | Düşük | `validateToolResult` birçok yerde var; eksik yerlerde de kullan. Erken hata yakalama. |
| 4 | **Prompt versioning** | Orta | Orta | Kritik prompt'ları versiyonla; A/B test veya regression için. |
| 5 | **E2E smoke test** | Orta | Orta | ✅ Tamamlandı — /health, /chat, /autonomous (7 test). `npm run test:smoke` |
| 6 | **Sentry / error tracking** | Yüksek | Düşük | ✅ `/health` response'a `sentry: { configured: boolean }` eklendi. SENTRY_DSN varlığına göre. |
| 7 | **Input sanitization audit** | Orta | Düşük | `isSafeId` kullanımı tutarlı mı? User-provided input'lar sanitize ediliyor mu? |
| 8 | **Retry coverage** | Orta | Düşük | ✅ Tamamlandı — auth-token, get-user-info (timeline), user-search-utils, product-service, vishing-conversations-summary, list-phone-numbers. |

---

## Implementation Priority

1. ~~**Foundation (Coverage + Error Handling)**~~ — ✅ Tamamlandı (Şubat 2026).
2. ~~**Active Learning (Metadata Correlation)**~~ — ✅ Tamamlandı (Şubat 2026).
3. **Critic Agent** — Güvenilirlik artışı (PII/pattern kontrolü ile başlanabilir).
4. **Agent Swarm** — Karmaşık senaryolar için.
5. ~~**Long-Term Memory**~~ — Şimdilik geç.

---

# Active Learning (#1) — Uygulama Planı

## Chat vs Autonomous — İkisi de dahil edilebilir

| Akış | Metadata nereden gelir? | Dahil mi? |
|------|--------------------------|-----------|
| **Autonomous** | `executePhishingToolFirst` — simulation objesi (tactic, persuasion_tactic) zaten var | ✅ Evet |
| **Chat** | `uploadPhishingTool` — KV'dan phishing base okur; base'de tactic/triggers olmalı | ✅ Evet (KV'a eklenirse) |

**✅ Uygulandı:** `savePhishingBase` KV'a `psychologicalTriggers` kaydediyor. `uploadPhishingTool` upload başarılı olduktan sonra `trySaveCampaignMetadataAfterUpload` ile D1'e yazıyor. **Hem Chat hem Autonomous** aynı upload tool'u kullandığı için ikisi de kapsanıyor.

## "Hep benzer şeyler üretir mi?"

Hayır. Active Learning **çeşitliliği azaltmaz**, tam tersine **kişiselleştirmeyi artırır**:

- **Metadata olmadan:** UserInfoAgent timeline'dan genel analiz yapar → "Phishing 101" gibi generic öneri.
- **Metadata ile:** "Bu kullanıcı Authority+Fear taktiğine düştü" → "Authority Figürlerini Sorgulama" modülü gibi **spesifik** öneri.

Yani aynı kullanıcıya hep aynı şey önerilmez; geçmiş başarısızlıklara göre farklı taktikler denenir.

---

## Genel Akış

```
[Phishing Agent] → simülasyon üretir (tactic, emotion, difficulty)
       ↓
[Upload Tool] → Product API'ye yükler → resourceId döner
       ↓
[YENİ: Metadata Writer] → D1 campaign_metadata tablosuna yazar
       ↓
[Assign Tool] → Kullanıcıya atar (resourceId ile)
       ↓
[Kullanıcı tıklar] → Product timeline'a "Clicked resourceId X" kaydeder
       ↓
[UserInfo Agent] → Timeline alır → resourceId'ler için metadata JOIN → "Authority+Fear duyarlı" insight
```

## Adım 1: D1 Tablosu

`agentic_ally_memory` (veya yeni DB) içinde:

```sql
CREATE TABLE IF NOT EXISTS campaign_metadata (
  resource_id TEXT PRIMARY KEY,
  tactic TEXT,
  persuasion_tactic TEXT,
  scenario TEXT,
  difficulty TEXT,
  scenario_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Adım 2: Metadata Kaydetme Noktası (Tek nokta = Chat + Autonomous)

**Önerilen yer:** `upload-phishing-tool.ts` — upload başarılı olduktan sonra.

Neden burada?
- Hem Chat hem Autonomous aynı `uploadPhishingTool` kullanıyor.
- Tool zaten KV'dan phishing base okuyor (phishingData).
- resourceId upload response'dan geliyor.

```typescript
// uploadPhishingTool execute() içinde, worker API başarılı olduktan sonra:
const resourceId = result.scenarioResourceId || result.templateResourceId || result.resourceId;
if (resourceId && env?.agentic_ally_memory) {
  await saveCampaignMetadata(env.agentic_ally_memory, {
    resourceId,
    tactic: phishingData.psychologicalTriggers?.join(', ') || phishingData.topic,
    scenario: phishingData.topic,
    difficulty: phishingData.difficulty,
  });
}
```

**✅ Yapıldı:** `savePhishingBase` KV'a `psychologicalTriggers` kaydediyor (kv-service.ts).

## Adım 3: UserInfo Agent — Metadata JOIN

**Dosya:** `get-user-info-tool.ts`

- Product timeline API'si `resourceId` veya `scenarioResourceId` döndürüyorsa: her activity için metadata çek.
- `enrichActivities` veya LLM prompt'una ekle: "Kullanıcı X simülasyonuna tıkladı — bu simülasyon Authority Bias + Fear taktiği kullanıyordu."
- **Bağımlılık:** Product API `/api/leaderboard/get-user-timeline` response'unda her activity için `resourceId` veya `scenarioResourceId` olmalı. Yoksa Product ekibinden eklenmesi istenmeli.

## Adım 4: Smishing için Aynı Mantık — **✅ TAMAMLANDI**

`upload-smishing-tool` — upload sonrası `trySaveCampaignMetadataAfterUpload` ile metadata yazıyor. `saveSmishingBase` KV'a `psychologicalTriggers` kaydediyor.

## Özet Checklist

- [x] D1 migration: `campaign_metadata` tablosu (`migrations/0002_campaign_metadata.sql`)
- [x] `saveCampaignMetadata()` + `getCampaignMetadata()` (campaign-metadata-service.ts)
- [x] `savePhishingBase` (kv-service): `psychologicalTriggers` base'e eklendi
- [x] `upload-phishing-tool`: upload sonrası `trySaveCampaignMetadataAfterUpload` ile metadata yaz
- [x] `upload-smishing-tool`: upload sonrası metadata yaz (smishing için)
- [x] Product API: timeline'da `scenarioResourceId`/`resourceId` alanı — ✅ Tamamlandı
- [x] `get-user-info-tool`: timeline activities için metadata fetch + `[Tactic: X]` prompt zenginleştirme

**Deploy sonrası:** `npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0002_campaign_metadata.sql`

---

# Sıradaki Adımlar (Devam)

## Agent Tarafında Tamamlandı ✅

- Phishing + Smishing: KV base → upload → D1 metadata flow
- UserInfo: timeline enrichment (resourceId varsa `[Tactic: X]` ekleniyor)

## Yapılacaklar

### 1. Product API — ✅ Tamamlandı

Timeline API artık her activity için `scenarioResourceId` veya `resourceId` döndürüyor. Active Learning tactic enrichment tam çalışır.

### 2. Öncelikli Özellikler (Roadmap)

| Sıra | Özellik | Değer |
|------|---------|-------|
| 1 | **Critic Agent** — Phishing/Smishing çıktısını PII/pattern, ton, gerçekçilik açısından kontrol | Güvenilirlik |
| 2 | **Long-Term Memory** — Vectorize ile kullanıcı persona (zayıflıklar, tercihler) | Kişiselleştirme |
| 3 | **Agent Swarm** — Agentlar arası işbirliği (örn. Microlearning ↔ Phishing) | Tutarlılık |

### 3. Hızlı Kazanımlar

- **Structured logging (JSON):** ✅ Yapıldı — `service`, `env`, `correlationId` her logda; `LOG_LEVEL` env desteği

### 4. Opsiyonel Dokümantasyon

- `DATA_MODEL.md`: Smishing KV schema (`smishing:{id}:base` alanları) dokümante edilebilir

---

# Yorum: Sıradaki Adımlar Ne Olmalı?

## Öncelik Matrisi

| Özellik | Zorluk | Değer | Bağımlılık | Öneri |
|---------|--------|-------|------------|-------|
| **Critic Agent** | Orta | Yüksek | Yok | PII/pattern kontrolü (dil bağımsız) ile başlanabilir |
| ~~**Long-Term Memory**~~ | — | — | — | Şimdilik geç |
| **Agent Swarm** | Yüksek | Orta | Agent refactor | Orta vadede — Inter-agent protocol tasarımı gerekir |
| ~~**Product API (resourceId)**~~ | — | — | — | ✅ Tamamlandı |

## Önerilen Sıra (Product API tamam olduğuna göre)

1. **Critic Agent** — Phishing/Smishing çıktısına PII/pattern kontrolü (dil bağımsız); ton/gerçekçilik LLM ile (opsiyonel).
2. **Agent Swarm** — Inter-agent protocol; orta vadede.
3. ~~**Long-Term Memory**~~ — Şimdilik geç; Vectorize + persona büyük proje.
