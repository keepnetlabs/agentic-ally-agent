# Rejection Refinement — Implementation Plan

**Feature:** Kullanıcı önceki generation'ı reddedip sebep verince, AI orijinal içeriği + rejection reason'ı analiz ederek dinamik bir prompt üretsin ve yeni generation o prompt ile çalışsın.

---

## Yeni Parametreler (`AutonomousRequest`)

```
batchResourceId  — zaten var, artık "önceki run referansı" olarak da kullanılıyor
rejectingReason  — YENİ: "i dont like this", "too easy", "wrong department focus" vs.
```

Her ikisi birden varsa → Rejection Refinement flow devreye girer.
Sadece `batchResourceId` varsa → mevcut davranış (batch thread context).

---

## Akış

```
POST /autonomous
  { batchResourceId: "7c9e...", rejectingReason: "...", actions: [...], ... }
          │
          ▼
  executeAutonomousGeneration()
          │
          ├─ batchResourceId + rejectingReason var mı?
          │         │
          │        YES
          │         │
          │         ▼
          │   [1] KV'dan orijinal generation sonuçlarını çek
          │       batch:{batchId}:result → { phishing, training, smishing, userInfo }
          │         │
          │         ▼
          │   [2] LLM çağrısı (rejection-refinement-service)
          │       Input:  orijinal içerik + rejection reason + kullanıcı profili
          │       Output: { phishingInstruction?, trainingInstruction?, smishingInstruction? }
          │         │
          │         ▼
          │   [3] Normal flow — ama refinementContext taşıyarak
          │
          └─ batchResourceId yok veya rejectingReason yok → normal flow
```

---

## Adım 1 — Storage: D1 `campaign_metadata` Genişletme ✅ TAMAMLANDI

**Problem:** D1'da `reasoning` yoktu, microlearning hiç yazılmıyordu, quishing ayrıştırılamıyordu.

**Çözüm:** KV batch storage yerine mevcut D1 pipeline'ını genişlet — yeni KV yazmaya gerek yok.

### Migration: `0006_campaign_metadata_reasoning.sql`
```sql
ALTER TABLE campaign_metadata ADD COLUMN reasoning TEXT;
ALTER TABLE campaign_metadata ADD COLUMN content_type TEXT;  -- 'phishing' | 'quishing' | 'smishing' | 'training'
```

### D1'a Yazılan Alanlar (upload sonrası)

| Alan | Phishing | Quishing | Smishing | Training |
|------|----------|----------|----------|---------|
| `resource_id` | ✅ scenarioResourceId | ✅ | ✅ | ✅ |
| `tactic` | ✅ psychologicalTriggers | ✅ | ✅ | ✅ risk_area/category |
| `scenario` | ✅ topic | ✅ | ✅ | ✅ title |
| `difficulty` | ✅ | ✅ | ✅ | ✅ level |
| `reasoning` | ✅ explainability.reasoning | ✅ | ✅ | ✅ |
| `content_type` | `phishing` | `quishing` | `smishing` | `training` |

### Lookup (rejection anında)
```typescript
getCampaignMetadata(env, [rejectedScenarioResourceId])
→ { tactic, scenario, difficulty, reasoning, content_type }
```

Frontend'den gelen `scenarioResourceId` direkt `resource_id` olarak match eder.

---

## Adım 2 — Yeni Servis: `rejection-refinement-service.ts`

**Lokasyon:** `src/mastra/services/rejection-refinement-service.ts`

### Input / Output

```typescript
interface RefinementInput {
  batchResourceId: string;
  rejectingReason: string;
  env: CloudflareEnv | undefined;
}

interface RefinementContext {
  phishingInstruction?: string;   // Handler'a geçilecek spesifik instruction
  trainingInstruction?: string;
  smishingInstruction?: string;
}
```

### LLM Prompt Şablonu

```
Sen bir siber güvenlik eğitim uzmanısın.
Bir kullanıcı için oluşturulan içerik reddedildi.

--- OLUŞTURULAN İÇERİK ---
Phishing: "{title}" | Tactic: {tactic} | Difficulty: {difficulty}
AI Reasoning: "{reasoning}"

Training: "{title}" | Objective: {objective}

--- KULLANICI PROFİLİ ---
Department: {department} | Risk Level: {riskLevel}

--- RED SEBEBİ ---
"{rejectingReason}"

--- GÖREV ---
Her içerik tipi için yeni generation'ın nasıl farklı olması gerektiğini
spesifik instruction olarak yaz. Kısa tut (1-2 cümle per type).
Sadece JSON döndür:
{
  "phishingInstruction": "...",
  "trainingInstruction": "...",
  "smishingInstruction": "..."
}
Eğer bir içerik tipi KV'da yoksa o field'ı null yap.
```

### Model Seçimi

**`OPENAI_GPT_5_4_MINI`** — `getRefinementModel()` fonksiyonu (model-providers.ts'e eklendi).

Gerekçe:
- GPT-4o-mini (mevcut light model) routing/summary için yeterli ama reasoning biraz zayıf
- GPT-5.4-mini → güçlü reasoning, hızlı, ucuz — bu intermediate adım için ideal
- Default (GPT-5.1) overkill — bu intermediate bir adım, heavy generation değil

```typescript
// model-providers.ts — eklendi
export function getRefinementModel() {
  return getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_4_MINI);
}
```

### Hata Davranışı

KV'da result yoksa veya LLM çağrısı başarısız olursa → `null` döndür, normal flow devam etsin. Rejection refinement, generation'ı asla bloklamamalı.

---

## Adım 3 — Handler Entegrasyonu: `rejectionFeedback` Named Param

**Neden `additionalContext`'e gömmüyoruz:**
`additionalContext` zaten rationale + executive report + scenario bilgisiyle dolu. LLM orada öncelik sıralamasını kendisi yapıyor — rejection reason kaybolabilir.

**Çözüm:** Workflow executor tool'lara ayrı `rejectionFeedback` parametresi ekle:

```typescript
// phishingWorkflowExecutorTool input
{
  workflowType: 'phishing',
  topic,
  difficulty,
  additionalContext: '...mevcut...',
  rejectionFeedback: 'Use urgency instead of authority, focus on HR not IT',  // ← YENİ
}
```

Tool'un içindeki prompt template bunu **en başa** koyar:

```
[Varsa rejectionFeedback — en üste]
⚠️ PREVIOUS VERSION WAS REJECTED.
Instruction for new generation: {rejectionFeedback}
This MUST be reflected in the output.
---
[Normal prompt devam eder]
```

`rejectionFeedback` yoksa → hiçbir şey değişmez, mevcut davranış aynı.

---

## Adım 4 — Zincir: Parametre Akışı

```
autonomous-service.ts
  ├─ buildRefinementContext() → RefinementContext | null
  └─ generateContentForUser(userInfo, executiveReport, actions, threadIds, refinementContext?)
          │
          ▼
  autonomous-content-generators.ts
  generateContentForUser(params + refinementContext?)
  ├─ generatePhishingSimulation(..., phishingRefinement?)
  ├─ generateTrainingModule(..., trainingRefinement?)
  └─ generateSmishingSimulation(..., smishingRefinement?)
          │
          ▼
  autonomous-phishing-handlers.ts
  executePhishingToolFirst(params + rejectionFeedback?)
  └─ phishingWorkflowExecutorTool.execute({ ..., rejectionFeedback })
```

---

## Dokunulacak Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/mastra/types/autonomous-types.ts` | `rejectingReason?: string` ekle |
| `src/mastra/types/api-types.ts` | `AutonomousRequestBody`'e `rejectingReason` ekle |
| `src/mastra/model-providers.ts` | `getRefinementModel()` ekle |
| `src/mastra/services/autonomous/autonomous-service.ts` | Batch result KV yazımı + rejection branch |
| `src/mastra/services/autonomous/autonomous-content-generators.ts` | `refinementContext` parametresi geçir |
| `src/mastra/services/autonomous/autonomous-phishing-handlers.ts` | `rejectionFeedback` al, tool'a geçir |
| `src/mastra/services/autonomous/autonomous-training-handlers.ts` | Aynı |
| `src/mastra/services/autonomous/autonomous-smishing-handlers.ts` | Aynı |
| `src/mastra/services/rejection-refinement-service.ts` | **YENİ** |
| `src/mastra/tools/phishing-workflow-executor-tool.ts` | `rejectionFeedback` param + prompt'a prepend |
| `src/mastra/tools/workflow-executor-tool.ts` | Aynı |
| `src/mastra/tools/smishing-workflow-executor-tool.ts` | Aynı |

---

## Uygulama Sırası

```
1. autonomous-types.ts + api-types.ts      → parametre tanımları
2. model-providers.ts                       → getRefinementModel()
3. rejection-refinement-service.ts          → YENİ servis (KV okuma + LLM)
4. *-workflow-executor-tool.ts (3 adet)     → rejectionFeedback param + prompt
5. autonomous-*-handlers.ts (3 adet)        → rejectionFeedback geçir
6. autonomous-content-generators.ts         → refinementContext geçir
7. autonomous-service.ts                    → KV result storage + rejection branch
```

---

## Kapsam Dışı (Bu PR'da Yok)

- Smishing/Vishing'e ayrı rejection tracking
- Rejection zinciri (1. red → 2. red → ... geçmişi)
- Rejection reason analytics / dashboard
- Group assignment için rejection (şimdilik sadece user)
