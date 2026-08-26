import { ApplicationError } from "@/lib/errors/application-error";
import { authorize } from "@/modules/auth/authorization";
import type { ApplicationUser } from "@/modules/auth/types";

export function assertVaccinationRegistration(input: {
  user: ApplicationUser;
  child: {
    isActive: boolean;
    dateOfBirth: string;
    healthCenterId: string;
    guardianUserIds?: readonly string[];
  };
  schedule: { isActive: boolean; hasApprovedVersion: boolean };
  applicationDate: string;
  duplicate: boolean;
}) {
  authorize(input.user, "vaccination:create", {
    healthCenterId: input.child.healthCenterId,
    guardianUserIds: input.child.guardianUserIds,
  });
  if (!input.child.isActive || !input.schedule.isActive) {
    throw new ApplicationError("VALIDATION_ERROR");
  }
  if (!input.schedule.hasApprovedVersion) {
    throw new ApplicationError("VACCINE_SCHEDULE_NOT_FOUND");
  }
  if (input.applicationDate < input.child.dateOfBirth) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "La fecha de aplicación no puede ser anterior al nacimiento.",
    );
  }
  if (input.duplicate) {
    throw new ApplicationError("VACCINATION_DUPLICATE");
  }
}
