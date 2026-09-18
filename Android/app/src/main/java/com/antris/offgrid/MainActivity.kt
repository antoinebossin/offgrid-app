package com.antris.offgrid

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView

class MainActivity : GatedActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<View>(R.id.btnSettings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        findViewById<Button>(R.id.btnOpenVpn).setOnClickListener { openOpenVpnConnect() }
        findViewById<Button>(R.id.btnPilotage).setOnClickListener {
            startActivity(Intent(this, WebVisuActivity::class.java))
        }
        findViewById<Button>(R.id.btnConfigure).setOnClickListener {
            startActivity(Intent(this, ConfigActivity::class.java))
        }
        findViewById<View>(R.id.banner).setOnClickListener {
            startActivity(Intent(this, SecurityActivity::class.java))
        }
    }

    /** Les reglages ont pu changer pendant qu'on etait dans un autre ecran. */
    override fun onUnlockedResume() {
        val settings = SettingsStore.load(this)
        val configured = SettingsStore.isConfigured(settings)

        findViewById<TextView>(R.id.siteName).text = settings.site.name
        findViewById<TextView>(R.id.siteTagline).text = settings.site.tagline
        findViewById<TextView>(R.id.footer).text =
            listOf(settings.plc.model, settings.site.location)
                .filter { it.isNotBlank() }
                .joinToString(" · ")
                .ifBlank { "Aucune installation" }

        // Premier demarrage : l'app ne bloque jamais, elle propose de se configurer.
        findViewById<View>(R.id.banner).visibility =
            if (PasswordGate.isActive(settings.auth)) View.GONE else View.VISIBLE

        findViewById<View>(R.id.configuredBlock).visibility =
            if (configured) View.VISIBLE else View.GONE
        findViewById<View>(R.id.unconfiguredBlock).visibility =
            if (configured) View.GONE else View.VISIBLE

        findViewById<TextView>(R.id.vpnHint).text =
            if (settings.vpn.profile.isNotBlank()) {
                "Se connecter au profil ${settings.vpn.profile}"
            } else {
                "Se connecter au profil de l’installation"
            }
    }

    /**
     * Ramene OpenVPN Connect au premier plan s'il est installe, sinon propose
     * de l'installer. Volontairement PAS d'extra d'auto-connexion : ce n'est pas
     * une API officiellement documentee et sa forme a deja change entre versions
     * de l'app. L'utilisateur choisit son profil et se connecte lui-meme.
     */
    private fun openOpenVpnConnect() {
        val launchIntent = packageManager.getLaunchIntentForPackage(Config.OPENVPN_CONNECT_PACKAGE)
        if (launchIntent != null) {
            startActivity(launchIntent)
            return
        }
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Config.OPENVPN_CONNECT_PLAYSTORE_URL)))
        } catch (e: ActivityNotFoundException) {
            // Aucun market store disponible sur l'appareil — rien de plus a faire ici.
        }
    }
}
