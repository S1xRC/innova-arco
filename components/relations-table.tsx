import { acceptRelationAction } from "@/actions/invitations";
import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RELATION_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { CompanyRelationRow } from "@/types";

export function RelationsTable({
  relations,
  showAccept = false,
}: {
  relations: CompanyRelationRow[];
  showAccept?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Proveedora</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Desde</TableHead>
          {showAccept ? <TableHead className="text-right">Acción</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {relations.map((relation) => (
          <TableRow key={relation.id}>
            <TableCell className="font-medium">{relation.providerName}</TableCell>
            <TableCell className="text-muted-foreground">
              {relation.providerEmail ?? "—"}
            </TableCell>
            <TableCell>
              {relation.status === "ACTIVE" ? (
                <Badge variant="success">
                  {RELATION_STATUS_LABELS.ACTIVE}
                </Badge>
              ) : relation.status === "INVITED" ? (
                <Badge variant="warning">
                  {RELATION_STATUS_LABELS.INVITED}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {RELATION_STATUS_LABELS.REVOKED}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {formatDate(relation.acceptedAt ?? relation.createdAt)}
            </TableCell>
            {showAccept ? (
              <TableCell className="text-right">
                {relation.status === "INVITED" ? (
                  <ActionButton
                    action={acceptRelationAction}
                    payload={{ membershipId: relation.id }}
                    label="Aceptar"
                    pendingLabel="Aceptando…"
                    icon="check"
                    variant="default"
                  />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
