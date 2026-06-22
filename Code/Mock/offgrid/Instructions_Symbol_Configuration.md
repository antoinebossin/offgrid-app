# Off-the-Grid — Configurer l'automate (Symbol Configuration OPC-UA)

*Note à adapter / forwarder à François.*

Salut François,

Voici la marche à suivre côté CODESYS pour exposer les paramètres que tu veux pouvoir
piloter depuis l'appli. **Point important d'abord** : cette étape demande **un dernier
téléchargement** (download) du programme sur l'automate. Mais c'est le dernier : une fois
les variables exposées, on peut **changer leurs valeurs en direct via OPC-UA, sans jamais
recompiler ni recharger**. C'est exactement le problème qu'on résout.

Et pour répondre à ta question (« pas eu besoin d'un password ? ») : le serveur OPC-UA du
WAGO accepte aujourd'hui les connexions anonymes — d'où l'absence de mot de passe. C'est
acceptable car tout passe déjà dans le tunnel OpenVPN (chiffré). Surtout, l'OPC-UA n'expose
**que les variables que tu coches** : je n'ai aucun accès à ton code ni à tes fichiers (pas
besoin de WinSCP/SFTP de mon côté). On renforcera ça juste après avec un compte dédié (voir
plus bas).

## Étapes dans CODESYS v3.5

1. **Ajouter l'objet** : clic droit sur **Application** → *Ajouter un objet* →
   **Symbol Configuration**. Dans la fenêtre, coche **« Prise en charge des fonctionnalités
   OPC UA »** (Support OPC UA features). Valide.
2. **Générer le code** : menu *Génération* → *Générer le code* (F11), pour que la liste des
   variables soit disponible.
3. **Choisir les variables** : ouvre l'éditeur *Symbol Configuration*, clique sur **Actualiser/
   Build**, déplie tes GVL/POU et **coche** les variables à exposer.
4. **Régler les droits** (colonne *Access rights*, la petite icône crayon) :
   - **Lecture/Écriture** pour les paramètres pilotables (consignes, seuils, modes, on/off).
   - **Lecture seule** pour les mesures que je n'affiche qu'en monitoring.
5. **Vérifier que ce sont bien des variables** : pour qu'un paramètre soit modifiable, il faut
   que ce soit une variable (idéalement dans une GVL), pas une constante (`VAR CONSTANT`) ni
   une valeur en dur. Si certaines consignes sont aujourd'hui figées dans le code, il faut les
   passer en variables — c'est ce qui rend le « réglage à chaud » possible.
6. **Télécharger une fois** : *Connexion* (Login) puis *Téléchargement* (Download). Voilà, le
   dernier recompile. Le serveur OPC-UA est déjà actif (UaExpert s'y connecte), rien d'autre
   à démarrer.

## Ce dont j'ai besoin de ta part

1. **L'adresse du WAGO sur le VPN** (l'IP que je mets dans `opc.tcp://…:4840`).
2. **La liste des variables exposées** avec leurs droits (lecture seule / lecture-écriture).
3. *(Plus tard)* les identifiants du compte OPC-UA dédié, une fois créé (étape sécurité).

## Variables de la maquette (à mapper sur tes vrais noms)

J'ai câblé un jeu d'exemple dans l'appli pour la démo. Donne-moi tes vrais noms et bornes,
je m'aligne :

| Rôle | Type | Bornes (garde-fou) | Droits |
|---|---|---|---|
| Consigne eau chaude | Double (°C) | 40 – 60 | R/W |
| Puissance chauffe max | Double (W) | 500 – 3000 | R/W |
| Seuil de délestage batterie | Double (%) | 20 – 80 | R/W |
| Mode (Éco / Confort / Hiver) | Int16 (0/1/2) | — | R/W |
| Chauffage d'appoint | Bool (on/off) | — | R/W |
| Charge batterie (SOC) | Double (%) | — | R |
| Production solaire | Double (W) | — | R |
| Température ballon | Double (°C) | — | R |

## Étape sécurité (juste après, pour ta priorité n°1)

Quand on aura validé en réel, on durcit : tu crées dans le WBM du WAGO (ou via le *Security
Screen* CODESYS) un **utilisateur OPC-UA dédié à l'appli**, tu actives l'authentification par
mot de passe (et idéalement la politique **Sign & Encrypt / Basic256Sha256**), puis tu me
passes ces identifiants. Ils ne donnent accès qu'aux variables cochées — jamais à l'automate.

À toi de jouer pour la Symbol Configuration ; dès que les variables sont visibles dans
UaExpert, je branche l'appli sur le vrai WAGO.
