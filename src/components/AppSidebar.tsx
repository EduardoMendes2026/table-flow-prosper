import { useAuth } from "@/hooks/useAuth";
import { useRestaurant, useTrialStatus } from "@/hooks/useRestaurant";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Table2,
  ClipboardList,
  CookingPot,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ownerLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/mesas", icon: Table2, label: "Mesas" },
  { to: "/cardapio", icon: UtensilsCrossed, label: "Cardápio" },
  { to: "/pedidos", icon: ClipboardList, label: "Pedidos" },
  { to: "/cozinha", icon: CookingPot, label: "Cozinha" },
  { to: "/caixa", icon: DollarSign, label: "Caixa" },
  { to: "/funcionarios", icon: Users, label: "Funcionários" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const employeeLinks = [
  { to: "/mesas", icon: Table2, label: "Mesas" },
  { to: "/cardapio", icon: UtensilsCrossed, label: "Cardápio" },
  { to: "/pedidos", icon: ClipboardList, label: "Pedidos" },
  { to: "/cozinha", icon: CookingPot, label: "Cozinha" },
  { to: "/caixa", icon: DollarSign, label: "Caixa" },
];

const adminLinks = [
  { to: "/admin", icon: Shield, label: "Painel Admin" },
  ...ownerLinks,
];

export function AppSidebar() {
  const { userRole, signOut, user } = useAuth();
  const { data: restaurant } = useRestaurant();
  const { daysLeft, status } = useTrialStatus();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = userRole?.role === "admin_master"
    ? adminLinks
    : userRole?.role === "dono_restaurante"
      ? ownerLinks
      : employeeLinks;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
          <UtensilsCrossed className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{restaurant?.name || "Restaurante"}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{userRole?.display_name || user?.email}</p>
        </div>
      </div>

      {status === "trial" && (
        <div className="mx-3 mt-3 rounded-lg bg-sidebar-accent p-3 text-xs">
          <p className="font-medium">Período de teste</p>
          <p className="text-sidebar-foreground/60">{daysLeft} dias restantes</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Badge variant="outline" className="mb-2 w-full justify-center border-sidebar-border text-sidebar-foreground/60">
          {userRole?.role === "admin_master" ? "Admin Master" : userRole?.role === "dono_restaurante" ? "Proprietário" : "Funcionário"}
        </Badge>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-sidebar p-2 text-sidebar-foreground shadow-lg md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
