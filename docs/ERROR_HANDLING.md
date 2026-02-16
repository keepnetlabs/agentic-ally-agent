# Error Handling Standard

**Last Updated:** February 2026

Bu doküman Agentic Ally projesinde tool ve servis hata yönetimi için standart pattern'leri tanımlar.

---

## 1. Tool Execute — `{ success: false, error }` Kullan

**Mastra tool'larında** hata durumunda `throw` yerine **structured response** dön:

```typescript
// ✅ DOĞRU
if (!token) {
  const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.TOKEN_MISSING);
  logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
  return createToolErrorResponse(errorInfo);
}

// catch bloğunda
catch (error) {
  const err = normalizeError(error);
  const errorInfo = errorService.external(err.message, { step: '...', stack: err.stack });
  logErrorInfo(logger, 'error', 'Operation failed', errorInfo);
  return createToolErrorResponse(errorInfo);
}
```

```typescript
// ❌ YANLIŞ — Tool execute içinde throw etme
if (!token) {
  throw new Error('Token missing');  // Agent bu hatayı structured olarak işleyemez
}
```

**Neden?** Mastra agent'ları tool sonucunu `{ success, error }` formatında parse eder. `throw` agent'ın retry/fallback mantığını bozabilir.

---

## 2. Yardımcı Fonksiyonlar

| Fonksiyon | Kaynak | Kullanım |
|-----------|--------|----------|
| `createToolErrorResponse(errorInfo)` | `utils/core/error-utils.ts` | `{ success: false, error: JSON.stringify(errorInfo) }` döner |
| `errorService.auth(msg)` | `services/error-service.ts` | Auth hataları |
| `errorService.external(msg, ctx)` | | Harici API / network hataları |
| `errorService.validation(msg, ctx)` | | Validasyon hataları |
| `errorService.notFound(msg, ctx)` | | Kaynak bulunamadı |
| `logErrorInfo(logger, level, message, errorInfo)` | `utils/core/error-utils.ts` | Standart log formatı |

---

## 3. Autonomous Handlers

`autonomous-phishing-handlers`, `autonomous-smishing-handlers`, `autonomous-training-handlers` zaten tutarlı:

```typescript
return { success: false, error: 'Açıklayıcı mesaj' };
```

Bu modüller tool sonuçlarını kontrol eder; tool `{ success: false }` döndüğünde agent fallback'e geçer.

---

## 4. Workflow / Low-Level — Throw Kabul Edilebilir

Workflow'lar ve KV/API client gibi **tool dışı** katmanlarda `throw` kullanılabilir:

- `create-microlearning-workflow.ts` — Tool executable değilse throw
- `kv-service.ts` — PUT/DELETE fail → throw (caller catch eder)
- `user-search-utils.ts` — Low-level utility, caller (tool) catch edip `createToolErrorResponse` döner

**Kural:** Tool `execute()` içinden çağrılan yardımcılar throw ediyorsa, tool bir `try/catch` ile sarmalayıp `createToolErrorResponse` dönmeli.

---

## 5. Retry Mekanizmaları

`resilience-utils` ile retry kullanılan yerlerde (örn. `upload-training-tool`), retry callback **throw** edebilir — retry mekanizması bunu bekler. Ancak tüm retry'lar tükendikten sonra tool yine `createToolErrorResponse` dönmeli.

---

## 6. Mevcut Tutarlı Tool'lar

Aşağıdaki tool'lar standart pattern'i kullanıyor:

- `get-user-info-tool`
- `upload-phishing-tool`, `upload-smishing-tool`, `upload-training-tool`
- `assign-phishing-tool`, `assign-smishing-tool`, `assign-training-tool`
- `get-target-group-info-tool`
- `workflow-executor-tool`, `smishing-workflow-executor-tool`
- `smishing-editor-tool`

---

## 7. Yeni Tool Yazarken Checklist

- [ ] `createToolErrorResponse` import et
- [ ] `errorService` ile uygun kategori kullan (auth, external, validation, notFound)
- [ ] `logErrorInfo` ile hata logla
- [ ] `throw` yerine `return createToolErrorResponse(errorInfo)` dön
- [ ] Tüm async işlemleri `try/catch` ile sar, catch'te `createToolErrorResponse` dön
