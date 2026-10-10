import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResolveClaimButton } from "@/components/resolve-claim-button";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";
import type { ProviderClaim } from "@/types";

export function ProviderClaimsTable({ claims }: { claims: ProviderClaim[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Solicitada</TableHead>
          <TableHead>Patente</TableHead>
          <TableHead>Grabación</TableHead>
          <TableHead>Conductor</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((claim) => (
          <TableRow key={claim.id}>
            <TableCell>{formatDate(claim.createdAt)}</TableCell>
            <TableCell className="font-medium">{claim.licensePlate}</TableCell>
            <TableCell>
              {formatDate(claim.recordedAt)} · {formatTime(claim.recordedAt)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {claim.driverEmail}
            </TableCell>
            <TableCell>
              {claim.status === "PENDING" ? (
                <Badge variant="warning">{STATUS_LABELS.PENDING}</Badge>
              ) : (
                <Badge variant="success">{STATUS_LABELS.DELETED}</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {claim.status === "PENDING" ? (
                <ResolveClaimButton requestId={claim.id} />
              ) : (
                <span className="text-muted-foreground text-xs">
                  Resuelta
                  {claim.resolvedAt ? ` el ${formatDate(claim.resolvedAt)}` : ""}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
