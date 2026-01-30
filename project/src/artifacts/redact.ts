/**
 * Module de redaction best-effort des secrets
 * Protège contre les fuites de tokens, clés API, etc.
 */

// Patterns de secrets à redacter
const SECRET_PATTERNS: { pattern: RegExp; name: string }[] = [
  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi, name: "Bearer token" },
  // OpenAI/Anthropic style API keys
  { pattern: /sk-[A-Za-z0-9]{20,}/g, name: "API key (sk-...)" },
  // JWT tokens (xxx.yyy.zzz)
  {
    pattern: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+/g,
    name: "JWT token",
  },
  // AWS secrets
  {
    pattern: /AWS_SECRET_ACCESS_KEY[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
    name: "AWS secret",
  },
  // Generic env var patterns
  { pattern: /[A-Z_]+_TOKEN[=:]\s*["']?[^\s"']+["']?/g, name: "Token env var" },
  {
    pattern: /[A-Z_]+_API_KEY[=:]\s*["']?[^\s"']+["']?/g,
    name: "API key env var",
  },
  // GitHub tokens
  { pattern: /gh[pousr]_[A-Za-z0-9]{36,}/g, name: "GitHub token" },
];

/** Placeholder pour les valeurs redactées */
const REDACTED = "[REDACTED]";

/** Callback pour signaler une redaction */
export type RedactionCallback = (patternName: string) => void;

/**
 * Applique une redaction best-effort sur un texte
 * @param text Texte à redacter
 * @param onRedact Callback optionnel appelé pour chaque redaction
 * @returns Texte avec les secrets masqués
 */
export function redactSecrets(
  text: string,
  onRedact?: RedactionCallback,
): string {
  let result = text;

  for (const { pattern, name } of SECRET_PATTERNS) {
    // Reset lastIndex pour les patterns avec flag 'g'
    pattern.lastIndex = 0;

    if (pattern.test(result)) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, REDACTED);
      onRedact?.(name);
    }
  }

  return result;
}

/**
 * Redacte un objet en profondeur (pour JSON)
 * @param obj Objet à redacter
 * @param onRedact Callback optionnel
 * @returns Copie de l'objet avec valeurs redactées
 */
export function redactObject<T>(obj: T, onRedact?: RedactionCallback): T {
  if (typeof obj === "string") {
    return redactSecrets(obj, onRedact) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, onRedact)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = redactObject(value, onRedact);
    }
    return result as T;
  }

  return obj;
}
