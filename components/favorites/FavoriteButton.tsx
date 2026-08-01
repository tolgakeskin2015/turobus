"use client";

import { useEffect, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { getFavoriteUserKey } from "@/lib/favorites";

type FavoriteButtonProps = {
  tourId: string;
  className?: string;
  showText?: boolean;
};

export default function FavoriteButton({
  tourId,
  className = "",
  showText = false,
}: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFavorite() {
      const userKey = getFavoriteUserKey();

      if (!userKey) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_key", userKey)
        .eq("tour_id", tourId)
        .maybeSingle();

      if (error) {
        console.error("Favori kontrol hatası:", error);
      }

      setFavorite(Boolean(data));
      setLoading(false);
    }

    checkFavorite();
  }, [tourId]);

  async function toggleFavorite() {
    if (loading) return;

    const userKey = getFavoriteUserKey();

    setLoading(true);

    if (favorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_key", userKey)
        .eq("tour_id", tourId);

      if (error) {
        console.error("Favoriden çıkarma hatası:", error);
        setLoading(false);
        return;
      }

      setFavorite(false);
      window.dispatchEvent(new Event("favorites-updated"));
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("favorites")
      .insert({
        user_key: userKey,
        tour_id: tourId,
      });

    if (error) {
      console.error("Favoriye ekleme hatası:", error);
      setLoading(false);
      return;
    }

    setFavorite(true);
    window.dispatchEvent(new Event("favorites-updated"));
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={loading}
      aria-label={
        favorite ? "Favorilerden çıkar" : "Favorilere ekle"
      }
      className={`flex items-center justify-center gap-2 transition disabled:opacity-60 ${className}`}
    >
      {favorite ? (
        <FaHeart className="text-red-500" />
      ) : (
        <FaRegHeart />
      )}

      {showText && (
        <span>
          {favorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
        </span>
      )}
    </button>
  );
}
