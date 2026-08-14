export type ApplicationErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PROFILE_INACTIVE"
  | "PROFILE_NOT_FOUND"
  | "HEALTH_CENTER_NOT_FOUND"
  | "COMMUNITY_NOT_FOUND"
  | "COMMUNITY_DUPLICATE"
  | "GUARDIAN_NOT_FOUND"
  | "CHILD_NOT_FOUND"
  | "CHILD_GUARDIAN_DUPLICATE"
  | "GROWTH_RECORD_NOT_FOUND"
  | "INVALID_GROWTH_MEASUREMENT";

const publicMessages: Record<ApplicationErrorCode, string> = {
  UNAUTHORIZED: "Debes iniciar sesión para continuar.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  VALIDATION_ERROR: "Revisa la información ingresada.",
  PROFILE_INACTIVE: "Tu cuenta de SCCVI está inactiva.",
  PROFILE_NOT_FOUND: "Tu cuenta no tiene un perfil activo en SCCVI.",
  HEALTH_CENTER_NOT_FOUND: "No se encontró el centro de salud.",
  COMMUNITY_NOT_FOUND: "No se encontró la comunidad.",
  COMMUNITY_DUPLICATE:
    "Ya existe una comunidad con ese nombre en el centro de salud.",
  GUARDIAN_NOT_FOUND: "No se encontró el tutor o responsable.",
  CHILD_NOT_FOUND: "No se encontró el niño solicitado.",
  CHILD_GUARDIAN_DUPLICATE:
    "El tutor o responsable ya está asociado con este niño.",
  GROWTH_RECORD_NOT_FOUND: "No se encontró la medición de crecimiento.",
  INVALID_GROWTH_MEASUREMENT: "La medición de crecimiento no es válida.",
};

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message = publicMessages[code],
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function getSafeErrorMessage(error: unknown) {
  return error instanceof ApplicationError
    ? error.message
    : "No fue posible completar la operación. Inténtalo de nuevo.";
}
