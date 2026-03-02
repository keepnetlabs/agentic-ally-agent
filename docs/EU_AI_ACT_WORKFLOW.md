# EU AI Act — Compliance Workflow & Tools

**Purpose:** Süreç, raporlama ve kullanılacak araçlar.  
**Deadline:** August 2, 2026  
**Related:** [AI_COMPLIANCE_INVENTORY.md](./AI_COMPLIANCE_INVENTORY.md) | [AI_COMPLIANCE_PROGRESS.md](./AI_COMPLIANCE_PROGRESS.md)

---

## 1. Kullanılabilir Araçlar

### 1.1 Projeyi Tarayan Araçlar (Kod Tabanı Scan)

| Araç | Kurulum | Komut | Ne Tarar |
|------|---------|-------|----------|
| **`npm run compliance:scan:eu`** | — | EU AI Act + GDPR → JSON rapor | `docs/compliance-reports/eu-scan-report.json` |
| **ActProof** | Git bağla | Web UI | AI-BOM, model/dataset tespiti |

**Komut:**
```bash
npm run compliance:scan:eu
```

### 1.2 Ücretsiz / Direkt Kullan (Kayıt Yok veya Minimal)

| Araç | Tip | Maliyet | Ne İşe Yarar |
|------|-----|---------|---------------|
| **[AI Compliance Advisor](https://aicomplianceadvisor.eu/compliance-analyzer)** | Web | **Ücretsiz** | 60 sn risk taraması → PDF checklist indir |
| **[aiactblog.nl Templates](https://www.aiactblog.nl/en/templates)** | Web | **Ücretsiz** | Risk classification, inventory, FRIA, Technical Doc template |
| **[ALTAI (EU Resmi)](https://digital-strategy.ec.europa.eu/en/node/806/printable/pdf)** | PDF | **Ücretsiz** | 7 maddelik self-assessment checklist |
| **[DPO Europe Checklist](https://data-privacy-office.eu/usefull-materials/the-eu-ai-act-compliance-checklist/)** | Web | **Ücretsiz** | 4 adımlı self-assessment |

### 1.2 Ücretli / Kurulum Gerektiren

| Araç | Tip | Maliyet | Windows | Ne İşe Yarar |
|------|-----|---------|---------|---------------|
| **ActProof.ai** | Web + Git | Free trial, sonra ücretli | ✅ | AI-BOM, Policy-as-Code, dokümantasyon |
| **Lexsight** | Web | Free (2 sistem), €2K+/yıl | ✅ | 15-soru wizard, PDF/DOCX rapor |

---

## 2. Önerilen Süreç

### Adım 1: İlk Tarama (Şimdi)

**Seçenek A — Ücretsiz, hemen:**
```
1. aicomplianceadvisor.eu/compliance-analyzer → 60 sn tarama → PDF indir
2. aiactblog.nl/en/templates → AI Risk Classification Tool (interactive) → risk tier belirle
3. Çıktıyı sakla: docs/compliance-reports/2026-03-risk-assessment.pdf
```

**Seçenek B — ActProof Free Trial:**
```
1. app.actproof.ai → Git repo bağla
2. Otomatik AI-BOM + Technical Dossier
```

### Adım 2: Gap Analizi

```
1. Tarama raporundaki gap'leri listele
2. AI_COMPLIANCE_PROGRESS.md → Phase 2'ye ekle
3. Öncelik: Critical → High → Medium
```

### Adım 3: Düzenli Cadence

| Sıklık | Aksiyon |
|--------|---------|
| **Her release öncesi** | eu-ai-act-scanner veya ActProof scan |
| **Çeyreklik** | Gap analizi, AI_COMPLIANCE_INVENTORY güncelle |
| **Yıllık** | Risk assessment yenileme, Lexsight/ActProof full dossier |

---

## 3. Komutlar

### ActProof

1. [app.actproof.ai](https://app.actproof.ai/) → Start Free Trial
2. Connect Git repository

### Lexsight

1. [app.lexsight.eu](https://app.lexsight.eu/) → Request Early Access
2. 15-question wizard → Risk tier
3. PDF/DOCX dossier indir

### Ücretsiz Web Araçları (Direkt Kullan)

| Araç | Link | Süre |
|------|------|------|
| **60 sn Risk Taraması + PDF** | [aicomplianceadvisor.eu/compliance-analyzer](https://aicomplianceadvisor.eu/compliance-analyzer) | ~1 dk |
| **Risk Classification (5 adım)** | [aiactblog.nl/en/templates](https://www.aiactblog.nl/en/templates) → AI Risk Classification Tool | ~5 dk |
| **Technical Doc Template** | [aicomplianceadvisor.eu/api/download-evidence-pack](https://aicomplianceadvisor.eu/api/download-evidence-pack) | İndir |
| **ALTAI Checklist (EU resmi)** | [digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/node/806/printable/pdf) | PDF indir |

---

## 4. Rapor Saklama

```
docs/compliance-reports/
├── .gitkeep
├── eu-scan-report.json           # eu-ai-act-scanner çıktısı
├── 2026-03-gap-analysis.md       # Manuel gap listesi
└── 2026-Q2-evidence-pack.pdf     # Lexsight/ActProof dossier (opsiyonel)
```

---

## 5. Hızlı Referans

| İhtiyaç | Araç |
|---------|------|
| **Hemen, ücretsiz risk taraması** | [AI Compliance Advisor](https://aicomplianceadvisor.eu/compliance-analyzer) |
| **Ücretsiz template/checklist** | [aiactblog.nl](https://www.aiactblog.nl/en/templates) |
| Kod taraması + JSON rapor | npm run compliance:scan:eu |
| AI-BOM, Technical Dossier | ActProof |
| Regulator-ready PDF | Lexsight |
| CI/CD entegrasyonu | ActProof Policy-as-Code |
