import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "authorization",
      "headers.authorization",
      "request.headers.authorization",
      "*.accessToken",
      "*.access_token",
      "*.clientSecret",
      "*.client_secret"
    ],
    censor: "[redacted]"
  }
});
