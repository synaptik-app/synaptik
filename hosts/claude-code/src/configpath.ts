// Where Claude Code keeps the person's keybindings.json (#74): its config folder
// is CLAUDE_CONFIG_DIR when set, else `.claude` in the home folder — HOME, or on
// Windows USERPROFILE (PowerShell and cmd set no HOME). Plain strings in, a path
// or nothing out; the hooks read the variables.

export type ConfigEnv = { CLAUDE_CONFIG_DIR?: string; HOME?: string; USERPROFILE?: string }

// The path, joined with the folder's own separator, or undefined when no
// variable names a folder — never a path built from "undefined".
export function keybindingsPath(env: ConfigEnv): string | undefined {
  const set = (value?: string) => (value && value.trim() ? value.trim() : undefined)
  const configDir = set(env.CLAUDE_CONFIG_DIR)
  if (configDir) return join(configDir, 'keybindings.json')
  const home = set(env.HOME) ?? set(env.USERPROFILE)
  return home ? join(home, '.claude', 'keybindings.json') : undefined
}

// The path as the menu shows it: the home folder written `~`.
export function shownPath(path: string, env: ConfigEnv): string {
  const home = env.HOME?.trim() || env.USERPROFILE?.trim()
  if (!home) return path
  const base = home.replace(/[\\/]+$/, '')
  return path.startsWith(base) && /^[\\/]/.test(path.slice(base.length)) ? `~${path.slice(base.length)}` : path
}

// Joins with backslashes for a Windows folder (one that has them and no forward
// slash), with forward slashes otherwise.
function join(dir: string, ...parts: string[]): string {
  const separator = dir.includes('\\') && !dir.includes('/') ? '\\' : '/'
  return [dir.replace(/[\\/]+$/, ''), ...parts].join(separator)
}
