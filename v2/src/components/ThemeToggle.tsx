import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "dark";
    setTheme(stored);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";

    // Trigger a brief CSS transition on every themed property across the page.
    const html = document.documentElement;
    html.classList.add("theme-changing");
    html.dataset.theme = next;
    setTheme(next);
    localStorage.setItem("theme", next);

    window.setTimeout(() => html.classList.remove("theme-changing"), 380);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="theme-toggle relative size-9 grid place-items-center rounded-lg text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground) transition-colors"
    >
      <Sun
        size={18}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ease-out ${
          mounted && theme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-50"
        }`}
      />
      <Moon
        size={18}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ease-out ${
          mounted && theme === "dark"
            ? "opacity-0 rotate-90 scale-50"
            : "opacity-100 rotate-0 scale-100"
        }`}
      />
    </button>
  );
}
