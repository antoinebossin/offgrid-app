// ---------------------------------------------------------------------------
// Reglages effectifs de l'application.
//
// Depuis la version « configurable », ces valeurs ne vivent plus dans le code :
// elles sont saisies dans l'app (ecrans Configuration et Securite) et stockees
// sur l'appareil. Les valeurs de src/config.ts ne servent plus que de valeurs
// d'usine, utilisees telles quelles tant que l'utilisateur n'a rien modifie —
// et absentes de la build generique (voir FACTORY_PRESET dans config.ts).
// ---------------------------------------------------------------------------

/** Identite du site affichee dans l'app. */
export interface SiteSettings {
  name: string
  tagline: string
  location: string
  /** Chemin d'un logo depose dans public/ ; null = icone par defaut. */
  logoSrc: string | null
}

/** Automate cible et adresse de sa WebVisu. */
export interface PlcSettings {
  model: string
  runtime: string
  modem: string
  /** URL ouverte par le bouton Pilotage, une fois le tunnel VPN etabli. */
  dataUrl: string
}

/** Profil OpenVPN — informatif : le tunnel est etabli par OpenVPN Connect. */
export interface VpnSettings {
  profile: string
}

/**
 * Verrou d'acces. Ni le mot de passe ni le code de secours ne sont stockes en
 * clair : seules leurs empreintes PBKDF2-SHA-256 salees le sont.
 */
export interface AuthSettings {
  /** false = protection desactivee (l'app s'ouvre directement). */
  enabled: boolean
  /** Sel et empreinte du mot de passe, base64. Vides = aucun mot de passe. */
  salt: string
  hash: string
  /** Sel et empreinte du code de secours, base64. */
  recoverySalt: string
  recoveryHash: string
  iterations: number
  /** Duree du deverrouillage, en minutes d'inactivite. 0 = a chaque ouverture. */
  unlockMinutes: number
  maxAttempts: number
  lockoutSeconds: number
}

export interface Settings {
  site: SiteSettings
  plc: PlcSettings
  vpn: VpnSettings
  auth: AuthSettings
}
