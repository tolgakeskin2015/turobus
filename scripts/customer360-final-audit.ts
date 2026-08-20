import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";


function fail(
  message:
    string
): never {
  console.error(
    `CUSTOMER360_AUDIT_FAIL:${message}`
  );

  process.exit(
    1
  );
}


function ok(
  message:
    string
) {
  console.log(
    `${message}:OK`
  );
}


const requiredFiles = [
  "app/dashboard/musteri-360/page.tsx",
  "app/dashboard/musteri-360/[id]/page.tsx",
  "app/dashboard/musteri-360/customer-command-center.tsx",
  "app/dashboard/musteri-360/customer-communication-center.tsx",
  "app/dashboard/musteri-360/customer-case-center.tsx",
  "app/dashboard/musteri-360/customer-preference-center.tsx",
  "app/dashboard/musteri-360/customer-family-group-center.tsx",
  "app/dashboard/musteri-360/customer-finance-history.tsx",
  "app/dashboard/musteri-360/customer-reservation-history.tsx",
  "app/dashboard/musteri-360/customer-quote-history.tsx",
  "app/dashboard/musteri-360/customer-unified-timeline.tsx",
  "app/dashboard/musteri-360/customer-value-loyalty-center.tsx",
  "app/dashboard/musteri-360/customer-privacy-security-center.tsx",
  "app/dashboard/musteri-360/gizlilik-guvenlik/page.tsx",
  "app/dashboard/musteri-360/provider-saglik/page.tsx",
  "app/dashboard/musteri-360/birlestirme/page.tsx",
  "lib/customer-360/repository.ts",
  "playwright.config.ts",
  "tests/customer360-authenticated.spec.ts",
];


for (
  const file of
  requiredFiles
) {
  if (
    !existsSync(
      file
    )
  ) {
    fail(
      `Eksik dosya:${file}`
    );
  }
}


ok(
  "CUSTOMER360_REQUIRED_FILES"
);


const repository =
  readFileSync(
    "lib/customer-360/repository.ts",
    "utf8"
  );


const communication =
  readFileSync(
    "app/dashboard/musteri-360/customer-communication-center.tsx",
    "utf8"
  );


const detail =
  readFileSync(
    "app/dashboard/musteri-360/[id]/page.tsx",
    "utf8"
  );


const privacy =
  readFileSync(
    "app/dashboard/musteri-360/customer-privacy-security-center.tsx",
    "utf8"
  );


const health =
  readFileSync(
    "app/dashboard/musteri-360/provider-saglik/page.tsx",
    "utf8"
  );


for (
  const token of
  [
    "loadCustomer360Detail",
    "loadCustomer360MessagePage",
    "queueCustomer360WhatsAppMessage",
    "retryCustomer360WhatsAppMessage",
    "loadCustomer360WhatsAppHealth",
    "loadCustomer360PrivacyDetail",
    "revealCustomer360Identity",
    "setCustomer360Consent",
  ]
) {
  if (
    !repository.includes(
      token
    )
  ) {
    fail(
      `Repository contract:${token}`
    );
  }
}


ok(
  "CUSTOMER360_REPOSITORY_CONTRACT"
);


const pageStart =
  repository.indexOf(
    "export async function loadCustomer360MessagePage("
  );


const pageEnd =
  repository.indexOf(
    "\nexport ",
    pageStart + 20
  );


const pageBlock =
  repository.slice(
    pageStart,
    pageEnd === -1
      ? undefined
      : pageEnd
  );


if (
  pageBlock.indexOf(
    '"sent_at"'
  ) ===
  -1 ||
  pageBlock.indexOf(
    '"created_at"'
  ) ===
  -1 ||
  pageBlock.indexOf(
    '.order(\n        "id",'
  ) ===
  -1
) {
  fail(
    "Deterministic message order eksik."
  );
}


ok(
  "DETERMINISTIC_MESSAGE_PAGINATION"
);


if (
  communication.includes(
    "loadCustomer360MessageSnapshot"
  )
) {
  fail(
    "Eski message snapshot loader geri dönmüş."
  );
}


for (
  const token of
  [
    "queueCustomer360WhatsAppMessage",
    "retryCustomer360WhatsAppMessage",
    "deliveryFilter",
    "Yeniden Gönder",
    "Provider hatası:",
  ]
) {
  if (
    !communication.includes(
      token
    )
  ) {
    fail(
      `Communication contract:${token}`
    );
  }
}


ok(
  "CUSTOMER360_COMMUNICATION_CONTRACT"
);


if (
  !health.includes(
    "loadCustomer360WhatsAppHealth"
  )
) {
  fail(
    "Provider Health repository bağlantısı yok."
  );
}


ok(
  "CUSTOMER360_PROVIDER_HEALTH"
);


if (
  !privacy.includes(
    "revealCustomer360Identity"
  ) ||
  !privacy.includes(
    '"customer"'
  )
) {
  fail(
    "Identity reveal UI bağlantısı eksik."
  );
}


ok(
  "CUSTOMER_IDENTITY_REVEAL"
);


const currencyStart =
  detail.indexOf(
    "const linkedAmountByCurrency"
  );


const currencyEnd =
  detail.indexOf(
    "const linkedAmountSummary",
    currencyStart
  );


const currencyBlock =
  detail.slice(
    currencyStart,
    currencyEnd
  );


if (
  currencyBlock.includes(
    '"TRY"'
  )
) {
  fail(
    "Eksik para birimi TRY olarak gösteriliyor."
  );
}


if (
  !currencyBlock.includes(
    '"BELİRSİZ"'
  )
) {
  fail(
    "Belirsiz para birimi koruması yok."
  );
}


ok(
  "MULTI_CURRENCY_TRUTHFULNESS"
);


const migrations =
  readdirSync(
    "supabase/migrations"
  );


for (
  const suffix of
  [
    "customer_360_core.sql",
    "customer_360_matching_engine.sql",
    "customer_360_auto_profile_engine.sql",
    "customer_360_live_sync.sql",
    "customer_360_family_group_management.sql",
    "customer_360_omnichannel_messages.sql",
    "customer_360_case_management_center.sql",
    "customer_360_preferences_segmentation.sql",
    "customer_360_command_center_snapshot.sql",
    "customer_360_duplicate_merge_center.sql",
    "customer_360_privacy_identity_security.sql",
    "customer_360_whatsapp_provider_layer.sql",
    "customer_360_whatsapp_provider_health.sql",
    "customer_360_final_hardening.sql",
  ]
) {
  if (
    !migrations.some(
      file =>
        file.endsWith(
          suffix
        )
    )
  ) {
    fail(
      `Migration chain eksik:${suffix}`
    );
  }
}


ok(
  "CUSTOMER360_MIGRATION_CHAIN"
);


for (
  const file of
  requiredFiles
) {
  const source =
    readFileSync(
      file,
      "utf8"
    );


  for (
    const token of
    [
      "Math.random()",
      "fakeCustomer",
      "mockCustomer",
    ]
  ) {
    if (
      source.includes(
        token
      )
    ) {
      fail(
        `Sahte veri paterni:${file}:${token}`
      );
    }
  }
}


ok(
  "NO_FAKE_CUSTOMER360_DATA"
);


console.log(
  "CUSTOMER360_FINAL_STATIC_AUDIT:OK"
);
