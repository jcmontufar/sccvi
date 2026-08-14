export const maximumFailedPinAttempts = 5;
export const pinLockDurationMilliseconds = 15 * 60 * 1000;

export type PinAttemptState = {
  failedPinAttempts: number;
  pinLockedUntil: Date | null;
};

export function isPinAttemptLocked(
  state: PinAttemptState,
  currentInstant = new Date(),
) {
  return Boolean(state.pinLockedUntil && state.pinLockedUntil > currentInstant);
}

export function nextFailedPinAttemptState(
  state: PinAttemptState,
  currentInstant = new Date(),
): PinAttemptState {
  if (isPinAttemptLocked(state, currentInstant)) return state;

  const previousFailures = state.pinLockedUntil ? 0 : state.failedPinAttempts;
  const failedPinAttempts = previousFailures + 1;
  return {
    failedPinAttempts,
    pinLockedUntil:
      failedPinAttempts >= maximumFailedPinAttempts
        ? new Date(currentInstant.getTime() + pinLockDurationMilliseconds)
        : null,
  };
}

export function resetPinAttemptState(): PinAttemptState {
  return { failedPinAttempts: 0, pinLockedUntil: null };
}
