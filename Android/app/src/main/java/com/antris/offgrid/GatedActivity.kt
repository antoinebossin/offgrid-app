package com.antris.offgrid

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity

/**
 * Activite protegee par le verrou d'acces. A chaque retour au premier plan :
 *  - si la fenetre de deverrouillage a expire (telephone reste en poche, app en
 *    arriere-plan trop longtemps), on renvoie vers l'ecran de mot de passe ;
 *  - sinon on repousse l'echeance, de sorte qu'une app en cours d'utilisation
 *    ne se verrouille jamais sous les doigts de l'utilisateur.
 */
abstract class GatedActivity : AppCompatActivity() {

    override fun onResume() {
        super.onResume()
        val auth = SettingsStore.load(this).auth
        if (!PasswordGate.isUnlocked(this, auth)) {
            goToLock()
            return
        }
        PasswordGate.markUnlocked(this, auth)
        onUnlockedResume()
    }

    /** Appele au retour au premier plan, une fois le verrou verifie. */
    protected open fun onUnlockedResume() {}

    protected fun goToLock() {
        startActivity(
            Intent(this, LockActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        )
        finish()
    }
}
