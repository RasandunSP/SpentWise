"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { PressLink } from "@/components/pressable";

const DESTINATIONS = [
  // Named for what they contain, not for where they sit in the hierarchy —
  // "Home" tells you nothing about what you'll find there.
  { href: "/home", label: "Today", icon: "line_start_circle" },
  { href: "/reports", label: "Reports", icon: "donut_small" },
  { href: "/convert", label: "Convert", icon: "currency_exchange" },
  { href: "/settings", label: "Settings", icon: "tune" },
] as const;

/**
 * Four even destinations on a translucent bar that content scrolls under,
 * rather than an opaque strip that permanently removes 80px from the screen.
 *
 * Adding an expense used to live here as a raised middle button; it now has a
 * full-width call to action on the home screen instead, which gives it far
 * more presence than a 52px circle did.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="material material-top fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch px-4 py-2.5">
        {DESTINATIONS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <PressLink
                href={href}
                aria-current={active ? "page" : undefined}
                className="tap flex flex-col items-center gap-1.5 rounded-lg py-1"
              >
                <Icon
                  name={icon}
                  size={23}
                  filled={active}
                  weight={active ? 400 : 250}
                  className={active ? "text-ink" : "text-ink-faint"}
                />
                <span
                  className={`text-label uppercase ${active ? "text-ink" : "text-ink-faint"}`}
                  style={{ fontWeight: active ? 700 : 500 }}
                >
                  {label}
                </span>
              </PressLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
