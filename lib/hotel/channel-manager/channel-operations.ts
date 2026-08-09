export type ChannelOperationType =
  | "rate_update"
  | "inventory_update"
  | "restriction_update"
  | "reservation_import"
  | "full_sync"
  | "connection_test";

export function describeChannelOperation(type: string) {
  switch (type) {
    case "rate_update":
      return "Fiyat Güncelleme";
    case "inventory_update":
      return "Kontenjan Güncelleme";
    case "restriction_update":
      return "Kısıtlama Güncelleme";
    case "reservation_import":
      return "Rezervasyon Aktarımı";
    case "full_sync":
      return "Tam Senkronizasyon";
    case "connection_test":
      return "Bağlantı Testi";
    default:
      return type;
  }
}
