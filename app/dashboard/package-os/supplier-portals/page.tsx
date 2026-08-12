"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Supplier = {

  id: string;

  name: string;

  email:
    string | null;

  phone:
    string | null;

  whatsapp_phone:
    string | null;

  is_active:
    boolean;
};


function normalizePhone(
  value: string
) {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (digits.startsWith("90")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `90${digits.slice(1)}`;
  }

  return `90${digits}`;
}


type PortalInfo = {

  supplier_id: string;

  supplier_name: string;

  portal_token: string;

  is_active:
    boolean;
};


export default function SupplierPortalsPage() {

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>([]);


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    savingId,
    setSavingId,
  ] =
    useState("");


  const [
    message,
    setMessage,
  ] =
    useState("");


  const loadSuppliers =
    useCallback(
      async () => {

        const {
          data: authData,
        } =
          await supabase.auth
            .getUser();


        if (
          !authData.user
        ) {

          setLoading(
            false
          );

          return;
        }


        const membership =
          await getCurrentMembership(
            authData.user.id
          );


        if (!membership) {

          setLoading(
            false
          );

          return;
        }


        const {
          data,
        } =
          await supabase
            .from(
              "suppliers"
            )
            .select(`
              id,
              name,
              email,
              phone,
              whatsapp_phone,
              is_active
            `)
            .eq(
              "company_id",
              membership.company_id
            )
            .eq(
              "is_active",
              true
            )
            .order(
              "name"
            );


        setSuppliers(
          (
            data ??
            []
          ) as Supplier[]
        );


        setLoading(
          false
        );

      },
      []
    );


  useEffect(() => {

    void loadSuppliers();

  }, [
    loadSuppliers,
  ]);


  const filtered =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        if (!query) {
          return suppliers;
        }


        return suppliers.filter(
          supplier =>
            [
              supplier.name,
              supplier.email,
              supplier.phone,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                query
              )
        );

      },
      [
        suppliers,
        search,
      ]
    );


  async function getPortal(
    supplier:
      Supplier
  ) {

    setSavingId(
      supplier.id
    );

    setMessage(
      ""
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "ensure_package_supplier_portal",
        {
          p_supplier_id:
            supplier.id,
        }
      );


    if (
      error ||
      !data
    ) {

      setMessage(
        error?.message ||
          "Portal oluşturulamadı."
      );

      setSavingId(
        ""
      );

      return;
    }


    const portal =
      data as PortalInfo;


    const link =
      `${window.location.origin}` +
      `/tedarikci/${portal.portal_token}`;


    await navigator.clipboard
      .writeText(
        link
      );


    setMessage(
      `${supplier.name} portal bağlantısı kopyalandı.`
    );


    setSavingId(
      ""
    );
  }


  async function sendPortalWhatsApp(
    supplier:
      Supplier
  ) {

    const phone =
      supplier.whatsapp_phone ||
      supplier.phone;


    if (!phone) {

      setMessage(
        `${supplier.name} için WhatsApp/telefon bilgisi yok.`
      );

      return;
    }


    setSavingId(
      supplier.id
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "ensure_package_supplier_portal",
        {
          p_supplier_id:
            supplier.id,
        }
      );


    if (
      error ||
      !data
    ) {

      setMessage(
        error?.message ||
          "Portal bağlantısı hazırlanamadı."
      );

      setSavingId(
        ""
      );

      return;
    }


    const portal =
      data as PortalInfo;


    const link =
      `${window.location.origin}` +
      `/tedarikci/${portal.portal_token}`;


    const text =
      [
        `Merhaba ${supplier.name},`,
        "",
        "TUROBUS tedarikçi portalınız hazır.",
        "",
        "Operasyonlarınızı ve hakedişlerinizi takip etmek için:",
        link,
      ].join("\n");


    window.open(
      `https://wa.me/${normalizePhone(
        phone
      )}?text=${encodeURIComponent(
        text
      )}`,
      "_blank",
      "noopener,noreferrer"
    );


    setMessage(
      `${supplier.name} WhatsApp mesajı hazırlandı.`
    );


    setSavingId(
      ""
    );
  }


  async function rotatePortal(
    supplier:
      Supplier
  ) {

    setSavingId(
      supplier.id
    );

    setMessage(
      ""
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "rotate_package_supplier_portal_token",
        {
          p_supplier_id:
            supplier.id,
        }
      );


    if (
      error ||
      !data
    ) {

      setMessage(
        error?.message ||
          "Yeni bağlantı üretilemedi."
      );

      setSavingId(
        ""
      );

      return;
    }


    const portal =
      data as PortalInfo;


    const link =
      `${window.location.origin}` +
      `/tedarikci/${portal.portal_token}`;


    await navigator.clipboard
      .writeText(
        link
      );


    setMessage(
      `${supplier.name} için eski bağlantı iptal edildi ve yeni portal linki kopyalandı.`
    );


    setSavingId(
      ""
    );
  }


  if (loading) {

    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-300">
        Tedarikçi portalları hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-6xl">

        <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS PACKAGE OS
          </p>


          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Tedarikçi Portal Linkleri
          </h1>


          <p className="mt-3 text-slate-400">
            Her tedarikçiye yalnızca kendi operasyon ve hakedişlerini gösteren özel bağlantı oluştur.
          </p>


          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Tedarikçi ara..."
            className="mt-7 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
          />

        </div>


        {
          message &&
          (
            <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-orange-300">
              {message}
            </div>
          )
        }


        <div className="mt-6 space-y-3">

          {
            filtered.map(
              supplier => (
                <article
                  key={
                    supplier.id
                  }
                  className="rounded-[24px] border border-white/10 bg-slate-900 p-5"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    <div>

                      <h2 className="text-lg font-black">
                        {
                          supplier.name
                        }
                      </h2>


                      <p className="mt-2 text-sm text-slate-400">
                        {
                          supplier.email ||
                          supplier.phone ||
                          "İletişim bilgisi yok"
                        }
                      </p>

                    </div>


                    <div className="flex flex-wrap gap-2">

                      <button
                        type="button"
                        disabled={
                          savingId ===
                          supplier.id
                        }
                        onClick={() =>
                          void getPortal(
                            supplier
                          )
                        }
                        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black disabled:opacity-40"
                      >
                        Portal Linkini Kopyala
                      </button>

                      <button
                        type="button"
                        disabled={
                          savingId ===
                          supplier.id
                        }
                        onClick={() =>
                          void sendPortalWhatsApp(
                            supplier
                          )
                        }
                        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-black disabled:opacity-40"
                      >
                        WhatsApp Gönder
                      </button>


                      <button
                        type="button"
                        disabled={
                          savingId ===
                          supplier.id
                        }
                        onClick={() =>
                          void rotatePortal(
                            supplier
                          )
                        }
                        className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
                      >
                        Yeni Link Üret
                      </button>

                    </div>

                  </div>

                </article>
              )
            )
          }

        </div>

      </div>

    </main>
  );
}
