import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  User,
  Eye,
  Pencil,
  Trash,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Unlock,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import {
  MODULES,
  parsePermissionsMatrix,
  buildPermissionsArray,
  fullPermissionsMatrix,
  type PermAction,
} from "@/lib/permissions";
import type { Branch } from "@shared/schema";

interface BlockedIPEntry {
  ip: string;
  blockedAt: string;
  attempts: number;
}

interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  branchId: number | null;
  isActive: boolean;
}

const ROLES = ["admin", "staff", "accountant", "teacher"];
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  staff: "bg-blue-100 text-blue-700",
  accountant: "bg-green-100 text-green-700",
  teacher: "bg-purple-100 text-purple-700",
};

const emptyMatrix = () => {
  const m: Record<string, Record<PermAction, boolean>> = {};
  for (const mod of MODULES)
    m[mod.key] = { read: false, write: false, delete: false };
  return m;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "staff",
  branchId: null as number | null,
  isActive: true,
};

export default function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [permMatrix, setPermMatrix] =
    useState<Record<string, Record<PermAction, boolean>>>(emptyMatrix());
  const [showBlockedIPs, setShowBlockedIPs] = useState(false);

  const { data: users = [], isLoading } = useQuery<SystemUser[]>({
    queryKey: ["/api/auth/users"],
  });
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });
  const { data: blockedIPs = [], refetch: refetchBlockedIPs } = useQuery<
    BlockedIPEntry[]
  >({
    queryKey: ["/api/admin/blocked-ips"],
    enabled: showBlockedIPs,
    queryFn: async () => {
      const res = await fetch("/api/admin/blocked-ips", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: showBlockedIPs ? 15000 : false,
  });

  const unblockMut = useMutation({
    mutationFn: (ip: string) =>
      apiRequest("DELETE", `/api/admin/blocked-ips/${encodeURIComponent(ip)}`),
    onSuccess: (_data, ip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocked-ips"] });
      toast({ title: `IP ${ip} unblocked successfully` });
    },
    onError: () =>
      toast({ title: "Failed to unblock IP", variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/auth/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      setOpen(false);
      toast({ title: "User created" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/auth/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      setOpen(false);
      toast({ title: "User updated" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({ title: "User deleted" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPermMatrix(emptyMatrix());
    setOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      branchId: u.branchId,
      isActive: u.isActive,
    });
    setPermMatrix(
      u.role === "admin"
        ? fullPermissionsMatrix()
        : parsePermissionsMatrix(u.permissions ?? []),
    );
    setOpen(true);
  };

  const handleRoleChange = (role: string) => {
    setForm((f) => ({ ...f, role }));
    if (role === "admin") setPermMatrix(fullPermissionsMatrix());
  };

  const togglePerm = (mod: string, action: PermAction, value: boolean) => {
    setPermMatrix((prev) => {
      const next = { ...prev, [mod]: { ...prev[mod], [action]: value } };
      // If write or delete is checked, auto-enable read
      if ((action === "write" || action === "delete") && value) {
        next[mod].read = true;
      }
      // If read is unchecked, clear write and delete too
      if (action === "read" && !value) {
        next[mod].write = false;
        next[mod].delete = false;
      }
      return next;
    });
  };

  const toggleAll = (action: PermAction, value: boolean) => {
    setPermMatrix((prev) => {
      const next = { ...prev };
      for (const mod of MODULES) {
        next[mod.key] = { ...next[mod.key], [action]: value };
        if ((action === "write" || action === "delete") && value)
          next[mod.key].read = true;
        if (action === "read" && !value) {
          next[mod.key].write = false;
          next[mod.key].delete = false;
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const permissions =
      form.role === "admin" ? [] : buildPermissionsArray(permMatrix);
    if (editing) {
      const data: any = {
        name: form.name,
        role: form.role,
        branchId: form.branchId,
        isActive: form.isActive,
        permissions,
      };
      if (form.password) data.password = form.password;
      updateMut.mutate({ id: editing.id, data });
    } else {
      createMut.mutate({ ...form, permissions });
    }
  };

  const isAdmin = form.role === "admin";
  const allRead = MODULES.every((m) => permMatrix[m.key]?.read);
  const allWrite = MODULES.every((m) => permMatrix[m.key]?.write);
  const allDelete = MODULES.every((m) => permMatrix[m.key]?.delete);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage users, roles, and module-wise permissions
          </p>
        </div>
        <Button
          data-testid="button-add-user"
          onClick={openCreate}
          className="gap-2 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const modCount =
                u.role === "admin"
                  ? MODULES.length
                  : MODULES.filter((m) =>
                      (u.permissions ?? []).some((p) =>
                        p.startsWith(m.key + ":"),
                      ),
                    ).length;
              return (
                <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      <ShieldCheck className="w-3 h-3" /> {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {u.branchId
                        ? (branches.find((b) => b.id === u.branchId)?.name ??
                          "Unknown")
                        : "All Branches"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <span className="text-xs font-medium text-primary">
                        Full Access
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {modCount} module{modCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(u)}
                        data-testid={`button-edit-user-${u.id}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remove user ${u.name}?`))
                              deleteMut.mutate(u.id);
                          }}
                          data-testid={`button-delete-user-${u.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit User Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update user details and module permissions."
                : "Create a new user and assign role and module permissions."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  data-testid="input-user-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Rahul Verma"
                  required
                />
              </div>
              {!editing && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    data-testid="input-user-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="user@example.com"
                    required
                  />
                </div>
              )}
              <div className="col-span-2 space-y-1.5">
                <Label>
                  {editing
                    ? "New Password (leave blank to keep)"
                    : "Password *"}
                </Label>
                <Input
                  data-testid="input-user-password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  required={!editing}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={handleRoleChange}>
                  <SelectTrigger data-testid="select-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select
                  value={form.branchId ? String(form.branchId) : "all"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      branchId: v === "all" ? null : Number(v),
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-user-branch">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Module Permissions
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAdmin
                      ? "Admin has full access to all modules."
                      : "Choose what each user can do per module."}
                  </p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                        Module
                      </th>
                      <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-20">
                        <div className="flex flex-col items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Read</span>
                        </div>
                      </th>
                      <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-20">
                        <div className="flex flex-col items-center gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Write</span>
                        </div>
                      </th>
                      <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-20">
                        <div className="flex flex-col items-center gap-1">
                          <Trash className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Delete</span>
                        </div>
                      </th>
                    </tr>
                    {/* Select All row */}
                    <tr className="bg-primary/5 border-b">
                      <td className="px-3 py-2 text-xs font-semibold text-primary">
                        Select All
                      </td>
                      {(["read", "write", "delete"] as PermAction[]).map(
                        (action) => (
                          <td key={action} className="text-center px-3 py-2">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={
                                  isAdmin ||
                                  (action === "read"
                                    ? allRead
                                    : action === "write"
                                      ? allWrite
                                      : allDelete)
                                }
                                disabled={isAdmin}
                                onCheckedChange={(v) => toggleAll(action, !!v)}
                                data-testid={`checkbox-all-${action}`}
                              />
                            </div>
                          </td>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod, idx) => (
                      <tr
                        key={mod.key}
                        className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                      >
                        <td className="px-3 py-2.5 font-medium text-sm">
                          {mod.label}
                        </td>
                        {(["read", "write", "delete"] as PermAction[]).map(
                          (action) => (
                            <td
                              key={action}
                              className="text-center px-3 py-2.5"
                            >
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={
                                    isAdmin ||
                                    (permMatrix[mod.key]?.[action] ?? false)
                                  }
                                  disabled={isAdmin}
                                  onCheckedChange={(v) =>
                                    togglePerm(mod.key, action, !!v)
                                  }
                                  data-testid={`checkbox-${mod.key}-${action}`}
                                />
                              </div>
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2.5">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  <strong>Read</strong> — View only
                </span>
                <span className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-emerald-500" />
                  <strong>Write</strong> — Create &amp; Edit
                </span>
                <span className="flex items-center gap-1.5">
                  <Trash className="w-3.5 h-3.5 text-red-500" />
                  <strong>Delete</strong> — Remove records
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="button-save-user"
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editing ? "Update" : "Create"} User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Blocked IPs — Admin Only, Hidden by Default */}
      <div className="border border-border/50 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBlockedIPs((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
          data-testid="toggle-blocked-ips"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">
                Blocked IPs
              </p>
              <p className="text-xs text-muted-foreground">
                IPs blocked due to too many failed login attempts
              </p>
            </div>
            {blockedIPs.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {blockedIPs.length} blocked
              </Badge>
            )}
          </div>
          {showBlockedIPs ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showBlockedIPs && (
          <div className="border-t border-border/40">
            <div className="flex items-center justify-between px-5 py-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Auto-unblocked after 15 minutes. Manually unblock if needed.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchBlockedIPs()}
                className="h-7 gap-1.5 text-xs"
                data-testid="button-refresh-blocked-ips"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>

            {blockedIPs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 text-green-400 mb-2" />
                <p className="text-sm font-medium text-green-600">
                  No blocked IPs right now
                </p>
                <p className="text-xs mt-1">
                  All clear — no suspicious login activity detected
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>IP Address</TableHead>
                      <TableHead>Blocked At</TableHead>
                      <TableHead>Failed Attempts</TableHead>
                      <TableHead>Auto Unblocks In</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIPs.map((entry) => {
                      const blockedAt = new Date(entry.blockedAt);
                      const unblockAt = new Date(
                        blockedAt.getTime() + 15 * 60 * 1000,
                      );
                      const minsLeft = Math.max(
                        0,
                        Math.ceil((unblockAt.getTime() - Date.now()) / 60000),
                      );
                      return (
                        <TableRow
                          key={entry.ip}
                          data-testid={`row-blocked-ip-${entry.ip}`}
                        >
                          <TableCell>
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                              {entry.ip}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {blockedAt.toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">
                              {entry.attempts} attempts
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {minsLeft > 0
                              ? `~${minsLeft} min`
                              : "Expiring soon"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 text-xs text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => unblockMut.mutate(entry.ip)}
                              disabled={unblockMut.isPending}
                              data-testid={`button-unblock-${entry.ip}`}
                            >
                              <Unlock className="w-3 h-3" /> Unblock
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
