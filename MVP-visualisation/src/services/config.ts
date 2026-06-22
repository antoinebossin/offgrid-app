// ---------------------------------------------------------------------------
// Configuration de la liaison. En demo, le tunnel OpenVPN est SIMULE.
// En production, ces valeurs decrivent l'installation reelle de Montchauvel.
// ---------------------------------------------------------------------------

export const CONFIG = {
  // Profil / endpoint OpenVPN (la "URL fixe" evoquee par Francois).
  vpn: {
    profile: 'offgrid-montchauvel.ovpn',
    endpoint: 'vpn.offgrid.local:1194',
    protocol: 'UDP',
    cipher: 'AES-256-GCM',
  },
  // Automate cible.
  plc: {
    model: 'WAGO 750-8217',
    runtime: 'CODESYS V3.5 SP19',
    modem: 'Quectel EC25 · SIM data Orange',
    // URL fixe de l'interface (WebVisu Codesys ou passerelle) une fois le tunnel ouvert.
    dataUrl: 'http://10.8.0.1:8080/webvisu',
  },
  pollingIntervalMs: 1000,
  historyLength: 90,
  // Drapeau global : passe a false quand on branche un vrai PlcDataSource.
  simulated: true,
}
