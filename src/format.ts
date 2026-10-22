export type FormatVariables = Readonly<Record<string, string | number>>

export class MissingVariablesError extends Error {
  readonly variables: readonly string[]

  constructor(variables: string[]) {
    super(`Missing template variables: ${variables.map((name) => `$${name}`).join(', ')}`)
    this.name = 'MissingVariablesError'
    this.variables = variables
  }
}

/** Replace $name tokens with supplied values. $$ produces a literal dollar sign.
 * Values are inserted once, without interpreting tokens or HTML inside them.
 * The result is plain text; callers must escape it when inserting into HTML.
 */
export function format(template: string, variables: FormatVariables): string {
  const missing = new Set<string>()
  const result = template.replace(/\$\$|\$([A-Za-z_][A-Za-z0-9_]*)/g, (token, name: string | undefined) => {
    if (name === undefined) return '$'
    if (!Object.hasOwn(variables, name) || variables[name] === undefined) {
      missing.add(name)
      return token
    }
    return String(variables[name])
  })

  if (missing.size) throw new MissingVariablesError([...missing])
  return result
}

/** Format a set of named text fields with the same supplied variables. */
export function formatFields<Key extends string>(
  templates: Readonly<Record<Key, string>>,
  variables: FormatVariables,
): Record<Key, string> {
  return Object.fromEntries(
    Object.entries<string>(templates).map(([key, template]) => [key, format(template, variables)]),
  ) as Record<Key, string>
}
