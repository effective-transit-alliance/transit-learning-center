{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      forAllSystems = f: nixpkgs.lib.genAttrs
        [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ]
        (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs:
        let
          inherit (pkgs.lib) fileset;
          fonts = [ pkgs.tex-gyre.heros pkgs.liberation_ttf ];

          svg = pkgs.runCommand "fare-structures.svg" {
            nativeBuildInputs = [ pkgs.typescript ];
            src = fileset.toSource {
              root = ./.;
              fileset = fileset.unions [
                ./template.svg
                ./tsconfig.json
                ./src
              ];
            };
          } ''
            cd $src
            tsc --outDir $TMPDIR/dist
            substitute template.svg $out \
              --replace-fail '@@SCRIPT@@' "$(cat $TMPDIR/dist/main.js)"
          '';

          png = pkgs.runCommand "fare-structures.png" {
            nativeBuildInputs = [
              pkgs.chromium
              pkgs.librsvg
            ] ++ fonts;
            inherit svg;
            inlineStyles = ./inline-styles.js;
            FONTCONFIG_FILE = pkgs.makeFontsConf { fontDirectories = fonts; };
          } ''
            export HOME=$(mktemp -d)

            # Inject inline-styles script into SVG (before closing CDATA)
            head -n -2 "$svg" > with-inline.svg
            cat "$inlineStyles" >> with-inline.svg
            tail -n 2 "$svg" >> with-inline.svg

            # Use chromium to execute JS and dump DOM with inlined styles
            chromium \
              --headless \
              --no-sandbox \
              --disable-gpu \
              --disable-software-rasterizer \
              --disable-dev-shm-usage \
              --disable-breakpad \
              --disable-crash-reporter \
              --virtual-time-budget=5000 \
              --dump-dom \
              "file://$(pwd)/with-inline.svg" > rendered.svg

            # Use librsvg to render the static SVG to PNG at 2x resolution
            rsvg-convert -z 2 -o "$out" rendered.svg
          '';

          svg-pages = pkgs.runCommand "svg-pages" {
            inherit svg png;
          } ''
            mkdir -p $out
            cp $svg $out/fare-structures.svg
            cp $png $out/fare-structures.png
          '';

          svg-pages-commit = pkgs.runCommand "svg-pages-commit" {
            nativeBuildInputs = [ pkgs.git ];
            inherit svg png;
            GIT_AUTHOR_NAME = "Deploy Script";
            GIT_AUTHOR_EMAIL = "deploy@localhost";
            GIT_AUTHOR_DATE = "1970-01-01T00:00:00Z";
            GIT_COMMITTER_NAME = "Deploy Script";
            GIT_COMMITTER_EMAIL = "deploy@localhost";
            GIT_COMMITTER_DATE = "1970-01-01T00:00:00Z";
          } ''
            git init $out
            cp $svg $out/fare-structures.svg
            cp $png $out/fare-structures.png
            git -C $out add .
            git -C $out commit -m "Fresh svg-pages"
            git -C $out branch -m svg-pages
          '';
        in
        {
          inherit svg png svg-pages svg-pages-commit;
          default = svg;
        }
      );
    };
}
