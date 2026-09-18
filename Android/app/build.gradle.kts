plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.antris.offgrid"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.antris.offgrid"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        buildConfig = true
    }

    // Deux variantes de distribution :
    //  - "site"      : build d'une installation livree. Les valeurs de Config.kt
    //                  sont utilisees au premier demarrage, l'app s'ouvre deja
    //                  configuree. C'est la build de Montchauvel.
    //  - "generique" : build destinee a une distribution large (Play Store), ou
    //                  un binaire unique sert tous les clients. Aucune valeur de
    //                  site n'est embarquee : l'app demarre non configuree et
    //                  demande son parametrage dans l'ecran Configuration.
    flavorDimensions += "distribution"
    productFlavors {
        create("site") {
            dimension = "distribution"
            buildConfigField("boolean", "FACTORY_PRESET", "true")
        }
        create("generique") {
            dimension = "distribution"
            buildConfigField("boolean", "FACTORY_PRESET", "false")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("com.google.android.material:material:1.12.0")
}
