# TUROBÜS — TOUR OS MASTER PLAN

Durumlar:
- DONE = tamamlandı ve doğrulandı
- PARTIAL = mevcut fakat uçtan uca tamamlanmadı
- VERIFY = kod mevcut, gerçek veri E2E doğrulaması gerekiyor
- TODO = geliştirme gerekiyor
- BLOCKED = önce başka madde tamamlanmalı

## P0 — GERÇEK OPERASYON ZİNCİRİ

- [ ] TUR-001 | PARTIAL | Otobüs operasyonunu tamamla
  - koltuk modal responsive
  - biniş tarih/saat seçici
  - araç/plaka bağlama
  - şoför 1 / şoför 2
  - rehber + telefon
  - araç kapasitesi / koltuk kapasitesi
  - tur çıkış tarihinden otomatik departure_at
  - gerçek dönüş tarihi varsa return_at
  - biniş rotası
  - check-in
  - gerçek E2E

- [ ] TUR-002 | PARTIAL | Tur tipi ve gerçek çıkış bağlantısı
  - Otobüslü / Uçaklı sınıflandırma
  - departure_id tek kaynak
  - eski/bağsız operasyon kayıtlarını ayır
  - tarihleri gerçek departure üzerinden besle

- [ ] TUR-003 | PARTIAL | Yolcu & Rooming
  - gerçek rezervasyon → tour_passengers
  - aile/grup
  - oda dağılımı
  - eksik yolcu bilgisi
  - readiness bağlantısı

- [ ] TUR-004 | VERIFY | Rehber mobil operasyon
  - rehber → otobüs
  - yolcu listesi
  - biniş noktaları
  - check-in
  - canlı konum
  - konum başladı/durdu durumu

- [ ] TUR-005 | VERIFY | Müşteri canlı takip
  - otobüs no
  - plaka
  - koltuk
  - rehber
  - biniş noktası/saat
  - check-in
  - canlı harita
  - eski/sahte GPS gösterme

- [ ] TUR-006 | PARTIAL | Uçuş operasyonu E2E
  - gerçek departure bağlantısı
  - segmentler
  - PNR
  - bagaj
  - yolcu eşleştirme
  - arrival/departure operasyonu

## P1 — OPERASYON YÖNETİMİ

- [ ] TUR-007 | VERIFY | Hazırlık / Readiness
- [ ] TUR-008 | VERIFY | Görev Merkezi
- [ ] TUR-009 | VERIFY | Belgeler / Voucher / PNR
- [ ] TUR-010 | VERIFY | Tedarikçiler
- [ ] TUR-011 | VERIFY | Finans
- [ ] TUR-012 | VERIFY | Değişiklik / İade / Kapanış
- [ ] TUR-013 | VERIFY | Hata / Incident
- [ ] TUR-014 | VERIFY | Durum Motoru
- [ ] TUR-015 | VERIFY | Otomasyon
- [ ] TUR-016 | VERIFY | AI Operasyon + insan onayı
- [ ] TUR-017 | VERIFY | Control Tower

## P2 — TUR KAPANIŞI

- [ ] TUR-018 | TODO | Tur kapanış merkezi
  - tüm yolcular
  - tamamlanan/eksik hizmet
  - eksik belge
  - eksik tahsilat
  - tedarikçi borcu
  - refund/değişiklik
  - incident
  - operasyon sonucu
  - gerçek kârlılık
  - kapanış onayı
  - arşiv

## UI STANDARDIZATION

- [ ] TUR-UI-001 | TODO | Ortak Tour OS tarih/saat seçici
- [ ] TUR-UI-002 | TODO | Modal / drawer responsive standardı
- [ ] TUR-UI-003 | TODO | Buton ve form standardı
- [ ] TUR-UI-004 | TODO | Mobil/tablet ekran kontrolü

## ÇALIŞMA KURALI

Her madde:
1. Kaynak kod audit
2. Gerçek veri modeli kontrolü
3. Mevcut sistemi bozmayan küçük patch
4. npx tsc --noEmit
5. git diff --check
6. UI smoke
7. Gerçek veri E2E
8. Yalnız ilgili dosyaları stage
9. Commit
10. Sonraki TUR-XXX maddesine geç

Sahte yolcu, sahte rezervasyon, sahte GPS ve test DB yazımı yapılmayacak.
scripts/package-os-db-audit.ts bağımsız yerel değişiklik olarak stage edilmeyecek.
