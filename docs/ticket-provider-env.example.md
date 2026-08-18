# Ticket Provider Environment

Gerçek secret değerleri repository'ye yazılmaz.

## Bus / Biletall

TICKET_BUS_PROVIDER_ENABLED=false
BILETALL_SERVICE_URL=https://ws.biletall.com/Service.asmx
BILETALL_USERNAME=
BILETALL_PASSWORD=

## Flight / Amadeus

TICKET_FLIGHT_PROVIDER_ENABLED=false
AMADEUS_ENVIRONMENT=test
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=

Provider ancak gerekli bilgiler tanımlandıktan ve testleri
başarıyla geçtikten sonra etkinleştirilmelidir.
