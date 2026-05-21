"use client";

import { useNavigation, type RouteName } from "@/contexts/NavigationContext";
import { useTranslations } from "@/lib/translations";

const SEGMENTS: { route: RouteName; labelKey: string }[] = [
  { route: "account-profile", labelKey: "profile.title" },
  { route: "account-share", labelKey: "share.title" },
];

export function AccountSegmentedNav() {
  const t = useTranslations();
  const { stack, replace } = useNavigation();
  const currentRoute = stack[stack.length - 1];
  const currentName = currentRoute?.name;

  return (
    <nav className="account-segmented-nav" role="tablist">
      {SEGMENTS.map(({ route, labelKey }) => {
        const isActive = currentName === route;
        return (
          <button
            key={route}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`account-segmented-nav__item${
              isActive ? " account-segmented-nav__item--active" : ""
            }`}
            onClick={() => {
              if (!isActive) replace({ name: route });
            }}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
