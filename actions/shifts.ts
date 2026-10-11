"use server";

import { revalidatePath } from "next/cache";

import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { shiftIdSchema } from "@/lib/validation";
import type { ActionState } from "@/types/actions";

/**
 * Removes a generated shift (occurrence). The weekly schedule itself is managed
 * in `actions/schedule.ts`.
 *
 * A shift that already holds a recording cannot be removed here: that would
 * break the assignment (and possibly a driver's right of access). Delete the
 * schedule entry instead, which preserves recorded occurrences.
 */
export async function deleteShiftAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireCompany("MINING");

  const parsed = shiftIdSchema.safeParse({
    shiftId: String(formData.get("shiftId") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "El turno no es válido." };
  }

  const supabase = await createClient();

  const { data: deleted, error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", parsed.data.shiftId)
    .eq("mining_id", profile.companyId)
    .is("matched_video_id", null)
    .select("id");

  if (error) {
    console.error("[ARCO] deleteShiftAction:", error.message);
    return { status: "error", message: "No fue posible eliminar el turno." };
  }

  if (!deleted || deleted.length === 0) {
    return {
      status: "error",
      message:
        "No se puede eliminar un turno con grabación asignada. Ajusta el horario en «Horario».",
    };
  }

  revalidatePath("/mining/shifts");
  revalidatePath("/mining/schedule");
  revalidatePath("/mining");

  return { status: "success", message: "Turno eliminado." };
}
