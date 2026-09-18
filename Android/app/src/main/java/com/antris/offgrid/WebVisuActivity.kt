package com.antris.offgrid

import android.annotation.SuppressLint
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.webkit.SslErrorHandler
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback

/**
 * Affiche la WebVisu CODESYS de l'automate dans une WebView plein ecran.
 *
 * Le WAGO presente un certificat auto-signe (pas d'autorite publique sur un
 * automate industriel) : on accepte l'exception SSL UNIQUEMENT pour l'hote
 * de la WebVisu configuree dans l'app, jamais pour un autre domaine. La page
 * n'est de toute facon joignable qu'a l'interieur du tunnel OpenVPN.
 */
class WebVisuActivity : GatedActivity() {
    private lateinit var webView: WebView

    /** Adresse et hote attendus, lus dans les reglages de l'appareil. */
    private lateinit var webVisuUrl: String
    private var webVisuHost: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webVisuUrl = SettingsStore.load(this).plc.dataUrl
        if (webVisuUrl.isBlank()) {
            // Rien a afficher tant que l'installation n'est pas configuree.
            finish()
            return
        }
        webVisuHost = Uri.parse(webVisuUrl).host

        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                val errorHost = Uri.parse(error.url).host
                if (errorHost != null && errorHost == webVisuHost) {
                    handler.proceed()
                } else {
                    handler.cancel()
                }
            }
        }
        webView.loadUrl(webVisuUrl)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )
    }
}
