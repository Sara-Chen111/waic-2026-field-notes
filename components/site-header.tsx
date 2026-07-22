"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, Menu, X } from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/overview", label: "2026 WAIC 展会总览" },
  { href: "/insights", label: "Sara 参展心得分享" },
  { href: "/agent", label: "展商速查" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/overview" aria-label="WAIC 2026 首页">
          <span className="brand__mark">W</span>
          <span>
            <strong>WAIC 2026</strong>
            <small>FIELD NOTES</small>
          </span>
        </Link>

        <nav className={open ? "site-nav is-open" : "site-nav"} aria-label="主导航">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : ""}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-tools">
          <Link className="icon-link" href="/admin" aria-label="管理者后台" title="管理者后台">
            <LockKeyhole size={18} strokeWidth={1.8} />
          </Link>
          <button
            className="icon-button menu-button"
            type="button"
            aria-expanded={open}
            aria-label={open ? "关闭导航" : "打开导航"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
