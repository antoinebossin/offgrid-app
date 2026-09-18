package com.antris.offgrid

import android.content.Context
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.experimental.xor

/**
 * Verrou d'acces a l'application (Delivrable B du contrat ANTRIS-OFG-2026-001).
 * Miroir de MVP-visualisation/src/services/auth/passwordGate.ts.
 *
 * Menace couverte : telephone perdu ou vole. Ni le mot de passe ni le code de
 * secours ne sont stockes en clair : seules leurs empreintes PBKDF2-SHA-256,
 * chacune avec son propre sel aleatoire, sont conservees.
 *
 * PBKDF2 est reimplemente au-dessus de Mac/HmacSHA256 plutot que via
 * SecretKeyFactory("PBKDF2WithHmacSHA256") : les implementations JCE ne
 * convertissent pas toutes les caracteres du mot de passe en octets de la meme
 * facon, ce qui casserait la compatibilite avec WebCrypto des que le mot de
 * passe contient un accent. Ici, le mot de passe est encode en UTF-8, comme
 * dans le navigateur.
 */
object PasswordGate {
    private const val PREFS = "ofg_auth"
    private const val KEY_UNTIL = "unlock_until"
    private const val KEY_FINGERPRINT = "unlock_fp"
    private const val KEY_FAILS = "fails"
    private const val KEY_LOCKOUT_UNTIL = "lockout_until"

    /**
     * Alphabet du code de secours : ni 0/O, ni 1/I/L, ni U — pour qu'un code
     * dicte au telephone ou recopie a la main ne soit pas ambigu.
     */
    private const val CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"
    private const val CODE_LENGTH = 16

    private val random = SecureRandom()

    /** Le verrou est-il actif ? (pas de mot de passe defini = pas de verrou) */
    fun isActive(auth: AuthSettings): Boolean =
        auth.enabled && auth.salt.isNotEmpty() && auth.hash.isNotEmpty()

    /** Un mot de passe a-t-il ete defini, meme si la protection est desactivee ? */
    fun hasPassword(auth: AuthSettings): Boolean = auth.salt.isNotEmpty() && auth.hash.isNotEmpty()

    fun hasRecoveryCode(auth: AuthSettings): Boolean =
        auth.recoverySalt.isNotEmpty() && auth.recoveryHash.isNotEmpty()

    // --- Verification --------------------------------------------------------

    /** Appel bloquant (~0,3 a 1 s) : a lancer hors du thread principal. */
    fun verifyPassword(auth: AuthSettings, password: String): Boolean {
        if (!hasPassword(auth) || password.isEmpty()) return false
        return constantTimeEquals(derive(password, auth.salt, auth.iterations), auth.hash)
    }

    /** Normalise une saisie de code de secours : casse, tirets et espaces ignores. */
    fun normalizeRecoveryCode(input: String): String =
        input.uppercase().filter { it in 'A'..'Z' || it in '0'..'9' }

    fun verifyRecoveryCode(auth: AuthSettings, code: String): Boolean {
        if (!hasRecoveryCode(auth)) return false
        val normalized = normalizeRecoveryCode(code)
        if (normalized.isEmpty()) return false
        return constantTimeEquals(
            derive(normalized, auth.recoverySalt, auth.iterations),
            auth.recoveryHash,
        )
    }

    // --- Definition du mot de passe et du code de secours ---------------------

    /** Nouveau mot de passe. Le code de secours existant n'est PAS touche. */
    fun withNewPassword(auth: AuthSettings, password: String): AuthSettings {
        val salt = randomBase64(16)
        return auth.copy(
            enabled = true,
            salt = salt,
            hash = derive(password, salt, auth.iterations),
        )
    }

    /** Format lisible : 4 groupes de 4 caracteres separes par des tirets. */
    fun formatRecoveryCode(code: String): String = code.chunked(4).joinToString("-")

    /**
     * Tire un nouveau code de secours. Le code en clair n'est renvoye qu'ici,
     * une seule fois : seule son empreinte est conservee.
     */
    fun withNewRecoveryCode(auth: AuthSettings): Pair<AuthSettings, String> {
        val builder = StringBuilder(CODE_LENGTH)
        repeat(CODE_LENGTH) { builder.append(CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)]) }
        val code = builder.toString()
        val salt = randomBase64(16)
        return auth.copy(
            recoverySalt = salt,
            recoveryHash = derive(code, salt, auth.iterations),
        ) to code
    }

    /** Retire le mot de passe et le code de secours (protection desactivee). */
    fun withoutPassword(auth: AuthSettings): AuthSettings =
        auth.copy(enabled = false, salt = "", hash = "", recoverySalt = "", recoveryHash = "")

    // --- Primitives ----------------------------------------------------------

    private fun randomBase64(length: Int): String {
        val bytes = ByteArray(length)
        random.nextBytes(bytes)
        return Base64.getEncoder().encodeToString(bytes)
    }

    private fun constantTimeEquals(a: String, b: String): Boolean =
        MessageDigest.isEqual(a.toByteArray(Charsets.UTF_8), b.toByteArray(Charsets.UTF_8))

    private fun derive(secret: String, saltB64: String, iterations: Int): String {
        val salt = Base64.getDecoder().decode(saltB64)
        val bits = pbkdf2(secret.toByteArray(Charsets.UTF_8), salt, iterations, 32)
        return Base64.getEncoder().encodeToString(bits)
    }

    private fun pbkdf2(password: ByteArray, salt: ByteArray, iterations: Int, lengthBytes: Int): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(password, "HmacSHA256"))
        val hLen = mac.macLength
        val blocks = (lengthBytes + hLen - 1) / hLen
        val out = ByteArray(blocks * hLen)

        for (block in 1..blocks) {
            val counter = byteArrayOf(
                (block ushr 24).toByte(),
                (block ushr 16).toByte(),
                (block ushr 8).toByte(),
                block.toByte(),
            )
            mac.update(salt)
            mac.update(counter)
            var u = mac.doFinal()
            val accumulated = u.copyOf()
            for (round in 2..iterations) {
                u = mac.doFinal(u)
                for (i in accumulated.indices) accumulated[i] = accumulated[i] xor u[i]
            }
            System.arraycopy(accumulated, 0, out, (block - 1) * hLen, hLen)
        }
        return out.copyOf(lengthBytes)
    }

    // --- Etat de deverrouillage ---------------------------------------------

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /**
     * Empreinte courte de la configuration : changer le mot de passe invalide
     * les deverrouillages en cours.
     */
    private fun fingerprint(auth: AuthSettings): String = auth.hash.take(12)

    fun isUnlocked(ctx: Context, auth: AuthSettings): Boolean {
        if (!isActive(auth)) return true
        // unlockMinutes = 0 : le mot de passe est redemande a chaque ouverture.
        if (auth.unlockMinutes <= 0) return false
        val p = prefs(ctx)
        if (p.getString(KEY_FINGERPRINT, null) != fingerprint(auth)) return false
        val until = p.getLong(KEY_UNTIL, 0L)
        // Echeance trop lointaine = horloge reculee : on invalide par prudence.
        if (until - System.currentTimeMillis() > auth.unlockMinutes * 60_000L) return false
        return System.currentTimeMillis() < until
    }

    /** Ouvre (ou prolonge) la fenetre de deverrouillage. */
    fun markUnlocked(ctx: Context, auth: AuthSettings) {
        if (auth.unlockMinutes <= 0) return
        prefs(ctx).edit()
            .putLong(KEY_UNTIL, System.currentTimeMillis() + auth.unlockMinutes * 60_000L)
            .putString(KEY_FINGERPRINT, fingerprint(auth))
            .apply()
    }

    fun lock(ctx: Context) {
        prefs(ctx).edit().remove(KEY_UNTIL).remove(KEY_FINGERPRINT).apply()
    }

    // --- Limitation des tentatives ------------------------------------------

    /** Millisecondes restantes avant de pouvoir reessayer (0 si aucune attente). */
    fun lockoutRemainingMs(ctx: Context): Long =
        (prefs(ctx).getLong(KEY_LOCKOUT_UNTIL, 0L) - System.currentTimeMillis()).coerceAtLeast(0L)

    /** Enregistre un essai rate et renvoie le nombre total d'essais rates. */
    fun registerFailure(ctx: Context, auth: AuthSettings): Int {
        val p = prefs(ctx)
        val fails = p.getInt(KEY_FAILS, 0) + 1
        val editor = p.edit().putInt(KEY_FAILS, fails)
        if (fails >= auth.maxAttempts) {
            // Temporisation progressive : 1 min, 2 min, 4 min... plafonnee a 15 min.
            val steps = (fails - auth.maxAttempts).coerceAtMost(8)
            val waitMs = minOf(auth.lockoutSeconds * 1000L shl steps, 15 * 60_000L)
            editor.putLong(KEY_LOCKOUT_UNTIL, System.currentTimeMillis() + waitMs)
        }
        editor.apply()
        return fails
    }

    fun resetFailures(ctx: Context) {
        prefs(ctx).edit().remove(KEY_FAILS).remove(KEY_LOCKOUT_UNTIL).apply()
    }
}
