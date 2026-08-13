"use client";

import {
  ChangeEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type MediaItem = {
  id: string;
  media_type: "image" | "video";
  url: string;
  title: string | null;
  is_cover: boolean;
  sort_order: number;
};

type Props = {
  companyId: string;
  hotelId: string;
  media: MediaItem[];
  onChanged: () => Promise<void>;
};

const BUCKET =
  "package-hotel-media";

function storagePathFromUrl(
  url: string
) {
  const marker =
    `/storage/v1/object/public/${BUCKET}/`;

  const index =
    url.indexOf(marker);

  if (index < 0) {
    return null;
  }

  return decodeURIComponent(
    url.slice(
      index +
      marker.length
    )
  );
}

function safeExtension(
  file: File
) {
  const fromName =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    fromName &&
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "avif",
    ].includes(fromName)
  ) {
    return fromName ===
      "jpeg"
      ? "jpg"
      : fromName;
  }

  if (
    file.type ===
    "image/png"
  ) {
    return "png";
  }

  if (
    file.type ===
    "image/webp"
  ) {
    return "webp";
  }

  if (
    file.type ===
    "image/avif"
  ) {
    return "avif";
  }

  return "jpg";
}

export default function HotelMediaManager({
  companyId,
  hotelId,
  media,
  onChanged,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    externalUrl,
    setExternalUrl,
  ] =
    useState("");

  const [
    externalTitle,
    setExternalTitle,
  ] =
    useState("");

  const [
    externalType,
    setExternalType,
  ] =
    useState<
      "image" |
      "video"
    >("video");

  const sorted =
    useMemo(
      () =>
        [...media].sort(
          (a, b) => {
            if (
              a.is_cover !==
              b.is_cover
            ) {
              return a.is_cover
                ? -1
                : 1;
            }

            return (
              Number(
                a.sort_order ??
                0
              ) -
              Number(
                b.sort_order ??
                0
              )
            );
          }
        ),
      [
        media,
      ]
    );

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function uploadFiles(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ??
        []
      );

    event.target.value =
      "";

    if (
      !companyId ||
      !hotelId ||
      files.length === 0
    ) {
      return;
    }

    clearMessages();

    if (
      files.length > 20
    ) {
      setError(
        "Tek seferde en fazla 20 fotoğraf yükleyebilirsiniz."
      );
      return;
    }

    const invalid =
      files.find(
        file =>
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ].includes(
            file.type
          ) ||
          file.size >
            12 *
              1024 *
              1024
      );

    if (invalid) {
      setError(
        "Fotoğraflar JPG, PNG, WEBP veya AVIF olmalı ve dosya başına 12 MB'ı geçmemelidir."
      );
      return;
    }

    setBusy(true);

    try {
      const hasCover =
        media.some(
          item =>
            item.is_cover
        );

      let nextOrder =
        media.reduce(
          (
            max,
            item
          ) =>
            Math.max(
              max,
              Number(
                item.sort_order ??
                0
              )
            ),
          -1
        ) + 1;

      let firstNewUrl =
        "";

      for (
        let index = 0;
        index <
        files.length;
        index += 1
      ) {
        const file =
          files[index];

        const extension =
          safeExtension(
            file
          );

        const path =
          `${companyId}/${hotelId}/${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2, 9)}.${extension}`;

        const {
          error:
            uploadError,
        } =
          await supabase
            .storage
            .from(
              BUCKET
            )
            .upload(
              path,
              file,
              {
                cacheControl:
                  "3600",
                upsert:
                  false,
                contentType:
                  file.type,
              }
            );

        if (
          uploadError
        ) {
          throw uploadError;
        }

        const {
          data:
            publicData,
        } =
          supabase
            .storage
            .from(
              BUCKET
            )
            .getPublicUrl(
              path
            );

        const publicUrl =
          publicData
            .publicUrl;

        if (
          !firstNewUrl
        ) {
          firstNewUrl =
            publicUrl;
        }

        const shouldCover =
          !hasCover &&
          index === 0;

        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "package_hotel_media"
            )
            .insert({
              company_id:
                companyId,

              package_hotel_id:
                hotelId,

              media_type:
                "image",

              url:
                publicUrl,

              title:
                file.name
                  .replace(
                    /\.[^.]+$/,
                    ""
                  )
                  .trim() ||
                null,

              is_cover:
                shouldCover,

              sort_order:
                nextOrder,

              source_type:
                "manual",
            });

        if (
          insertError
        ) {
          await supabase
            .storage
            .from(
              BUCKET
            )
            .remove([
              path,
            ]);

          throw insertError;
        }

        nextOrder += 1;
      }

      if (
        !hasCover &&
        firstNewUrl
      ) {
        const {
          error:
            hotelError,
        } =
          await supabase
            .from(
              "package_catalog_hotels"
            )
            .update({
              cover_image_url:
                firstNewUrl,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              hotelId
            )
            .eq(
              "company_id",
              companyId
            );

        if (
          hotelError
        ) {
          throw hotelError;
        }
      }

      setMessage(
        `${files.length} fotoğraf galeriye yüklendi.`
      );

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Fotoğraflar yüklenemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addExternal() {
    if (
      !externalUrl
        .trim()
    ) {
      setError(
        "Bağlantı adresi zorunludur."
      );
      return;
    }

    clearMessages();
    setBusy(true);

    try {
      const hasCover =
        media.some(
          item =>
            item.is_cover
        );

      const nextOrder =
        media.reduce(
          (
            max,
            item
          ) =>
            Math.max(
              max,
              Number(
                item.sort_order ??
                0
              )
            ),
          -1
        ) + 1;

      const makeCover =
        !hasCover &&
        externalType ===
          "image";

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "package_hotel_media"
          )
          .insert({
            company_id:
              companyId,
            package_hotel_id:
              hotelId,
            media_type:
              externalType,
            url:
              externalUrl.trim(),
            title:
              externalTitle
                .trim() ||
              null,
            is_cover:
              makeCover,
            sort_order:
              nextOrder,
            source_type:
              "manual",
          });

      if (
        insertError
      ) {
        throw insertError;
      }

      if (makeCover) {
        const {
          error:
            hotelError,
        } =
          await supabase
            .from(
              "package_catalog_hotels"
            )
            .update({
              cover_image_url:
                externalUrl.trim(),
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              hotelId
            )
            .eq(
              "company_id",
              companyId
            );

        if (
          hotelError
        ) {
          throw hotelError;
        }
      }

      setExternalUrl("");
      setExternalTitle("");

      setMessage(
        "Medya bağlantısı galeriye eklendi."
      );

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Medya eklenemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeCover(
    item:
      MediaItem
  ) {
    if (
      item.media_type !==
      "image"
    ) {
      return;
    }

    clearMessages();
    setBusy(true);

    try {
      const {
        error:
          clearError,
      } =
        await supabase
          .from(
            "package_hotel_media"
          )
          .update({
            is_cover:
              false,
          })
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "package_hotel_id",
            hotelId
          );

      if (
        clearError
      ) {
        throw clearError;
      }

      const {
        error:
          coverError,
      } =
        await supabase
          .from(
            "package_hotel_media"
          )
          .update({
            is_cover:
              true,
          })
          .eq(
            "id",
            item.id
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        coverError
      ) {
        throw coverError;
      }

      const {
        error:
          hotelError,
      } =
        await supabase
          .from(
            "package_catalog_hotels"
          )
          .update({
            cover_image_url:
              item.url,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            hotelId
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        hotelError
      ) {
        throw hotelError;
      }

      setMessage(
        "Kapak fotoğrafı değiştirildi."
      );

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Kapak fotoğrafı değiştirilemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(
    item:
      MediaItem,
    direction:
      -1 |
      1
  ) {
    const images =
      [...media].sort(
        (a, b) =>
          Number(
            a.sort_order ??
            0
          ) -
          Number(
            b.sort_order ??
            0
          )
      );

    const index =
      images.findIndex(
        current =>
          current.id ===
          item.id
      );

    const targetIndex =
      index +
      direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >=
        images.length
    ) {
      return;
    }

    clearMessages();
    setBusy(true);

    try {
      const target =
        images[
          targetIndex
        ];

      const currentOrder =
        Number(
          item.sort_order ??
          index
        );

      const targetOrder =
        Number(
          target.sort_order ??
          targetIndex
        );

      const {
        error:
          firstError,
      } =
        await supabase
          .from(
            "package_hotel_media"
          )
          .update({
            sort_order:
              targetOrder,
          })
          .eq(
            "id",
            item.id
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        firstError
      ) {
        throw firstError;
      }

      const {
        error:
          secondError,
      } =
        await supabase
          .from(
            "package_hotel_media"
          )
          .update({
            sort_order:
              currentOrder,
          })
          .eq(
            "id",
            target.id
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        secondError
      ) {
        throw secondError;
      }

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Galeri sırası değiştirilemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    item:
      MediaItem
  ) {
    const approved =
      window.confirm(
        "Bu medya kaydı silinsin mi?"
      );

    if (!approved) {
      return;
    }

    clearMessages();
    setBusy(true);

    try {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            "package_hotel_media"
          )
          .delete()
          .eq(
            "id",
            item.id
          )
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "package_hotel_id",
            hotelId
          );

      if (
        deleteError
      ) {
        throw deleteError;
      }

      const path =
        storagePathFromUrl(
          item.url
        );

      if (path) {
        const {
          error:
            storageError,
        } =
          await supabase
            .storage
            .from(
              BUCKET
            )
            .remove([
              path,
            ]);

        if (
          storageError
        ) {
          console.warn(
            storageError
          );
        }
      }

      if (
        item.is_cover
      ) {
        const replacement =
          media.find(
            current =>
              current.id !==
                item.id &&
              current
                .media_type ===
                "image"
          );

        if (
          replacement
        ) {
          await supabase
            .from(
              "package_hotel_media"
            )
            .update({
              is_cover:
                true,
            })
            .eq(
              "id",
              replacement.id
            )
            .eq(
              "company_id",
              companyId
            );

          await supabase
            .from(
              "package_catalog_hotels"
            )
            .update({
              cover_image_url:
                replacement.url,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              hotelId
            )
            .eq(
              "company_id",
              companyId
            );
        } else {
          await supabase
            .from(
              "package_catalog_hotels"
            )
            .update({
              cover_image_url:
                null,
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              hotelId
            )
            .eq(
              "company_id",
              companyId
            );
        }
      }

      setMessage(
        "Medya silindi."
      );

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Medya silinemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
              PROFESYONEL OTEL GALERİSİ
            </p>

            <h3 className="mt-2 text-2xl font-black">
              Fotoğraf Yükleme Merkezi
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Bilgisayarınızdan birden fazla fotoğraf seçebilirsiniz.
              İlk fotoğraf otomatik kapak olur; daha sonra istediğiniz
              fotoğrafı kapak yapabilir, sıralayabilir veya silebilirsiniz.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={uploadFiles}
              className="hidden"
            />

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                inputRef.current?.click()
              }
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              {busy
                ? "İşleniyor..."
                : "+ Fotoğraf Yükle"}
            </button>

            <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-black text-slate-300">
              {media.length} medya
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="grid gap-3 lg:grid-cols-[150px_1fr_1fr_auto]">
            <select
              value={externalType}
              onChange={event =>
                setExternalType(
                  event.target.value as
                    | "image"
                    | "video"
                )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-500/60"
            >
              <option value="video">
                Video URL
              </option>

              <option value="image">
                Harici Fotoğraf
              </option>
            </select>

            <input
              value={externalUrl}
              onChange={event =>
                setExternalUrl(
                  event.target.value
                )
              }
              placeholder="https://..."
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-500/60"
            />

            <input
              value={externalTitle}
              onChange={event =>
                setExternalTitle(
                  event.target.value
                )
              }
              placeholder="Başlık (opsiyonel)"
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange-500/60"
            />

            <button
              type="button"
              disabled={busy}
              onClick={addExternal}
              className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-300 hover:bg-orange-500/20 disabled:opacity-50"
            >
              URL Ekle
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {error}
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-900/60 p-10">
          <h4 className="text-2xl font-black">
            Galeri Henüz Boş
          </h4>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Dış cephe, oda, havuz, restoran ve ortak alanlardan
            kaliteli fotoğraflar yükleyin. Paket satış ekranında
            kapak fotoğrafı öncelikli gösterilir.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map(
            (
              item,
              index
            ) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900"
              >
                {item.media_type ===
                "image" ? (
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                    <img
                      src={item.url}
                      alt={
                        item.title ??
                        "Otel fotoğrafı"
                      }
                      className="h-full w-full object-cover"
                    />

                    {item.is_cover && (
                      <div className="absolute left-3 top-3 rounded-lg bg-orange-500 px-3 py-2 text-[10px] font-black text-white">
                        KAPAK
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2 py-1 text-[10px] font-black">
                      {index + 1}
                    </div>
                  </div>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-[4/3] items-center justify-center bg-slate-950 transition hover:bg-slate-900"
                  >
                    <div className="text-center">
                      <div className="text-4xl">
                        ▶
                      </div>

                      <div className="mt-3 text-xs font-black text-slate-400">
                        VİDEOYU AÇ
                      </div>
                    </div>
                  </a>
                )}

                <div className="p-4">
                  <div className="truncate font-black">
                    {item.title ||
                      (item.media_type ===
                      "image"
                        ? "Otel fotoğrafı"
                        : "Tanıtım videosu")}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {item.media_type ===
                      "image" &&
                      !item.is_cover && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            makeCover(
                              item
                            )
                          }
                          className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-300"
                        >
                          Kapak Yap
                        </button>
                      )}

                    <button
                      type="button"
                      disabled={
                        busy ||
                        index === 0
                      }
                      onClick={() =>
                        move(
                          item,
                          -1
                        )
                      }
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs font-black disabled:opacity-30"
                    >
                      ← Öne Al
                    </button>

                    <button
                      type="button"
                      disabled={
                        busy ||
                        index ===
                          sorted.length -
                            1
                      }
                      onClick={() =>
                        move(
                          item,
                          1
                        )
                      }
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs font-black disabled:opacity-30"
                    >
                      Arkaya Al →
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        remove(
                          item
                        )
                      }
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
