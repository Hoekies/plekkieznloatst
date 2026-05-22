"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}

export default function AdminNavLink({ href, children, exact = false }: Props) {
  const pathname = usePathname();
  const isActief = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link className={`admin-nav-link${isActief ? " actief" : ""}`} href={href}>
      {children}
    </Link>
  );
}
