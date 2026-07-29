"use client";

import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 700);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Sayfanın başına dön"
      className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-orange-500 text-white shadow-2xl shadow-orange-500/30 transition hover:-translate-y-1 hover:bg-orange-600"
    >
      <FaArrowUp />
    </button>
  );
}
