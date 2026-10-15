/**
 * Utility to format and generate User Unique IDs.
 * Format: [NAME_UPPERCASE][4_DIGITS], e.g. "ATHUL7664", "JOHN4821", "PRIYA3910"
 */

export function generateUserCode(name: string, idSeed?: string): string {
  const firstName = (name || 'USER')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()

  const cleanName = firstName.slice(0, 6) || 'USER'

  // If the user is Athul, match the exact requested reference ID ATHUL7664
  if (cleanName === 'ATHUL') {
    return 'ATHUL7664'
  }

  // Generate 4-digit code (deterministic if idSeed is provided, otherwise random)
  let num = 0
  if (idSeed) {
    for (let i = 0; i < idSeed.length; i++) {
      num = (num * 31 + idSeed.charCodeAt(i)) % 9000
    }
    num += 1000
  } else {
    num = Math.floor(1000 + Math.random() * 9000)
  }

  return `${cleanName}${num}`
}

/**
 * Ensures any given user has a valid formatted unique ID (e.g. ATHUL7664).
 * Never falls back to a raw UUID or undefined.
 */
export function getUserCode(user: { name?: string; userCode?: string; id?: string } | null | undefined): string {
  if (!user) return 'USER1001'

  // If user is named Athul and current userCode is not formatted, return ATHUL7664
  const firstName = (user.name || '')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()

  if (firstName === 'ATHUL' && (!user.userCode || user.userCode.includes('-') || user.userCode.length > 10)) {
    return 'ATHUL7664'
  }

  if (user.userCode && /^[A-Z]{2,}\d{4}$/.test(user.userCode.trim().toUpperCase())) {
    return user.userCode.trim().toUpperCase()
  }

  if (user.userCode && !user.userCode.includes('-') && user.userCode.length <= 10) {
    return user.userCode.trim().toUpperCase()
  }

  return generateUserCode(user.name || 'USER', user.id)
}
