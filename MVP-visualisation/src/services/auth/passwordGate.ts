// ---------------------------------------------------------------------------
// Verrou d'acces a l'application (Delivrable B du contrat ANTRIS-OFG-2026-001).
//
// Menace couverte : telephone perdu ou vole. Quelqu'un qui recupere l'appareil
// ne doit pas pouvoir ouvrir l'app et atteindre la WebVisu de l'automate.
//
// Ni le mot de passe ni le code de secours ne sont stockes en clair, nulle
// part : seules leurs empreintes PBKDF2-SHA-256, chacune avec son propre sel
// aleatoire, sont conservees. Il est donc impossible de les retrouver en
// inspectant le code livre ou le stockage de l'appareil.
//
// Limite assumee et documentee : l'app est un site statique (aucun backend),
// la verification se fait donc dans le navigateur. Quelqu'un capable de lire et
// de modifier le JavaScript du bundle peut contourner l'ecran — c'est une
// protection contre un porteur du telephone, pas contre un attaquant outille.
// Les deux barrieres serieuses restent le code de deverrouillage du telephone
// et le tunnel OpenVPN.
// ---------------------------------------------------------------------------

import type { AuthSettings } from '../../types/settings'

const UNLOCK_KEY = 'ofg.unlock'
const ATTEMPTS_KEY = 'ofg.attempts'

/**
 * Alphabet du code de secours : ni 0/O, ni 1/I/L, ni U — pour qu'un code dicte
 * au telephone ou recopie a la main ne soit pas ambigu.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_LENGTH = 16

/** Le verrou est-il actif ? (pas de mot de passe defini = pas de verrou) */
export function isGateActive(auth: AuthSettings): boolean {
  return auth.enabled && auth.salt.length > 0 && auth.hash.length > 0
}

/** Un mot de passe a-t-il ete defini, meme si la protection est desactivee ? */
export function hasPassword(auth: AuthSettings): boolean {
  return auth.salt.length > 0 && auth.hash.length > 0
}

export function hasRecoveryCode(auth: AuthSettings): boolean {
  return auth.recoverySalt.length > 0 && auth.recoveryHash.length > 0
}

/**
 * WebCrypto n'existe que dans un contexte securise (HTTPS ou localhost). En
 * HTTP simple sur une IP de reseau local, la verification est impossible : on
 * le signale clairement plutot que de laisser passer.
 */
export function isCryptoAvailable(): boolean {
  return typeof globalThis.crypto?.subtle?.deriveBits === 'function'
}

// --- Primitives -------------------------------------------------------------

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  // ArrayBuffer explicite : WebCrypto n'accepte pas un buffer potentiellement partage.
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(length)))
}

/** Comparaison a temps constant (par principe — la donnee comparee est publique). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function derive(secret: string, saltB64: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: base64ToBytes(saltB64), iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

// --- Verification -----------------------------------------------------------

export async function verifyPassword(auth: AuthSettings, password: string): Promise<boolean> {
  if (!hasPassword(auth)) return false
  return safeEqual(await derive(password, auth.salt, auth.iterations), auth.hash)
}

/** Normalise une saisie de code de secours : casse, tirets et espaces ignores. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export async function verifyRecoveryCode(auth: AuthSettings, code: string): Promise<boolean> {
  if (!hasRecoveryCode(auth)) return false
  const normalized = normalizeRecoveryCode(code)
  if (normalized.length === 0) return false
  return safeEqual(await derive(normalized, auth.recoverySalt, auth.iterations), auth.recoveryHash)
}

// --- Definition du mot de passe et du code de secours ------------------------

/** Nouveau mot de passe. Le code de secours existant n'est PAS touche. */
export async function withNewPassword(auth: AuthSettings, password: string): Promise<AuthSettings> {
  const salt = bytesToBase64(randomBytes(16))
  return {
    ...auth,
    enabled: true,
    salt,
    hash: await derive(password, salt, auth.iterations),
  }
}

/** Format lisible : 4 groupes de 4 caracteres separes par des tirets. */
export function formatRecoveryCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? [code]).join('-')
}

/**
 * Tire un nouveau code de secours. Le code en clair n'est renvoye qu'ici, une
 * seule fois : seule son empreinte est conservee. S'il est perdu, il faut en
 * regenerer un depuis l'ecran Securite.
 */
export async function withNewRecoveryCode(
  auth: AuthSettings,
): Promise<{ auth: AuthSettings; code: string }> {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  const recoverySalt = bytesToBase64(randomBytes(16))
  return {
    auth: {
      ...auth,
      recoverySalt,
      recoveryHash: await derive(code, recoverySalt, auth.iterations),
    },
    code,
  }
}

/** Retire le mot de passe et le code de secours (protection desactivee). */
export function withoutPassword(auth: AuthSettings): AuthSettings {
  return { ...auth, enabled: false, salt: '', hash: '', recoverySalt: '', recoveryHash: '' }
}

// --- Stockage tolerant ------------------------------------------------------

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* stockage indisponible : on redemandera le mot de passe, c'est sans risque */
  }
}

function drop(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* idem */
  }
}

// --- Etat de deverrouillage -------------------------------------------------

interface UnlockRecord {
  until: number
  fp: string
}

/**
 * Empreinte courte de la configuration : changer le mot de passe invalide les
 * deverrouillages en cours.
 */
function fingerprint(auth: AuthSettings): string {
  return auth.hash.slice(0, 12)
}

export function isUnlocked(auth: AuthSettings): boolean {
  if (!isGateActive(auth)) return true
  // unlockMinutes = 0 : le mot de passe est redemande a chaque ouverture.
  if (auth.unlockMinutes <= 0) return false
  const rec = readJson<UnlockRecord>(UNLOCK_KEY)
  if (!rec || rec.fp !== fingerprint(auth)) return false
  // Une echeance situee trop loin dans le futur signale une horloge qui a
  // recule : on invalide plutot que de faire confiance.
  if (rec.until - Date.now() > auth.unlockMinutes * 60_000) {
    drop(UNLOCK_KEY)
    return false
  }
  return Date.now() < rec.until
}

export function markUnlocked(auth: AuthSettings): void {
  if (auth.unlockMinutes <= 0) return
  writeJson(UNLOCK_KEY, {
    until: Date.now() + auth.unlockMinutes * 60_000,
    fp: fingerprint(auth),
  } satisfies UnlockRecord)
}

export function lock(): void {
  drop(UNLOCK_KEY)
}

// --- Limitation des tentatives ----------------------------------------------

interface AttemptRecord {
  fails: number
  until: number
}

/** Millisecondes restantes avant de pouvoir reessayer (0 si aucune attente). */
export function lockoutRemainingMs(): number {
  const rec = readJson<AttemptRecord>(ATTEMPTS_KEY)
  if (!rec) return 0
  return Math.max(0, rec.until - Date.now())
}

export function registerFailure(auth: AuthSettings): number {
  const rec = readJson<AttemptRecord>(ATTEMPTS_KEY) ?? { fails: 0, until: 0 }
  rec.fails += 1
  if (rec.fails >= auth.maxAttempts) {
    // Temporisation progressive : 1 min, 2 min, 4 min... plafonnee a 15 min.
    const steps = Math.min(rec.fails - auth.maxAttempts, 8)
    rec.until = Date.now() + Math.min(auth.lockoutSeconds * 1000 * 2 ** steps, 15 * 60_000)
  }
  writeJson(ATTEMPTS_KEY, rec)
  return rec.fails
}

export function resetFailures(): void {
  drop(ATTEMPTS_KEY)
}
