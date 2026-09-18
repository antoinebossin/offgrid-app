package com.antris.offgrid

import org.json.JSONObject

/**
 * Reglages effectifs de l'application — miroir de
 * MVP-visualisation/src/types/settings.ts.
 *
 * Ces valeurs ne vivent plus dans le code : elles sont saisies dans l'app
 * (ecrans Configuration et Securite) et stockees sur l'appareil. Config.kt ne
 * fournit plus que des valeurs d'usine, presentes dans la build d'un site livre
 * et absentes de la build generique (voir Config.FACTORY_PRESET).
 */
data class SiteSettings(
    val name: String,
    val tagline: String,
    val location: String,
)

data class PlcSettings(
    val model: String,
    val runtime: String,
    val modem: String,
    /** URL ouverte par le bouton Pilotage, une fois le tunnel VPN etabli. */
    val dataUrl: String,
)

data class VpnSettings(val profile: String)

/**
 * Verrou d'acces. Ni le mot de passe ni le code de secours ne sont stockes en
 * clair : seules leurs empreintes PBKDF2-SHA-256 salees le sont.
 */
data class AuthSettings(
    val enabled: Boolean,
    val salt: String,
    val hash: String,
    val recoverySalt: String,
    val recoveryHash: String,
    val iterations: Int,
    /** Duree du deverrouillage, en minutes d'inactivite. 0 = a chaque ouverture. */
    val unlockMinutes: Int,
    val maxAttempts: Int,
    val lockoutSeconds: Int,
)

data class Settings(
    val site: SiteSettings,
    val plc: PlcSettings,
    val vpn: VpnSettings,
    val auth: AuthSettings,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("site", JSONObject().apply {
            put("name", site.name)
            put("tagline", site.tagline)
            put("location", site.location)
        })
        put("plc", JSONObject().apply {
            put("model", plc.model)
            put("runtime", plc.runtime)
            put("modem", plc.modem)
            put("dataUrl", plc.dataUrl)
        })
        put("vpn", JSONObject().apply { put("profile", vpn.profile) })
        put("auth", JSONObject().apply {
            put("enabled", auth.enabled)
            put("salt", auth.salt)
            put("hash", auth.hash)
            put("recoverySalt", auth.recoverySalt)
            put("recoveryHash", auth.recoveryHash)
            put("iterations", auth.iterations)
            put("unlockMinutes", auth.unlockMinutes)
            put("maxAttempts", auth.maxAttempts)
            put("lockoutSeconds", auth.lockoutSeconds)
        })
    }

    companion object {
        /** Tolerant : une cle absente reprend la valeur du modele `fallback`. */
        fun fromJson(json: JSONObject, fallback: Settings): Settings {
            val site = json.optJSONObject("site")
            val plc = json.optJSONObject("plc")
            val vpn = json.optJSONObject("vpn")
            val auth = json.optJSONObject("auth")
            return Settings(
                site = SiteSettings(
                    name = site?.optString("name", fallback.site.name) ?: fallback.site.name,
                    tagline = site?.optString("tagline", fallback.site.tagline) ?: fallback.site.tagline,
                    location = site?.optString("location", fallback.site.location) ?: fallback.site.location,
                ),
                plc = PlcSettings(
                    model = plc?.optString("model", fallback.plc.model) ?: fallback.plc.model,
                    runtime = plc?.optString("runtime", fallback.plc.runtime) ?: fallback.plc.runtime,
                    modem = plc?.optString("modem", fallback.plc.modem) ?: fallback.plc.modem,
                    dataUrl = plc?.optString("dataUrl", fallback.plc.dataUrl) ?: fallback.plc.dataUrl,
                ),
                vpn = VpnSettings(
                    profile = vpn?.optString("profile", fallback.vpn.profile) ?: fallback.vpn.profile,
                ),
                auth = AuthSettings(
                    enabled = auth?.optBoolean("enabled", fallback.auth.enabled) ?: fallback.auth.enabled,
                    salt = auth?.optString("salt", fallback.auth.salt) ?: fallback.auth.salt,
                    hash = auth?.optString("hash", fallback.auth.hash) ?: fallback.auth.hash,
                    recoverySalt = auth?.optString("recoverySalt", "") ?: "",
                    recoveryHash = auth?.optString("recoveryHash", "") ?: "",
                    iterations = auth?.optInt("iterations", fallback.auth.iterations) ?: fallback.auth.iterations,
                    unlockMinutes = auth?.optInt("unlockMinutes", fallback.auth.unlockMinutes) ?: fallback.auth.unlockMinutes,
                    maxAttempts = auth?.optInt("maxAttempts", fallback.auth.maxAttempts) ?: fallback.auth.maxAttempts,
                    lockoutSeconds = auth?.optInt("lockoutSeconds", fallback.auth.lockoutSeconds) ?: fallback.auth.lockoutSeconds,
                ),
            )
        }
    }
}
