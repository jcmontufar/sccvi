import { z } from "zod";

export const activeStateSchema = z.boolean({
  error: "El estado activo no es válido.",
});
