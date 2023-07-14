let
  pkgs = import ./dep/nixpkgs {};

in pkgs.stdenv.mkDerivation {
  name = "transit-learning-center";

  src = builtins.fetchGit ./.;

  nativeBuildInputs = [
    (pkgs.python3.withPackages (p: with p; [
      sphinx
      sphinx-rtd-theme
      myst-parser
    ]))
  ];

  buildFlags = "html";

  installPhase = ''
    mv build $out
  '';
}
