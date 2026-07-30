export const NAV_RESELECT_EVENT = "supli:nav-reselect";

export function dispatchNavReselect(href: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NAV_RESELECT_EVENT, { detail: { href } })
  );
}

/** Handle a nav link click: re-selecting the active route clears list filters. */
export function handleNavReselectClick(
  event: { preventDefault: () => void },
  options: {
    href: string;
    pathname: string;
    replace: (href: string) => void;
    onNavigate?: () => void;
  }
) {
  const { href, pathname, replace, onNavigate } = options;
  if (pathname === href) {
    event.preventDefault();
    replace(href);
    dispatchNavReselect(href);
  }
  onNavigate?.();
}
