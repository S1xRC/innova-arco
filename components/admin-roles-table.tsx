import { AdminRoleSelect } from "@/components/admin-role-select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { AdminUserRow } from "@/types";

export function AdminRolesTable({ users }: { users: AdminUserRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Correo</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Alta</TableHead>
          <TableHead>Admin</TableHead>
          <TableHead>Rol</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.email}</TableCell>
            <TableCell className="text-muted-foreground">
              {user.fullName ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {formatDate(user.createdAt)}
            </TableCell>
            <TableCell>
              {user.isPlatformAdmin ? (
                <Badge variant="default">Admin</Badge>
              ) : (
                <Badge variant="outline">—</Badge>
              )}
            </TableCell>
            <TableCell>
              <AdminRoleSelect userId={user.id} role={user.role} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
