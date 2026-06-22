/*
 * Simulateur WAGO 750-8217 / EMS Off-the-Grid
 * ------------------------------------------------------------------
 * Reproduit un serveur OPC-UA avec les memes variables que celles que
 * Francois exposera via la Symbol Configuration de CODESYS. Permet de
 * developper et tester l'appli (lecture + Hot Write) sans toucher au PLC.
 *
 * Lancement : node server.js
 * Endpoint  : opc.tcp://localhost:4840/UA/OffGrid
 */
const {
  OPCUAServer, Variant, DataType, StatusCodes,
} = require("node-opcua");

(async () => {
  const server = new OPCUAServer({
    port: 4840,
    resourcePath: "/UA/OffGrid",
    buildInfo: { productName: "OffGrid-EMS-Mock", buildNumber: "1", buildDate: new Date() },
  });

  await server.initialize();
  const addressSpace = server.engine.addressSpace;
  const ns = addressSpace.getOwnNamespace();
  const ems = ns.addObject({
    organizedBy: addressSpace.rootFolder.objects,
    browseName: "EMS",
  });

  // ---- Etat interne (ce que l'EMS de Francois utiliserait reellement) ----
  const state = {
    consigneECS: 50,
    puissanceChauffeMax: 2000,
    seuilDelestageSOC: 35,
    modeFonctionnement: 1, // 0 Eco / 1 Confort / 2 Hiver
    chauffageActif: true,
    // mesures (lecture seule)
    socBatterie: 78,
    puissancePV: 1450,
    tempBallon: 52,
  };

  // Helper pour les variables read/write
  function rw(browseName, key, dataType) {
    ns.addVariable({
      componentOf: ems,
      browseName,
      nodeId: `ns=1;s=EMS.${browseName}`,
      dataType,
      minimumSamplingInterval: 250,
      value: {
        get: () => new Variant({ dataType: DataType[dataType], value: state[key] }),
        set: (variant) => {
          state[key] = variant.value;
          console.log(`[WAGO] ${browseName} <- ${variant.value}  (Hot Write recu)`);
          return StatusCodes.Good;
        },
      },
    });
  }

  // Helper pour les mesures (lecture seule)
  function ro(browseName, key, dataType) {
    ns.addVariable({
      componentOf: ems,
      browseName,
      nodeId: `ns=1;s=EMS.${browseName}`,
      dataType,
      minimumSamplingInterval: 1000,
      value: {
        get: () => new Variant({ dataType: DataType[dataType], value: state[key] }),
        // pas de "set" => le serveur renvoie BadNotWritable, exactement comme
        // une variable exposee en lecture seule dans la Symbol Configuration.
      },
    });
  }

  rw("consigneECS", "consigneECS", "Double");
  rw("puissanceChauffeMax", "puissanceChauffeMax", "Double");
  rw("seuilDelestageSOC", "seuilDelestageSOC", "Double");
  rw("modeFonctionnement", "modeFonctionnement", "Int16");
  rw("chauffageActif", "chauffageActif", "Boolean");

  ro("socBatterie", "socBatterie", "Double");
  ro("puissancePV", "puissancePV", "Double");
  ro("tempBallon", "tempBallon", "Double");

  // ---- Simulation : les mesures bougent legerement dans le temps ----
  setInterval(() => {
    const hour = new Date().getHours();
    const sun = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)); // 0 la nuit, ~1 a midi
    state.puissancePV = Math.round(sun * 2600 + (Math.random() * 200 - 100));
    state.socBatterie = Math.min(100, Math.max(15,
      state.socBatterie + (sun > 0.3 ? 0.4 : -0.3) + (Math.random() - 0.5)));
    state.socBatterie = Math.round(state.socBatterie * 10) / 10;
    const cible = state.chauffageActif ? state.consigneECS : 35;
    state.tempBallon = Math.round((state.tempBallon + (cible - state.tempBallon) * 0.05) * 10) / 10;
  }, 2000);

  await server.start();
  console.log("Simulateur WAGO/EMS demarre.");
  console.log("Endpoint OPC-UA :", server.getEndpointUrl());
  console.log("Variables exposees sous l'objet 'EMS' (namespace ns=1).");
})();
