import { useState, useEffect } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") return true;
        if (saved === "light") return false;
        return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
      } catch {
        return true;
      }
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        // ignore storage write errors
      }
    } else {
      root.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        // ignore storage write errors
      }
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((p) => !p) };
}
