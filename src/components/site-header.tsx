"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FjdLogo } from "@/components/fjd-logo";

const navItems = [
  { label: "Verfahrensweg", href: "/#verfahrensweg", page: "/", transition: "nav-back" },
  { label: "Ämter", href: "/#aemter", page: "/", transition: "nav-back" },
  { label: "Aktuelles", href: "/#aktuelles", page: "/", transition: "nav-back" },
  { label: "Rechtskodex", href: "/rechtskodex", page: "/rechtskodex", transition: "nav-forward" },
];

// Floating glass pill. On small screens a menu button opens the links as a glass sheet.
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Directional animation only when the page changes, not when jumping within the same page.
  const typesFor = (page: string, transition: string) =>
    page === pathname ? undefined : [transition];

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:pt-4"
    >
      <div
        className={`glass-dark pointer-events-auto relative flex w-full max-w-5xl items-center justify-between gap-3 rounded-full py-1.5 pl-2 pr-1.5 text-white ${
          scrolled || open ? "is-solid" : ""
        }`}
      >
        <Link
          href="/"
          transitionTypes={typesFor("/", "nav-back")}
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3"
        >
          <FjdLogo className="h-9 w-auto text-white" />
          <span className="font-serif text-[0.9375rem] font-medium leading-tight">
            Federal Justice Department
          </span>
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm">
            {navItems.map((item) => {
              const current = item.page === "/rechtskodex" && pathname === "/rechtskodex";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    transitionTypes={typesFor(item.page, item.transition)}
                    aria-current={current ? "page" : undefined}
                    className={`block rounded-full px-4 py-2 transition-colors ${
                      current
                        ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          onClick={() => setOpen((value) => !value)}
          className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/15 md:hidden"
        >
          {/* Both bars sit in the middle and move with transform only, so no frame shows a half-turned arrow. */}
          <span className="relative block h-3 w-4">
            <span
              className={`absolute left-0 top-1.5 h-px w-4 bg-white transition-transform duration-300 ease-out ${
                open ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 h-px w-4 bg-white transition-transform duration-300 ease-out ${
                open ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </span>
        </button>

        {open && (
          <nav
            id="mobile-menu"
            aria-label="Hauptnavigation"
            className="glass-dark is-solid menu-in absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-[1.75rem] p-2 md:hidden"
          >
            <ul className="flex flex-col">
              {navItems.map((item) => {
                const samePage = item.page === pathname;
                return (
                  <li key={item.href}>
                    {/* A jump within the page closes the sheet right away. Going to another page keeps it
                        open with a pending mark until the new page replaces the header. */}
                    <Link
                      href={item.href}
                      transitionTypes={typesFor(item.page, item.transition)}
                      onClick={samePage ? () => setOpen(false) : undefined}
                      className="flex items-center justify-between rounded-2xl px-5 py-4 font-serif text-xl text-white transition-colors hover:bg-white/10 active:bg-white/15"
                    >
                      {item.label}
                      <span aria-hidden="true" className="pending-mark" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

