#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Definit le mot de passe d'USINE de l'application Off-the-Grid.
//
//   npm run set-password
//
// A n'utiliser que pour une build livree a un site precis (variante "site").
// Au quotidien, le mot de passe se definit et se change directement dans
// l'application, ecran Reglages > Securite — sans recompilation. Ce script ne
// sert qu'a preregler une build : la valeur ecrite ici amorce l'app au tout
// premier demarrage, avant toute configuration locale.
//
// Le mot de passe lui-meme n'est JAMAIS ecrit nulle part : le script derive une
// empreinte PBKDF2-SHA-256 (avec un sel aleatoire) et ecrit uniquement ce
// couple (sel, empreinte) dans les deux fichiers de configuration :
//
//   - MVP-visualisation/src/config.ts                        (web / PWA iOS)
//   - Android/app/src/main/java/com/antris/offgrid/Config.kt (app Android)
//
// Les deux plateformes partagent le meme sel et la meme empreinte : un seul
// mot de passe pour les deux apps. Apres execution : commit + push (le deploie-
// ment Netlify se declenche tout seul) et rebuild de l'APK Android.
// ---------------------------------------------------------------------------

import { webcrypto } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'

const ITERATIONS = 210_000
const HERE = dirname(fileURLToPath(import.meta.url))
const CONFIG_TS = resolve(HERE, '../src/config.ts')
const CONFIG_KT = resolve(HERE, '../../Android/app/src/main/java/com/antris/offgrid/Config.kt')

/**
 * Une seule interface readline pour toutes les questions : en creer une par
 * question ferait perdre les lignes deja bufferisees quand l'entree n'est pas
 * un terminal (ex. `printf 'x\nx\n' | npm run set-password`).
 */
function createPrompt() {
  // Entree non interactive (pipe, CI, test) : readline en mode terminal ne
  // rend pas la main correctement sur un flux redirige, on lit donc tout d'un
  // coup. Rien n'est echo a l'ecran de toute facon dans ce cas.
  if (!process.stdin.isTTY) {
    const queued = readFileSync(0, 'utf8').split(/\r?\n/)
    let next = 0
    return {
      askHidden(question) {
        process.stdout.write(`${question}\n`)
        if (next >= queued.length) return Promise.reject(new Error('saisie interrompue'))
        return Promise.resolve(queued[next++])
      },
      close() {},
    }
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  let muted = false
  rl._writeToOutput = (str) => {
    if (!muted) rl.output.write(str)
  }
  return {
    /** Pose une question sans afficher la saisie a l'ecran. */
    askHidden(question) {
      return new Promise((resolve, reject) => {
        const onClose = () => reject(new Error('saisie interrompue'))
        rl.once('close', onClose)
        rl.question(question, (answer) => {
          rl.off('close', onClose)
          muted = false
          process.stdout.write('\n')
          resolve(answer)
        })
        muted = true
      })
    },
    close: () => rl.close(),
  }
}

async function derive(password, saltBytes) {
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return Buffer.from(bits).toString('base64')
}

/** Remplace `key: '...'` / `key: 123` a l'interieur du bloc `auth: { ... }`. */
function patchTs(source, values) {
  const block = source.match(/auth:\s*\{[\s\S]*?\n {2}\},/)
  if (!block) throw new Error("bloc `auth: { ... }` introuvable dans src/config.ts")
  let patched = block[0]
  for (const [key, value] of Object.entries(values)) {
    const literal = typeof value === 'number' ? String(value) : `'${value}'`
    const re = new RegExp(`(\\b${key}:\\s*)('[^']*'|\\d+)`)
    if (!re.test(patched)) throw new Error(`cle \`${key}\` introuvable dans le bloc auth de config.ts`)
    patched = patched.replace(re, `$1${literal}`)
  }
  return source.replace(block[0], patched)
}

/** Remplace `const val KEY = "..."` / `= 123` dans Config.kt. */
function patchKt(source, values) {
  let patched = source
  for (const [key, value] of Object.entries(values)) {
    const literal = typeof value === 'number' ? String(value) : `"${value}"`
    const re = new RegExp(`(const val ${key}\\s*=\\s*)("[^"]*"|\\d+)`)
    if (!re.test(patched)) throw new Error(`cle \`${key}\` introuvable dans Config.kt`)
    patched = patched.replace(re, `$1${literal}`)
  }
  return patched
}

async function main() {
  console.log('\n  Off-the-Grid — definition du mot de passe d’acces\n')

  const prompt = createPrompt()
  let pwd
  let confirm
  try {
    pwd = await prompt.askHidden('  Nouveau mot de passe        : ')
    confirm = await prompt.askHidden('  Confirmer le mot de passe   : ')
  } finally {
    prompt.close()
  }

  if (pwd.length < 6) {
    console.error('\n  Refuse : 6 caracteres minimum.\n')
    process.exit(1)
  }
  if (pwd.length < 10) {
    console.warn(
      '\n  Attention : mot de passe court. Acceptable pour une phase de test,\n' +
        '  a remplacer par un mot de passe plus long avant mise en service.',
    )
  }
  if (pwd !== confirm) {
    console.error('\n  Refuse : les deux saisies different.\n')
    process.exit(1)
  }

  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const saltB64 = Buffer.from(salt).toString('base64')
  const hashB64 = await derive(pwd, salt)

  // --- web -----------------------------------------------------------------
  const ts = readFileSync(CONFIG_TS, 'utf8')
  writeFileSync(CONFIG_TS, patchTs(ts, { salt: saltB64, hash: hashB64, iterations: ITERATIONS }), 'utf8')
  console.log(`  ✓ web      ${CONFIG_TS}`)

  // --- Android -------------------------------------------------------------
  if (existsSync(CONFIG_KT)) {
    const kt = readFileSync(CONFIG_KT, 'utf8')
    writeFileSync(
      CONFIG_KT,
      patchKt(kt, { AUTH_SALT_B64: saltB64, AUTH_HASH_B64: hashB64, AUTH_ITERATIONS: ITERATIONS }),
      'utf8',
    )
    console.log(`  ✓ Android  ${CONFIG_KT}`)
  } else {
    console.log('  ! Config.kt introuvable — app Android non mise a jour.')
  }

  console.log(`
  Empreinte PBKDF2-SHA-256, ${ITERATIONS.toLocaleString('fr-FR')} iterations.
  Le mot de passe en clair n’est ecrit dans aucun fichier.

  Reste a faire :
    1. git add -A && git commit -m "Nouveau mot de passe d’acces" && git push
       (Netlify redeploie automatiquement la webapp)
    2. Rebuild de l’APK Android si l’app native est deja distribuee
    3. Transmettre le mot de passe a l’utilisateur par un canal separe
`)
}

main().catch((err) => {
  console.error(`\n  Erreur : ${err.message}\n`)
  process.exit(1)
})
