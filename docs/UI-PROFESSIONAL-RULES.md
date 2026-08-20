# TUROBUS PROFESSIONAL UI RULES

Bu kurallar Turobus yönetim panellerinin tamamında uygulanacaktır.

## ANA KURAL

Turobus ekranları basit admin paneli şeklinde hazırlanmayacak.

Her operasyon ekranı profesyonel ERP / Travel OS seviyesinde olacaktır.

## ZORUNLU TASARIM STANDARDI

- Yoğun fakat okunabilir veri görünümü
- Profesyonel tablolar
- Sticky table header
- Arama
- Çoklu filtre
- Durum filtreleri
- KPI kartları
- Finans özetleri
- Durum rozetleri
- Aksiyon kolonları
- Hızlı işlem butonları
- Satır bazlı işlem menüsü
- Para / bakiye / komisyon ayrımı
- Kritik kayıt uyarıları
- Operasyon sağlık göstergeleri
- Responsive tasarım
- Mobilde kaydırılabilir tablolar
- Boş ekranlarda profesyonel empty-state
- Gerçek Supabase verisi
- Şirket bazlı veri izolasyonu
- Demo/mock veri yalnız geliştirme sırasında
- Kullanıcıya sahte veri canlı veri gibi gösterilmeyecek

## TABLO STANDARDI

Tablolar mümkün olduğunca aşağıdaki alanları içermelidir:

- Kod
- Ana kayıt
- İlişkili firma / tedarikçi
- Tarih
- Durum
- Finansal bilgi
- Operasyon bilgisi
- Son güncelleme
- Aksiyon

Tablolar yalnız isim + butondan oluşmayacak.

## TASARIM DİLİ

Turobus koyu kurumsal dashboard dili korunacaktır.

Ana vurgu:
- Turuncu / amber aksiyonlar
- Emerald başarılı durum
- Blue operasyon
- Amber bekleyen
- Red risk / kritik

## HEDEF

Kullanıcı ekranı açtığında:

"Bu bir rezervasyon ekranı" değil,

"Bu işletmenin operasyon sistemi"

hissi oluşmalıdır.


## Hız + Stabilite + Profesyonel Görsel Standardı

- Geliştirme hızlı ilerler fakat çalışan sistem hiçbir aşamada riske atılmaz.
- Her yeni modül migration gerekiyorsa migration → TypeScript → diff check → build → fonksiyon/route kontrolü → commit → push sırasını geçmeden tamamlanmış sayılmaz.
- Yönetim ekranları basit kart/listeler olarak bırakılmaz; Travel ERP / CRM seviyesinde profesyonel KPI, arama, çoklu filtre, durum badge, sticky/geniş tablo, hızlı işlem ve gerektiğinde detay drawer/tab kullanılır.
- Otel, yat, villa, aktivite ve ürün gibi görsel anlam taşıyan modüllerde yalnızca gerçek/veritabanından gelen görseller kullanılmalıdır.
- Müşteri, finans, güvenlik ve yönetim ekranlarına dekoratif veya sahte görseller eklenmez.
- Sahte canlı veri üretilmez. Gerçek API/provider yoksa yalnızca entegrasyon hazırlığı veya manuel operasyon kaydı yapılır.
- Tekrar çalıştırılan geliştirme scriptleri mümkün olduğunca idempotent olmalı; repository gibi merkezi dosyalara kör `cat >>` ile duplicate kod eklenmemelidir.
