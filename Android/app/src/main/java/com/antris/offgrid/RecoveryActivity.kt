package com.antris.offgrid

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Recuperation d'acces apres oubli du mot de passe.
 *
 * L'utilisateur saisit le code de secours note a la mise en service (et
 * conserve par l'installateur), puis choisit un nouveau mot de passe. Le code
 * utilise est immediatement remplace : il vient d'etre dicte ou relu, donc il
 * est considere comme compromis. Le nouveau code est affiche une seule fois.
 *
 * Cet ecran n'herite PAS de GatedActivity : il s'ouvre precisement quand le
 * verrou ne peut plus etre franchi normalement.
 */
class RecoveryActivity : AppCompatActivity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())

    private lateinit var codeStep: View
    private lateinit var passwordStep: View
    private lateinit var codeResult: View
    private lateinit var codeInput: EditText
    private lateinit var newPassword: EditText
    private lateinit var confirmPassword: EditText
    private lateinit var message: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        setContentView(R.layout.activity_recovery)

        codeStep = findViewById(R.id.stepCode)
        passwordStep = findViewById(R.id.stepPassword)
        codeResult = findViewById(R.id.stepNewCode)
        codeInput = findViewById(R.id.recCode)
        newPassword = findViewById(R.id.recPassword)
        confirmPassword = findViewById(R.id.recConfirm)
        message = findViewById(R.id.recMessage)

        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }

        val auth = SettingsStore.load(this).auth
        if (!PasswordGate.hasRecoveryCode(auth)) {
            codeStep.visibility = View.GONE
            show(
                "Aucun code de secours n’est enregistré sur cet appareil. L’accès ne peut pas " +
                    "être rétabli depuis l’application : contactez l’installateur. La procédure " +
                    "consiste à réinstaller l’application, ce qui efface la configuration locale.",
                ok = false,
            )
            return
        }

        findViewById<Button>(R.id.btnCheckCode).setOnClickListener { checkCode() }
        findViewById<Button>(R.id.btnSavePassword).setOnClickListener { savePassword() }
        findViewById<Button>(R.id.btnCodeNoted).setOnClickListener {
            startActivity(
                Intent(this, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            )
            finish()
        }
    }

    private fun checkCode() {
        val auth = SettingsStore.load(this).auth
        val typed = codeInput.text.toString()
        setBusy(true)
        worker.execute {
            val ok = PasswordGate.verifyRecoveryCode(auth, typed)
            ui.post {
                if (isFinishing || isDestroyed) return@post
                setBusy(false)
                if (ok) {
                    message.visibility = View.GONE
                    codeStep.visibility = View.GONE
                    passwordStep.visibility = View.VISIBLE
                } else {
                    show("Code de secours incorrect.", ok = false)
                }
            }
        }
    }

    private fun savePassword() {
        val password = newPassword.text.toString()
        if (password.length < MIN_LENGTH) {
            show("$MIN_LENGTH caractères minimum.", ok = false)
            return
        }
        if (password != confirmPassword.text.toString()) {
            show("Les deux saisies diffèrent.", ok = false)
            return
        }
        val settings = SettingsStore.load(this)
        setBusy(true)
        worker.execute {
            val withPassword = PasswordGate.withNewPassword(settings.auth, password)
            val (auth, code) = PasswordGate.withNewRecoveryCode(withPassword)
            ui.post {
                if (isFinishing || isDestroyed) return@post
                SettingsStore.save(this, settings.copy(auth = auth))
                PasswordGate.resetFailures(this)
                PasswordGate.markUnlocked(this, auth)
                setBusy(false)
                message.visibility = View.GONE
                passwordStep.visibility = View.GONE
                codeResult.visibility = View.VISIBLE
                findViewById<TextView>(R.id.recNewCode).text = PasswordGate.formatRecoveryCode(code)
            }
        }
    }

    private fun setBusy(busy: Boolean) {
        findViewById<Button>(R.id.btnCheckCode).isEnabled = !busy
        findViewById<Button>(R.id.btnSavePassword).isEnabled = !busy
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
