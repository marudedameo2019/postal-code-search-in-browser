import * as esbuild from "esbuild";
import esbuildPluginLicense from 'esbuild-plugin-license';

const production = process.env.NODE_ENV === "production";
const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  target: "es2025",
  platform: "browser",
  plugins: [
    esbuildPluginLicense({
      banner: `/*! <%= pkg.name %> v<%= pkg.version %> | <%= pkg.license %> | please read ./dependencies.txt */`,
      thirdParty: {
        output: {
          file: 'dist/dependencies.txt'
        }
      }
    })
  ],
  minify: production,
  sourcemap: !production,
});

if (watch) {
  await ctx.watch();
  console.log("Watching...");
} else {
  console.log(`production: ${production}`);
  console.log("building...");
  await ctx.rebuild();
  await ctx.dispose();
  console.log("built.");
}
