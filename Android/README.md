# Off-the-Grid — app Android

Squelette minimal : deux boutons.

1. **Ouvrir OpenVPN Connect** — ramène l'app officielle OpenVPN Connect (Play
   Store, `net.openvpn.openvpn`) au premier plan. On n'embarque aucune
   librairie OpenVPN dans l'app : les libs open-source disponibles
   (`ics-openvpn` en GPLv2, le core OpenVPN3 en AGPLv3) obligeraient à publier
   l'app sous la même licence, ce qui viole l'article 5.3 du contrat. Lancer
   l'app officielle via un `Intent` évite ce problème — OpenVPN Inc. ne vend
   pas de licence commerciale sur son code
   ([confirmé ici](https://support.openvpn.com/hc/en-us/articles/6693390454427-Can-I-license-the-OpenVPN-code-for-my-own-commercial-client)).
   L'utilisateur choisit son profil et se connecte lui-même dans OpenVPN
   Connect, puis revient sur cette app.
2. **Pilotage** — ouvre la WebVisu de l'automate dans une WebView plein écran
   (`WebVisuActivity`).

## Config.kt — source unique de vérité

Comme `MVP-visualisation/src/config.ts` : pour dupliquer l'app sur une autre
installation, ne modifier que `app/src/main/java/com/antris/offgrid/Config.kt`
(identité du site, URL de la WebVisu, nom du profil VPN).

## État du projet

Écrit à la main, **pas encore compilé ni testé** (pas de JDK/Android SDK
disponible dans cet environnement). Pour le premier build :

1. Ouvrir le dossier `Android/` dans Android Studio.
2. Le projet n'a pas de Gradle wrapper commit — Android Studio va soit
   utiliser son Gradle embarqué, soit proposer de générer le wrapper au sync.
3. Aucune icône de lanceur n'est fournie (`Config`/`themes.xml` sont prêts,
   mais il manque le logo client) — à ajouter via l'outil *Image Asset*
   d'Android Studio quand le logo sera disponible.
4. Le certificat du WAGO est auto-signé : `WebVisuActivity` n'accepte
   l'exception SSL que pour l'hôte configuré dans `Config.WEBVISU_HOST`.
5. Pour tester le bouton 1, OpenVPN Connect doit être installé sur l'appareil
   ou l'émulateur (Play Store requis, donc un émulateur avec image Google
   Play).
