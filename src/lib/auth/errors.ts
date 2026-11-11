export class AuthenticationError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class InvalidTokenError extends Error {
  constructor(message = "Access token failed validation.") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export class AuthConfigurationError extends Error {
  constructor(message = "Auth0 is not configured.") {
    super(message);
    this.name = "AuthConfigurationError";
  }
}
