"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";

function subscribe(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's non-standard flag — still the only reliable iOS signal.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS has no `beforeinstallprompt` — Safari only ever installs a PWA through
 * Share → Add to Home Screen. So this walks the user through it, and hides
 * itself once the app is already running standalone.
 *
 * The server snapshot claims "installed" so the hint is absent from the HTML
 * and appears only for browser visitors; the reverse would flash install
 * instructions at people who already installed it.
 */
export function InstallHint() {
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => true);

  if (standalone) return null;

  return (
    <section>
      <h2 className="text-label uppercase text-ink-faint">Install</h2>
      <ol className="flex flex-col gap-2.5 pt-4 text-body text-ink-muted">
        <li className="flex gap-3">
          <span className="tabular text-ink-faint">1</span>
          <span>
            In Safari, tap Share{" "}
            <Icon name="ios_share" size={15} className="align-baseline text-ink-faint" />
          </span>
        </li>
        <li className="flex gap-3">
          <span className="tabular text-ink-faint">2</span>
          <span>Choose Add to Home Screen</span>
        </li>
        <li className="flex gap-3">
          <span className="tabular text-ink-faint">3</span>
          <span>Open it from the icon — it runs full screen</span>
        </li>
      </ol>
    </section>
  );
}
