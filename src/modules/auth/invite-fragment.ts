export function parseInvitationFragment(fragment: string) {
  const parameters = new URLSearchParams(fragment.replace(/^#/, ""));
  const accessToken = parameters.get("access_token");
  const refreshToken = parameters.get("refresh_token");
  if (parameters.get("type") !== "invite" || !accessToken || !refreshToken)
    return null;
  return { accessToken, refreshToken };
}
