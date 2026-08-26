// Pure-Kotlin (kotlin("jvm"), not an Android Library module) build for the generated
// CurioTokens object — see @curio/contracts' build.gradle.kts for why: nothing in the generated
// code needs the Android SDK to compile (raw Long/Float/Long values, not androidx.compose.ui
// types — the consumer's own Compose-dependent app wraps them, e.g. Color(CurioTokens.Colors.x)),
// so JitPack (what Android pins a version through — mirrors web's github: dependency and iOS's
// SwiftPM git-tag pin) only needs a JDK.
//
// Kotlin sources live under src/main/kotlin (standard Gradle/Kotlin convention) — a sibling of
// this repo's src/tokens (JSON) and Sources/CurioTokens (Swift), not a subpath of either.
plugins {
    kotlin("jvm") version "2.0.20"
    `maven-publish`
}

group = "com.github.benjonesdesign"
// JitPack overrides this with the git tag being built (e.g. v3.2.0) — the literal value here only
// matters for a local `./gradlew publishToMavenLocal` during development.
version = "0.0.0-local"

repositories {
    mavenCentral()
}

kotlin {
    // Targets bytecode compatible with Android's minimum supported JVM level without requiring a
    // specific JDK toolchain to be locally installed to BUILD this module — see
    // @curio/contracts' build.gradle.kts for the fuller rationale.
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
    }
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

dependencies {
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])
        }
    }
}
