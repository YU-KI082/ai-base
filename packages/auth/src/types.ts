export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  permissions: string[];
};

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 409 = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
