export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function appUrl(): string {
  const raw = optionalEnv("APP_URL") ?? "http://localhost:3000";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}
