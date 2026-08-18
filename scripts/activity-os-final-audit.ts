import fs from "node:fs";

const paths = {
  core:
    "supabase/migrations/20260817130000_activity_os_pro_core.sql",

  capacity:
    "supabase/migrations/20260818114500_activity_os_final_capacity_realtime_hardening.sql",

  commerce:
    "supabase/migrations/20260818123000_activity_os_commerce_payment_final.sql",

  integrity:
    "supabase/migrations/20260818134500_activity_os_final_business_integrity.sql",

  os:
    "app/dashboard/activity-os/components/ActivityOSPro.tsx",

  capacityUi:
    "app/dashboard/activity-os/components/ActivityDailyCapacityBoard.tsx",

  crud:
    "app/dashboard/activity-os/components/ActivityCrudActions.tsx",

  paymentCenter:
    "app/dashboard/activity-payment-center/page.tsx",

  guest:
    "app/activity-misafir/[token]/page.tsx",

  payment:
    "app/activity-odeme/[token]/page.tsx",

  seller:
    "app/activity-satici/page.tsx",

  control:
    "app/dashboard/activity-control-center/page.tsx",

  voucher:
    "app/activity-voucher/[token]/page.tsx",

  checkin:
    "app/activity-checkin/[token]/page.tsx",

  payInit:
    "app/api/activity-payments/iyzico/initialize/route.ts",

  payCallback:
    "app/api/activity-payments/iyzico/callback/route.ts",

  refund:
    "app/api/activity-payments/iyzico/refund/route.ts",
};


function read(path: string) {
  return fs.existsSync(path)
    ? fs.readFileSync(
        path,
        "utf8"
      )
    : "";
}


const core =
  read(paths.core);

const capacity =
  read(paths.capacity);

const commerce =
  read(paths.commerce);

const integrity =
  read(paths.integrity);

const os =
  read(paths.os);

const capacityUi =
  read(paths.capacityUi);

const paymentCenter =
  read(paths.paymentCenter);

const guest =
  read(paths.guest);

const seller =
  read(paths.seller);


const checks:
  Array<
    [
      string,
      boolean
    ]
  > = [

  [
    "Activity OS ana panel",
    os.includes(
      "Activity OS"
    ),
  ],

  [
    "Canlı slot kapasitesi",
    capacity.includes(
      "activity_os_slot_reserved"
    ),
  ],

  [
    "Overbooking DB koruması",
    capacity.includes(
      "activity_os_capacity_guard_final"
    ),
  ],

  [
    "Realtime kontenjan",
    capacityUi.includes(
      "postgres_changes"
    ),
  ],

  [
    "Hızlı müşteri rezervasyonu",
    capacityUi.includes(
      "activity_os_quick_booking"
    ),
  ],

  [
    "Aktivite CRUD",
    fs.existsSync(
      paths.crud
    ),
  ],

  [
    "Online ödeme initialize",
    fs.existsSync(
      paths.payInit
    ),
  ],

  [
    "Online ödeme callback doğrulama",
    fs.existsSync(
      paths.payCallback
    ),
  ],

  [
    "Online iade",
    fs.existsSync(
      paths.refund
    ),
  ],

  [
    "Misafir ödeme sayfası",
    fs.existsSync(
      paths.payment
    ),
  ],

  [
    "Ödeme merkezi",
    paymentCenter.includes(
      "Ödeme & Tahsilat Merkezi"
    ),
  ],

  [
    "Misafir portalı",
    guest.includes(
      "TUROBUS MİSAFİR PORTALI"
    ),
  ],

  [
    "Voucher",
    fs.existsSync(
      paths.voucher
    ),
  ],

  [
    "Check-in",
    fs.existsSync(
      paths.checkin
    ),
  ],

  [
    "Satışçı portalı",
    seller.includes(
      "activity_seller_create_booking"
    ),
  ],

  [
    "Kontrol merkezi",
    fs.existsSync(
      paths.control
    ),
  ],

  [
    "Finans RLS",
    core.includes(
      "activity_os_can_view_finance"
    ),
  ],

  [
    "Marketplace komisyon kuralı",
    core.includes(
      "p_source_channel = 'turobus_marketplace'"
    ),
  ],

  [
    "Online ödeme defteri",
    commerce.includes(
      "activity_os_apply_provider_payment"
    ),
  ],

  [
    "Online iade defteri",
    commerce.includes(
      "activity_os_apply_provider_refund"
    ),
  ],

  [
    "Manuel fazla tahsilat koruması",
    integrity.includes(
      "Tahsilat kalan bakiyeden fazla olamaz"
    ),
  ],

  [
    "Manuel iade",
    integrity.includes(
      "activity_os_add_manual_refund"
    ),
  ],

  [
    "Finans yeniden hesaplama",
    integrity.includes(
      "activity_os_recalculate_booking_finance"
    ),
  ],

  [
    "Sistem sağlık kontrolü",
    integrity.includes(
      "get_activity_os_system_health"
    ),
  ],
];


let failed =
  0;


console.log(
  "\n=============================================="
);

console.log(
  " TUROBUS ACTIVITY OS FINAL AUDIT"
);

console.log(
  "==============================================\n"
);


for (
  const [
    name,
    ok,
  ] of checks
) {

  if (ok) {

    console.log(
      `✅ ${name}`
    );

  } else {

    failed +=
      1;

    console.log(
      `❌ ${name}`
    );

  }

}


console.log("");

console.log(
  `✅ Geçen: ${checks.length - failed}`
);

console.log(
  `❌ Hatalı: ${failed}`
);

console.log("");


if (
  failed === 0
) {

  console.log(
    "ACTIVITY OS STATIC AUDIT: PASS"
  );

} else {

  console.log(
    "ACTIVITY OS STATIC AUDIT: FAIL"
  );

}


process.exit(
  failed === 0
    ? 0
    : 1
);
