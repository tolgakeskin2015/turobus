# Turobus — Yat & Tekne OS Checkpoint
Tarih: 18 Ağustos 2026

## Son doğrulanmış durum

Branch:
feature/platform-admin

Son doğrulanmış remote commit:
1eea455 - feat: add Yacht OS partner tracking and voucher portals

## Tamamlananlar

- Sol menüde Biletler
- Sol menüde Yat & Tekne OS
- /dashboard/yat-os
- Profesyonel Yat & Tekne operasyon paneli
- Supabase gerçek CRUD
- Firma bazlı RLS
- Filo yönetimi
- Tekne ekleme
- Tekne durum yönetimi
- Rezervasyon oluşturma
- Rezervasyon onaylama
- Rezervasyon tarihlerini müsaitlik takvimine işleme
- Müsaitlik takvimi
- Operasyon görevleri
- Görev tamamlama
- Tedarikçiler
- Finans KPI
- Satış / tahsilat / açık bakiye / komisyon
- Yat sahibi B2B portal altyapısı
- Müşteri canlı takip token sistemi
- Dijital voucher token sistemi
- Public güvenli RPC sistemi

Public rotalar:
- /yat-takip/[token]
- /yat-tedarikci/[token]
- /yat-voucher/[token]

## Sıradaki çalışma

Yat OS yönetim ekranına:

1. Takip Linki
2. Voucher Aç
3. WhatsApp'tan Gönder
4. Operasyon Durumu Değiştir
5. Tedarikçi Portal Linki
6. Tedarikçiye tekne atama
7. Hakediş / ödeme mutabakatı
8. Tedarikçinin kendi fiyat ve müsaitlik yönetimi

eklenecek / tamamlanacak.

## Önemli

scripts/package-os-db-audit.ts bağımsız değişikliktir.
Yat OS commitlerine dahil edilmemelidir.

Supabase:
qhdjgolkmdovfaweabwy
Central EU / Frankfurt

Proje:
~/Projects/turobus
