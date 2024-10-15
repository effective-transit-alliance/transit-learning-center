let
  pkgs = import ./dep/nixpkgs {};

in pkgs.stdenv.mkDerivation {
  name = "transit-learning-center";

  src = let
    inherit (pkgs.lib) fileset;
  in fileset.toSource {
    root = ./.;
    fileset = fileset.intersection
      (fileset.gitTracked ./.)
      (fileset.unions [
        ./Makefile
        ./source
      ]);
  };

  dontUnpack = true;

  nativeBuildInputs = [
    (pkgs.python3.withPackages (p: with p; [
      sphinx
      sphinx-rtd-theme
      myst-parser
    ]))
  ];

  dontConfigure = true;

  preBuild = ''
    cd "$src"
    mkdir "$out"
  '';

  buildFlags = [
    "BUILDDIR=${builtins.placeholder "out"}"
    "html"
  ];

  dontInstall = true;
}
