// swift-tools-version:5.10
import PackageDescription

let package = Package(
    name: "CurioTokens",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "CurioTokens", targets: ["CurioTokens"]),
    ],
    targets: [
        .target(
            name: "CurioTokens",
            dependencies: [],
            resources: [.copy("Fonts")]
        ),
    ]
)
