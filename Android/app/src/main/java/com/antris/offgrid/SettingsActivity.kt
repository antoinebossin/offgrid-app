package com.antris.offgrid

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView

/** Menu des reglages : Configuration, Securite, verrouillage manuel. */
class SettingsActivity : GatedActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<View>(R.id.rowConfig).setOnClickListener {
            startActivity(Intent(this, ConfigActivity::class.java))
        }
        findViewById<View>(R.id.rowSecurity).setOnClickListener {
            startActivity(Intent(this, SecurityActivity::class.java))
        }
        findViewById<View>(R.id.rowLock).setOnClickListener {
            PasswordGate.lock(this)
            goToLock()
        }
    }

    override fun onUnlockedResume() {
        val settings = SettingsStore.load(this)

        findViewById<TextView>(R.id.configSub).text =
            if (SettingsStore.isConfigured(settings)) settings.plc.dataUrl
            else "Aucune installation configurée"

        findViewById<TextView>(R.id.securitySub).text = when {
            PasswordGate.isActive(settings.auth) ->
                if (settings.auth.unlockMinutes > 0) {
                    "Protection active · ${settings.auth.unlockMinutes} min"
                } else {
                    "Protection active · à chaque ouverture"
                }
            PasswordGate.hasPassword(settings.auth) -> "Protection désactivée"
            else -> "Aucun mot de passe défini"
        }

        findViewById<View>(R.id.rowLock).visibility =
            if (PasswordGate.isActive(settings.auth)) View.VISIBLE else View.GONE
    }
}
