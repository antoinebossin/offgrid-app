package com.antris.offgrid

import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

/**
 * Ecran Configuration : decrit l'installation pilotee par l'application.
 * Modifier ces champs suffit a la faire pointer vers une autre installation,
 * sans rien recompiler.
 */
class ConfigActivity : GatedActivity() {

    private lateinit var url: EditText
    private lateinit var name: EditText
    private lateinit var tagline: EditText
    private lateinit var location: EditText
    private lateinit var vpnProfile: EditText
    private lateinit var model: EditText
    private lateinit var message: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_config)

        url = findViewById(R.id.cfgUrl)
        name = findViewById(R.id.cfgName)
        tagline = findViewById(R.id.cfgTagline)
        location = findViewById(R.id.cfgLocation)
        vpnProfile = findViewById(R.id.cfgVpn)
        model = findViewById(R.id.cfgModel)
        message = findViewById(R.id.cfgMessage)

        fill(SettingsStore.load(this))

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnSave).setOnClickListener { save() }

        val resetButton = findViewById<Button>(R.id.btnReset)
        resetButton.visibility = if (Config.FACTORY_PRESET) View.VISIBLE else View.GONE
        resetButton.setOnClickListener {
            SettingsStore.reset(this)
            fill(SettingsStore.factory())
            show("Valeurs d’origine rétablies.", ok = true)
        }
    }

    private fun fill(settings: Settings) {
        url.setText(settings.plc.dataUrl)
        name.setText(settings.site.name)
        tagline.setText(settings.site.tagline)
        location.setText(settings.site.location)
        vpnProfile.setText(settings.vpn.profile)
        model.setText(settings.plc.model)
    }

    /** Une URL de WebVisu doit etre absolue : l'app l'ouvre telle quelle. */
    private fun urlError(value: String): String? {
        if (value.isEmpty()) return "L’adresse de la WebVisu est obligatoire."
        val scheme = Uri.parse(value).scheme?.lowercase()
        if (scheme != "http" && scheme != "https") {
            return "Adresse invalide — elle doit commencer par https:// ou http://."
        }
        if (Uri.parse(value).host.isNullOrBlank()) return "Adresse invalide — hôte manquant."
        return null
    }

    private fun save() {
        val value = url.text.toString().trim()
        val error = urlError(value)
        if (error != null) {
            show(error, ok = false)
            return
        }
        // On repart des reglages courants pour ne pas ecraser le bloc `auth`,
        // qui n'est modifiable que depuis l'ecran Securite.
        val current = SettingsStore.load(this)
        SettingsStore.save(
            this,
            current.copy(
                site = SiteSettings(
                    name = name.text.toString().trim(),
                    tagline = tagline.text.toString().trim(),
                    location = location.text.toString().trim(),
                ),
                plc = current.plc.copy(dataUrl = value, model = model.text.toString().trim()),
                vpn = VpnSettings(vpnProfile.text.toString().trim()),
            ),
        )
        show("Configuration enregistrée.", ok = true)
    }

    private fun show(text: String, ok: Boolean) {
        message.text = text
        message.setTextColor(getColor(if (ok) R.color.accent else R.color.danger))
        message.visibility = View.VISIBLE
    }
}
