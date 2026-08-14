import { ApplicationError } from "@/lib/errors/application-error";

export function validateChildGuardianAssociation({
  duplicate,
  childHealthCenterId,
  guardianHealthCenterId,
}: {
  duplicate: boolean;
  childHealthCenterId: string;
  guardianHealthCenterId: string;
}) {
  if (childHealthCenterId !== guardianHealthCenterId) {
    throw new ApplicationError("FORBIDDEN");
  }
  if (duplicate) {
    throw new ApplicationError("CHILD_GUARDIAN_DUPLICATE");
  }
}
