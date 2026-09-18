package com.antris.offgrid

import android.content.Context
import org.json.JSONObject

/**
 * Stockage des reglages sur l'appareil — miroir de
 * MVP-visualisation/src/services/settings/settingsStore.ts.
 *
 * Regle : la configuration locale, quand elle existe, fait autorite. Sinon on
 * retombe sur les valeurs d'usine de Config.kt, presentes dans la build d'un
 * site livre et absentes de la build generique.
 */
object SettingsStore {
    private const val PREFS = "ofg_settings"
    private const val KEY = "settings_v1"

    /** Reglages vierges — build generique, premier demarrage. */
    fun blank(): Settings = Settings(
        site = SiteSettings("Off-the-Grid", "Installation non configurée", ""),
        plc = PlcSettings("", "", "", ""),
        vpn = VpnSettings(""),
        auth = AuthSettings(
            enabled = true,
            salt = "",
            hash = "",
            recoverySalt = "",
            recoveryHash = "",
            iterations = Config.AUTH_ITERATIONS,
            unlockMinutes = Config.AUTH_UNLOCK_MINUTES,
            maxAttempts = Config.AUTH_MAX_ATTEMPTS,
            lockoutSeconds = Config.AUTH_LOCKOUT_SECONDS,
        ),
    )

    /** Reglages d'usine de la build courante. */
    fun factory(): Settings {
        if (!Config.FACTORY_PRESET) return blank()
        return Settings(
            site = SiteSettings(Config.SITE_NAME, Config.SITE_TAGLINE, Config.SITE_LOCATION),
            plc = PlcSettings(Config.PLC_MODEL, Config.PLC_RUNTIME, Config.PLC_MODEM, Config.WEBVISU_URL),
            vpn = VpnSettings(Config.VPN_PROFILE_NAME),
            auth = AuthSettings(
                enabled = Config.AUTH_ENABLED,
                salt = Config.AUTH_SALT_B64,
                hash = Config.AUTH_HASH_B64,
                recoverySalt = "",
                recoveryHash = "",
                iterations = Config.AUTH_ITERATIONS,
                unlockMinutes = Config.AUTH_UNLOCK_MINUTES,
                maxAttempts = Config.AUTH_MAX_ATTEMPTS,
                lockoutSeconds = Config.AUTH_LOCKOUT_SECONDS,
            ),
        )
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun hasLocal(ctx: Context): Boolean = prefs(ctx).contains(KEY)

    fun load(ctx: Context): Settings {
        val raw = prefs(ctx).getString(KEY, null) ?: return factory()
        return try {
            Settings.fromJson(JSONObject(raw), factory())
        } catch (e: Exception) {
            // Configuration illisible : on ne bloque pas l'app, on repart des
            // valeurs d'usine plutot que de planter au demarrage.
            factory()
        }
    }

    fun save(ctx: Context, settings: Settings) {
        prefs(ctx).edit().putString(KEY, settings.toJson().toString()).apply()
    }

    /** Efface la configuration locale et revient aux valeurs d'usine. */
    fun reset(ctx: Context) {
        prefs(ctx).edit().remove(KEY).apply()
    }

    /** L'app sait-elle ou joindre l'automate ? */
    fun isConfigured(settings: Settings): Boolean = settings.plc.dataUrl.trim().isNotEmpty()
}
