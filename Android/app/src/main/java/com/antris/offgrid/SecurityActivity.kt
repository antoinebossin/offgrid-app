package com.antris.offgrid

import android.content.res.ColorStateList
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import java.util.concurrent.Executors

/**
 * Ecran Securite : definir, changer ou retirer le mot de passe, regenerer le
 * code de secours, choisir le delai de reverrouillage.
 *
 * Toute operation sensible exige le mot de passe courant — sinon le verrou ne
 * vaudrait rien : il suffirait d'ouvrir l'app pour le retirer.
 */
class SecurityActivity : GatedActivity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())

    private enum class Action { NONE, DEFINE, CHANGE, DISABLE, REGENERATE }

    private var action = Action.NONE
    private lateinit var currentPassword: EditText
    private lateinit var newPassword: EditText
    private lateinit var confirmPassword: EditText
    private lateinit var message: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_security)

        currentPassword = findViewById(R.id.secCurrent)
        newPassword = findViewById(R.id.secNew)
        confirmPassword = findViewById(R.id.secConfirm)
        message = findViewById(R.id.secMessage)

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<View>(R.id.rowChange).setOnClickListener { open(Action.CHANGE) }
        findViewById<View>(R.id.rowRegenerate).setOnClickListener { open(Action.REGENERATE) }
        findViewById<View>(R.id.rowDisable).setOnClickListener { open(Action.DISABLE) }
        findViewById<Button>(R.id.btnDefine).setOnClickListener { open(Action.DEFINE) }
        findViewById<Button>(R.id.btnCancel).setOnClickListener { open(Action.NONE) }
        findViewById<Button>(R.id.btnApply).setOnClickListener { apply() }
        findViewById<Button>(R.id.btnCodeNoted).setOnClickListener {
            findViewById<View>(R.id.codeBlock).visibility = View.GONE
            render()
        }

        listOf(
            R.id.delayAlways to 0,
            R.id.delay5 to 5,
            R.id.delay15 to 15,
            R.id.delay60 to 60,
        ).forEach { (id, minutes) ->
            findViewById<View>(id).setOnClickListener { setDelay(minutes) }
        }
    }

    override fun onUnlockedResume() = render()

    private fun auth(): AuthSettings = SettingsStore.load(this).auth

    private fun open(next: Action) {
        action = next
        currentPassword.setText("")
        newPassword.setText("")
        confirmPassword.setText("")
        message.visibility = View.GONE
        render()
    }

    private fun render() {
        val auth = auth()
        val defined = PasswordGate.hasPassword(auth)
        val active = PasswordGate.isActive(auth)
        if (!defined && action == Action.NONE) action = Action.DEFINE

        val showingCode = findViewById<View>(R.id.codeBlock).visibility == View.VISIBLE
        val showingForm = action != Action.NONE && !showingCode

        findViewById<TextView>(R.id.secStatusTitle).text =
            if (active) "Accès protégé" else "Accès non protégé"
        findViewById<TextView>(R.id.secStatusSub).text =
            if (active) "Un mot de passe est demandé à l’ouverture de l’application."
            else "N’importe qui ouvrant cette application atteint le pilotage de l’installation."

        findViewById<View>(R.id.actionList).visibility =
            if (defined && !showingForm && !showingCode) View.VISIBLE else View.GONE
        findViewById<View>(R.id.btnDefine).visibility =
            if (!defined && !showingForm && !showingCode) View.VISIBLE else View.GONE
        findViewById<View>(R.id.formBlock).visibility = if (showingForm) View.VISIBLE else View.GONE
        findViewById<View>(R.id.delayBlock).visibility =
            if (active && !showingForm && !showingCode) View.VISIBLE else View.GONE

        findViewById<View>(R.id.currentBlock).visibility = if (defined) View.VISIBLE else View.GONE
        val needsNew = action == Action.DEFINE || action == Action.CHANGE
        findViewById<View>(R.id.newBlock).visibility = if (needsNew) View.VISIBLE else View.GONE
        findViewById<View>(R.id.btnCancel).visibility = if (defined) View.VISIBLE else View.GONE

        findViewById<Button>(R.id.btnApply).text = when (action) {
            Action.DISABLE -> "Retirer la protection"
            Action.REGENERATE -> "Générer le code"
            else -> "Enregistrer"
        }

        findViewById<TextView>(R.id.regenerateSub).text =
            if (PasswordGate.hasRecoveryCode(auth)) "Le code précédent cessera de fonctionner"
            else "Aucun code de secours enregistré"

        listOf(R.id.delayAlways to 0, R.id.delay5 to 5, R.id.delay15 to 15, R.id.delay60 to 60)
            .forEach { (id, minutes) ->
                val selected = auth.unlockMinutes == minutes
                val button = findViewById<Button>(id)
                button.backgroundTintList = ColorStateList.valueOf(
                    getColor(if (selected) R.color.accent else R.color.panel),
                )
                button.setTextColor(getColor(if (selected) R.color.bg else R.color.textDim))
            }
    }

    private fun setDelay(minutes: Int) {
        val settings = SettingsStore.load(this)
        SettingsStore.save(this, settings.copy(auth = settings.auth.copy(unlockMinutes = minutes)))
        render()
    }

    private fun apply() {
        val settings = SettingsStore.load(this)
        val auth = settings.auth
        val defined = PasswordGate.hasPassword(auth)
        val typedCurrent = currentPassword.text.toString()
        val typedNew = newPassword.text.toString()

        if (action == Action.DEFINE || action == Action.CHANGE) {
            if (typedNew.length < MIN_LENGTH) {
                show("$MIN_LENGTH caractères minimum.", ok = false)
                return
            }
            if (typedNew != confirmPassword.text.toString()) {
                show("Les deux saisies diffèrent.", ok = false)
                return
            }
        }

        setBusy(true)
        worker.execute {
            val currentOk = !defined || PasswordGate.verifyPassword(auth, typedCurrent)
            if (!currentOk) {
                ui.post {
                    if (isFinishing || isDestroyed) return@post
                    setBusy(false)
                    show("Mot de passe actuel incorrect.", ok = false)
                }
                return@execute
            }

            var updated = auth
            var freshCode: String? = null
            var notice: String? = null

            when (action) {
                Action.DEFINE, Action.CHANGE -> {
                    updated = PasswordGate.withNewPassword(auth, typedNew)
                    // Premiere definition : on fournit aussi un code de secours.
                    // Un simple changement ne touche pas au code deja note.
                    if (!PasswordGate.hasRecoveryCode(auth)) {
                        val generated = PasswordGate.withNewRecoveryCode(updated)
                        updated = generated.first
                        freshCode = generated.second
                    } else {
                        notice = "Mot de passe modifié. Le code de secours reste inchangé."
                    }
                }
                Action.REGENERATE -> {
                    val generated = PasswordGate.withNewRecoveryCode(auth)
                    updated = generated.first
                    freshCode = generated.second
                }
                Action.DISABLE -> {
                    updated = PasswordGate.withoutPassword(auth)
                    notice = "Protection retirée. L’application s’ouvre désormais sans mot de passe."
                }
                Action.NONE -> return@execute
            }

            val finalAuth = updated
            val code = freshCode
            val finalNotice = notice
            ui.post {
                if (isFinishing || isDestroyed) return@post
                SettingsStore.save(this, settings.copy(auth = finalAuth))
                if (action != Action.REGENERATE) PasswordGate.lock(this)
                setBusy(false)
                action = Action.NONE
                currentPassword.setText("")
                newPassword.setText("")
                confirmPassword.setText("")
                if (code != null) {
                    findViewById<TextView>(R.id.codeValue).text =
                        PasswordGate.formatRecoveryCode(code)
                    findViewById<View>(R.id.codeBlock).visibility = View.VISIBLE
                    message.visibility = View.GONE
                } else if (finalNotice != null) {
                    show(finalNotice, ok = true)
                }
                render()
            }
        }
    }

    private fun setBusy(busy: Boolean) {
        findViewById<Button>(R.id.btnApply).isEnabled = !busy
    }

    private fun show(text: String, ok: Boolean) {
        message.text = text
        message.setTextColor(getColor(if (ok) R.color.accent else R.color.danger))
        message.visibility = View.VISIBLE
    }

    override fun onDestroy() {
        worker.shutdownNow()
        super.onDestroy()
    }

    private companion object {
        const val MIN_LENGTH = 6
    }
}
