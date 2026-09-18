package com.antris.offgrid

/**
 * Source unique de verite de l'app Android. Pour dupliquer la solution sur une
 * autre installation : ne modifier QUE ce fichier (identite du site, profil
 * VPN, URL de la WebVisu). Miroir de MVP-visualisation/src/config.ts.
 */
object Config {
    /**
     * true  = build d'un site livre : les valeurs ci-dessous amorcent l'app au
     *         premier demarrage, elle s'ouvre deja configuree (flavor "site").
     * false = build generique : les valeurs de site sont ignorees, l'app demarre
     *         non configuree (flavor "generique", destinee au Play Store).
     *
     * Dans les deux cas, ce que l'utilisateur enregistre dans l'app fait ensuite
     * autorite (voir SettingsStore).
     */
    val FACTORY_PRESET: Boolean get() = BuildConfig.FACTORY_PRESET

    const val SITE_NAME = "Off-the-Grid"
    const val SITE_TAGLINE = "Montchauvel · Pilotage à distance"
    const val SITE_LOCATION = "Montchauvel"

    const val PLC_MODEL = "WAGO 750-8217"
    const val PLC_RUNTIME = "CODESYS V3.5 SP19"
    const val PLC_MODEM = "Quectel EC25 · SIM data Orange"
    const val VPN_PROFILE_NAME = "offgrid-montchauvel.ovpn"

    /** URL de la WebVisu de l'automate, jointe une fois le tunnel OpenVPN ouvert. */
    const val WEBVISU_URL = "https://100.96.1.18/webvisu/webvisu.htm"

    // -----------------------------------------------------------------------
    // Verrou d'acces (Delivrable B du contrat). Miroir du bloc `auth` de
    // MVP-visualisation/src/config.ts : meme sel, meme empreinte, meme nombre
    // d'iterations, donc UN SEUL mot de passe pour les deux applications.
    //
    // Le mot de passe en clair n'apparait nulle part. Pour le definir ou le
    // changer, lancer cote web :
    //
    //     cd MVP-visualisation && npm run set-password
    //
    // Le script met a jour ce fichier ET config.ts. Rebuild de l'APK ensuite.
    // -----------------------------------------------------------------------

    /** false = aucun verrou (l'app s'ouvre directement sur MainActivity). */
    const val AUTH_ENABLED = true

    /** Sel aleatoire, base64 — regenere a chaque changement de mot de passe. */
    const val AUTH_SALT_B64 = "dn/ILMQP0ogGlwdlo8XgKA=="

    /** Empreinte PBKDF2-SHA-256 du mot de passe, base64. */
    const val AUTH_HASH_B64 = "2fJqjLzO0vOG0X0iIVQZPy6sA7Icn/LYBkKG/UarZ84="

    /** Nombre d'iterations PBKDF2 utilise pour produire l'empreinte. */
    const val AUTH_ITERATIONS = 210000

    /** Duree pendant laquelle l'app reste deverrouillee, en minutes. */
    const val AUTH_UNLOCK_MINUTES = 15

    /** Nombre d'essais rates avant temporisation. */
    const val AUTH_MAX_ATTEMPTS = 5

    /** Duree de la premiere temporisation, en secondes (doublee ensuite). */
    const val AUTH_LOCKOUT_SECONDS = 60

    /** Package Play Store de l'app officielle OpenVPN Connect. */
    const val OPENVPN_CONNECT_PACKAGE = "net.openvpn.openvpn"
    const val OPENVPN_CONNECT_PLAYSTORE_URL =
        "https://play.google.com/store/apps/details?id=$OPENVPN_CONNECT_PACKAGE"
}
