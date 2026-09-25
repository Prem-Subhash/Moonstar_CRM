"use client";

import {
  LayoutGrid,
  Users,
  Settings,
  GitBranch,
  RefreshCw,
  Briefcase,
  FileText,
  PieChart,
  ListTodo,
  DollarSign,
  Activity,
  PlusCircle,
  FileCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface SidebarProps {
  setIsHovered: (hovered: boolean) => void;
  isHovered: boolean;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: MenuItem[];
}

export default function Sidebar({
  setIsHovered,
  isHovered,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [insuranceAccess, setInsuranceAccess] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Insurance: false,
    Mortgage: false,
  });

  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user && mounted) {
        const { data } = await supabase
          .from("profiles")
          .select("role, insurance_access")
          .eq("id", user.id)
          .single();

        if (data && mounted) {
          setRole(data.role);
          if (data.insurance_access) {
            setInsuranceAccess(data.insurance_access);
          }
        }
      }
    };
    fetchRole();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (path.startsWith("#")) return false;
    if (path !== "/" && path !== `/${role}` && pathname.startsWith(path))
      return true;
    return false;
  };

  const csrMenu: MenuItem[] = [
    { label: "Dashboard", href: "/csr", icon: <LayoutGrid size={24} /> },
    ...(insuranceAccess.includes("personal")
      ? [
          {
            label: "Personal",
            href: "#personal",
            icon: <GitBranch size={24} />,
            children: [
              {
                label: "Personal Pipeline",
                href: "/csr/pipeline/personal",
                icon: <GitBranch size={18} />,
              },
              {
                label: "Personal Renewal",
                href: "/csr/renewals/personal",
                icon: <RefreshCw size={18} />,
              },
            ],
          },
        ]
      : []),
    ...(insuranceAccess.includes("commercial")
      ? [
          {
            label: "Commercial",
            href: "#commercial",
            icon: <Briefcase size={24} />,
            children: [
              {
                label: "Commercial Pipeline",
                href: "/csr/pipeline/commercial",
                icon: <Briefcase size={18} />,
              },
              {
                label: "Commercial Renewal",
                href: "/csr/renewals/commercial",
                icon: <RefreshCw size={18} />,
              },
            ],
          },
        ]
      : []),
    { label: "Reports", href: "/csr/reports", icon: <FileText size={24} /> },
  ];

  const adminMenu: MenuItem[] = [
    { label: "Dashboard", href: "/admin", icon: <LayoutGrid size={24} /> },
    {
      label: "Admin Leads",
      href: "/admin/admin-leads",
      icon: <Briefcase size={24} />,
      children: [
        {
          label: "Personal",
          href: "/admin/insurance/personal",
          icon: <GitBranch size={18} />,
        },
        {
          label: "Personal Renewal",
          href: "/admin/insurance/personal-renewal",
          icon: <RefreshCw size={18} />,
        },
        {
          label: "Commercial",
          href: "/admin/insurance/commercial",
          icon: <Briefcase size={18} />,
        },
        {
          label: "Commercial Renewal",
          href: "/admin/insurance/commercial-renewal",
          icon: <RefreshCw size={18} />,
        },
      ],
    },
    { label: "All Leads", href: "/admin/leads", icon: <GitBranch size={24} /> },
    {
      label: "Lead Assignments",
      href: "/admin/assignments",
      icon: <ListTodo size={24} />,
    },
    {
      label: "Pipelines Monitor",
      href: "/admin/pipelines",
      icon: <Activity size={24} />,
    },
    {
      label: "CSR Performance",
      href: "/admin/csrs",
      icon: <Users size={24} />,
    },
    { label: "Reports", href: "/admin/reports", icon: <PieChart size={24} /> },
  ];

  const accountingMenu: MenuItem[] = [
    { label: "Dashboard", href: "/accounting", icon: <LayoutGrid size={24} /> },
    {
      label: "Policy Ledger",
      href: "/accounting/all-leads",
      icon: <GitBranch size={24} />,
      children: [
        {
          label: "All Policies",
          href: "/accounting/all-leads",
          icon: <GitBranch size={18} />,
        },
        {
          label: "Personal - New",
          href: "/accounting/all-leads?category=personal&flow=new",
          icon: <FileCheck size={18} />,
        },
        {
          label: "Personal - Renewal",
          href: "/accounting/all-leads?category=personal&flow=renewal",
          icon: <RefreshCw size={18} />,
        },
        {
          label: "Commercial - New",
          href: "/accounting/all-leads?category=commercial&flow=new",
          icon: <Briefcase size={18} />,
        },
        {
          label: "Commercial - Renewal",
          href: "/accounting/all-leads?category=commercial&flow=renewal",
          icon: <RefreshCw size={18} />,
        },
      ],
    },
    {
      label: "Reconciliation Queue",
      href: "/accounting/all-leads?status=discrepancy",
      icon: <Activity size={24} />,
    },
    {
      label: "Carrier Statements",
      href: "/accounting/statements",
      icon: <FileText size={24} />,
    },
    {
      label: "Financial Reports",
      href: "/accounting/reports",
      icon: <DollarSign size={24} />,
    },
    {
      label: "Audit Log",
      href: "/accounting/audit-logs",
      icon: <PieChart size={24} />,
    },
  ];

  const superadminMenu: MenuItem[] = [
    { label: "Dashboard", href: "/superadmin", icon: <LayoutGrid size={24} /> },
    {
      label: "User Management",
      href: "/superadmin/users",
      icon: <Users size={24} />,
    },
    {
      label: "Insurance",
      href: "#insurance",
      icon: <PieChart size={24} />,
      children: [
        {
          label: "All Leads",
          href: "/superadmin/insurance/leads",
          icon: <GitBranch size={18} />,
        },
        {
          label: "Personal",
          href: "/superadmin/insurance/personal",
          icon: <GitBranch size={18} />,
        },
        {
          label: "Commercial",
          href: "/superadmin/insurance/commercial",
          icon: <Briefcase size={18} />,
        },
        {
          label: "Personal Renewal",
          href: "/superadmin/insurance/renewals/personal",
          icon: <RefreshCw size={18} />,
        },
        {
          label: "Commercial Renewal",
          href: "/superadmin/insurance/renewals/commercial",
          icon: <RefreshCw size={18} />,
        },
        {
          label: "Pipelines",
          href: "/superadmin/insurance/pipelines",
          icon: <Activity size={18} />,
        },
        {
          label: "Create Lead",
          href: "/superadmin/insurance/leads/new",
          icon: <PlusCircle size={18} />,
        },
        {
          label: "Assign CSR",
          href: "/superadmin/insurance/assignments",
          icon: <ListTodo size={18} />,
        },
      ],
    },
    {
      label: "Mortgage",
      href: "#mortgage",
      icon: <Briefcase size={24} />,
      children: [
        {
          label: "All Applications",
          href: "/superadmin/mortgage/applications",
          icon: <LayoutGrid size={18} />,
        },
        {
          label: "New Loan",
          href: "/superadmin/mortgage/new-loan",
          icon: <GitBranch size={18} />,
        },
        {
          label: "Pre-Approval",
          href: "/superadmin/mortgage/pre-approval",
          icon: <FileCheck size={18} />,
        },
        {
          label: "Pipelines Monitor",
          href: "/superadmin/mortgage/pipelines",
          icon: <Activity size={18} />,
        },
        {
          label: "Create Application",
          href: "/superadmin/mortgage/create",
          icon: <PlusCircle size={18} />,
        },
        {
          label: "Assign Officer",
          href: "/superadmin/mortgage/assignments",
          icon: <Users size={18} />,
        },
      ],
    },
    {
      label: "Accurate Lending",
      href: "#lending",
      icon: <FileText size={24} />,
    },
    {
      label: "Accounting",
      href: "/accounting",
      icon: <DollarSign size={24} />,
    },
    {
      label: "Audit Logs",
      href: "/superadmin/audit-logs",
      icon: <Activity size={24} />,
    },
    {
      label: "System Settings",
      href: "/superadmin/system-settings",
      icon: <Settings size={24} />,
    },
  ];

  const getMenuForRole = () => {
    switch (role) {
      case "csr":
        return csrMenu;
      case "admin":
        return adminMenu;
      case "accounting":
        return accountingMenu;
      case "superadmin":
        return superadminMenu;
      default:
        return [];
    }
  };

  const currentMenu = getMenuForRole();

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      let changed = false;
      currentMenu.forEach(item => {
        if (item.children) {
          const isChildActive = item.children.some(c => isActive(c.href));
          if (isChildActive && !next[item.label]) {
            next[item.label] = true;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, role]);

  return (
    <aside
      className={`
                fixed left-0 bottom-0 z-[50] bg-gradient-to-b from-[#10B889] to-[#2E5C85] text-white flex flex-col shadow-xl 
                transition-all duration-300 ease-in-out
                top-16 lg:top-24
                ${isMobileOpen ? "translate-x-0 w-[280px]" : "-translate-x-full lg:translate-x-0"}
                ${isHovered ? "lg:w-[260px] items-start" : "lg:w-[110px] items-center"}
            `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <nav className="flex-1 flex flex-col gap-2 mt-3 w-full px-2 overflow-y-auto pb-8">
        {currentMenu.map((item, index) => {
          const expanded = isHovered || isMobileOpen;
          if (item.children && item.children.length > 0) {
            const isOpen = !!openSections[item.label];
            const isChildActive = item.children.some((c) => isActive(c.href));
            return (
              <div key={index} className="w-full flex flex-col">
                <div
                  onClick={() => {
                    if (!expanded) {
                      setIsHovered(true);
                      setOpenSections((prev) => ({
                        ...prev,
                        [item.label]: true,
                      }));
                    } else {
                      toggleSection(item.label);
                    }
                  }}
                  className={`
                                        flex transition-all duration-300 ease-in-out rounded-xl cursor-pointer select-none
                                        ${
                                          expanded
                                            ? "flex-row items-center justify-between h-[56px] px-4 gap-3 w-full"
                                            : "flex-col items-center justify-center h-[72px] w-[72px] gap-1.5 mx-auto"
                                        }
                                        ${
                                          isChildActive && !isOpen
                                            ? "bg-white/10 text-white font-bold"
                                            : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md"
                                        }
                                    `}
                  title={item.label}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{item.icon}</div>
                    <span
                      className={`font-semibold tracking-wide transition-all duration-300 whitespace-nowrap ${expanded ? "text-sm opacity-100" : "text-[0px] opacity-0 overflow-hidden"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {expanded && (
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] bg-amber-400 text-gray-900 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown 
                        size={18} 
                        className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  )}
                </div>
                {expanded && isOpen && (
                  <div className="flex flex-col gap-1 mt-1 pl-4 border-l-2 border-white/20 ml-6">
                    {item.children.map((child, cIdx) => (
                      <Link
                        key={cIdx}
                        href={child.href}
                        onClick={() => setIsMobileOpen(false)}
                        className="w-full"
                      >
                        <div
                          className={`
                                                        flex items-center h-[42px] px-3 gap-2 rounded-lg cursor-pointer transition-all duration-200
                                                        ${
                                                          isActive(child.href)
                                                            ? "bg-white text-[#10B889] font-bold shadow-md"
                                                            : "text-white/80 hover:bg-white/10 hover:text-white"
                                                        }
                                                    `}
                        >
                          <div className="flex-shrink-0">{child.icon}</div>
                          <span className="text-xs font-semibold whitespace-nowrap tracking-wide">
                            {child.label}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={index}
              href={item.href}
              className="w-full"
              onClick={() => setIsMobileOpen(false)}
            >
              <SidebarIcon
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                active={isActive(item.href)}
                expanded={expanded}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarIcon({
  icon,
  label,
  badge,
  active,
  expanded,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  expanded: boolean;
}) {
  return (
    <div
      title={label}
      className={`
                flex transition-all duration-300 ease-in-out rounded-xl cursor-pointer
                ${
                  expanded
                    ? "flex-row items-center justify-between h-[56px] px-4 gap-3 w-full"
                    : "flex-col items-center justify-center h-[72px] w-[72px] gap-1.5 mx-auto"
                }
                ${
                  active
                    ? "bg-white text-[#10B889] shadow-lg"
                    : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-md"
                }
            `}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <span
          className={`
                        font-semibold tracking-wide transition-all duration-300 whitespace-nowrap
                        ${expanded ? "text-sm opacity-100" : "text-[0px] opacity-0 overflow-hidden"}
                    `}
        >
          {label}
        </span>
      </div>
      {expanded && badge && (
        <span className="text-[10px] bg-amber-400 text-gray-900 font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
          {badge}
        </span>
      )}
    </div>
  );
}
