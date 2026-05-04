#!/usr/bin/env node

/**
 * YALLA LONDON · Remotion Studio CLI
 *
 * Interactive menu to render branded video compositions.
 * Usage: node render.mjs        (interactive)
 *        node render.mjs --all  (render all with defaults)
 */

import { execSync } from "child_process";
import { existsSync, statSync, mkdirSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const inquirer = require("inquirer").default || require("inquirer");
const chalk = require("chalk").default || require("chalk");

// ─── Constants ────────────────────────────────────────────────

const COMPOSITIONS = [
  {
    id: "BrandIntro",
    label: "▶️  Intro Only",
    defaultFile: "brand-intro.mp4",
    props: null,
  },
  {
    id: "BrandOutro",
    label: "⏹️  Outro Only",
    defaultFile: "brand-outro.mp4",
    props: null,
  },
  {
    id: "StoryOverlay",
    label: "🔲  Transparent Overlay",
    defaultFile: "overlay.mov",
    codec: "prores",
    proresProfile: "4444",
    props: { durationInFrames: 300 },
  },
  {
    id: "ContentPost",
    label: "📋  Content Post (Tips/List)",
    defaultFile: "content-post.mp4",
    props: {
      kicker: "INSIDER TIP",
      headline: "Top 5 Halal\nRestaurants\nin Mayfair",
      items: [
        "The Montagu — Michelin-starred halal fine dining",
        "Rüya — Ottoman-Turkish with Bosphorus views",
        "Novikov — Russian-Asian with certified halal menu",
        "Hakkasan — Cantonese with halal-friendly options",
        "Sexy Fish — Japanese with dedicated halal grill",
      ],
    },
  },
  {
    id: "PromoSale",
    label: "🏷️  Promo / Sale",
    defaultFile: "promo-sale.mp4",
    props: {
      kicker: "LIMITED TIME OFFER",
      headline: "FLASH\nSALE",
      date: "MARCH 28 – APRIL 3",
      description:
        "Exclusive deals on luxury London experiences — afternoon tea, private tours, and 5-star stays at up to 40% off.",
      cta: "SHOP NOW",
    },
  },
  {
    id: "PhotoFeature",
    label: "📸  Photo Feature",
    defaultFile: "photo-feature.mp4",
    props: {
      mediaSrc:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1080&q=80",
      kicker: "DESTINATION SPOTLIGHT",
      headline: "The Royal\nObservatory\nGreenwich",
      body: "Stand on the Prime Meridian, explore 400 years of astronomy, and take in London's best skyline views.",
    },
  },
  {
    id: "EventTicket",
    label: "🎫  Event Ticket",
    defaultFile: "event-ticket.mp4",
    props: {
      eventName: "YALLA LONDON PRESENTS",
      headline: "Ramadan Iftar\nat The Shard",
      date: "15 MAR 2026",
      venue: "The Shard, SE1",
      price: "£85 pp",
      description:
        "Join us for a luxury iftar 800ft above London with panoramic views of the Thames. Halal fine dining by Michelin-starred chef.",
    },
  },
  {
    id: "VideoWithBranding",
    label: "🎬  Brand a Video",
    defaultFile: "branded-video.mp4",
    props: {
      footageSrc: "footage/sample.mp4",
      footageDurationInFrames: 300,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────

function ensureOutDir() {
  if (!existsSync("out")) mkdirSync("out");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderComposition(comp, outputFile, props) {
  ensureOutDir();
  const outPath = `out/${outputFile}`;

  let cmd = `npx remotion render ${comp.id} ${outPath}`;
  if (comp.codec) cmd += ` --codec=${comp.codec}`;
  if (comp.proresProfile) cmd += ` --prores-profile=${comp.proresProfile}`;
  if (props) cmd += ` --props='${JSON.stringify(props)}'`;

  console.log(chalk.dim(`\n$ ${cmd}\n`));

  try {
    execSync(cmd, { stdio: "inherit", timeout: 300_000 });
    if (existsSync(outPath)) {
      const size = statSync(outPath).size;
      console.log(
        chalk.green(`\n✓ Rendered: ${outPath} (${formatBytes(size)})`)
      );
    }
    return true;
  } catch (err) {
    console.error(chalk.red(`\n✗ Render failed for ${comp.id}`));
    return false;
  }
}

// ─── Interactive Prompts ──────────────────────────────────────

async function promptContentPost() {
  const answers = await inquirer.prompt([
    { type: "input", name: "kicker", message: "Kicker label:", default: "INSIDER TIP" },
    {
      type: "input",
      name: "headline",
      message: "Headline (use \\n for line breaks):",
      default: "Top 5 Halal\\nRestaurants\\nin Mayfair",
    },
    {
      type: "input",
      name: "items",
      message: "List items (comma-separated):",
      default:
        "The Montagu — Michelin-starred,Rüya — Ottoman-Turkish,Novikov — Russian-Asian,Hakkasan — Cantonese,Sexy Fish — Japanese",
    },
    { type: "input", name: "output", message: "Output filename:", default: "content-post.mp4" },
  ]);
  return {
    props: {
      kicker: answers.kicker,
      headline: answers.headline.replace(/\\n/g, "\n"),
      items: answers.items.split(",").map((s) => s.trim()),
    },
    output: answers.output,
  };
}

async function promptPromoSale() {
  const answers = await inquirer.prompt([
    { type: "input", name: "kicker", message: "Kicker:", default: "LIMITED TIME OFFER" },
    { type: "input", name: "headline", message: "Headline:", default: "FLASH\\nSALE" },
    { type: "input", name: "date", message: "Date range:", default: "MARCH 28 – APRIL 3" },
    { type: "input", name: "description", message: "Description:", default: "Exclusive deals on luxury London experiences." },
    { type: "input", name: "cta", message: "CTA text:", default: "SHOP NOW" },
    { type: "input", name: "output", message: "Output filename:", default: "promo-sale.mp4" },
  ]);
  return {
    props: {
      kicker: answers.kicker,
      headline: answers.headline.replace(/\\n/g, "\n"),
      date: answers.date,
      description: answers.description,
      cta: answers.cta,
    },
    output: answers.output,
  };
}

async function promptPhotoFeature() {
  const answers = await inquirer.prompt([
    { type: "input", name: "mediaSrc", message: "Image URL or path:", default: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1080&q=80" },
    { type: "input", name: "kicker", message: "Kicker:", default: "DESTINATION SPOTLIGHT" },
    { type: "input", name: "headline", message: "Headline:", default: "The Royal\\nObservatory\\nGreenwich" },
    { type: "input", name: "body", message: "Body text:", default: "Stand on the Prime Meridian and explore 400 years of astronomy." },
    { type: "input", name: "output", message: "Output filename:", default: "photo-feature.mp4" },
  ]);
  return {
    props: {
      mediaSrc: answers.mediaSrc,
      kicker: answers.kicker,
      headline: answers.headline.replace(/\\n/g, "\n"),
      body: answers.body,
    },
    output: answers.output,
  };
}

async function promptEventTicket() {
  const answers = await inquirer.prompt([
    { type: "input", name: "eventName", message: "Event name:", default: "YALLA LONDON PRESENTS" },
    { type: "input", name: "headline", message: "Headline:", default: "Ramadan Iftar\\nat The Shard" },
    { type: "input", name: "date", message: "Date:", default: "15 MAR 2026" },
    { type: "input", name: "venue", message: "Venue:", default: "The Shard, SE1" },
    { type: "input", name: "price", message: "Price:", default: "£85 pp" },
    { type: "input", name: "description", message: "Description:", default: "Luxury iftar 800ft above London with panoramic Thames views." },
    { type: "input", name: "output", message: "Output filename:", default: "event-ticket.mp4" },
  ]);
  return {
    props: {
      eventName: answers.eventName,
      headline: answers.headline.replace(/\\n/g, "\n"),
      date: answers.date,
      venue: answers.venue,
      price: answers.price,
      description: answers.description,
    },
    output: answers.output,
  };
}

async function promptVideoWithBranding() {
  const answers = await inquirer.prompt([
    { type: "input", name: "footageSrc", message: "Footage file (in public/footage/):", default: "footage/sample.mp4" },
    { type: "number", name: "footageDurationInFrames", message: "Footage duration (frames at 30fps):", default: 300 },
    { type: "input", name: "headline", message: "Headline (optional):", default: "" },
    { type: "input", name: "kicker", message: "Kicker (optional):", default: "" },
    { type: "input", name: "output", message: "Output filename:", default: "branded-video.mp4" },
  ]);
  return {
    props: {
      footageSrc: answers.footageSrc,
      footageDurationInFrames: answers.footageDurationInFrames,
      headline: answers.headline || undefined,
      kicker: answers.kicker || undefined,
    },
    output: answers.output,
  };
}

// ─── Main Menu ────────────────────────────────────────────────

async function main() {
  // Handle --all flag
  if (process.argv.includes("--all")) {
    console.log(chalk.bold.yellow("\n🚀 YALLA LONDON · Rendering ALL compositions\n"));
    let success = 0;
    let failed = 0;
    for (const comp of COMPOSITIONS) {
      const ok = renderComposition(comp, comp.defaultFile, comp.props);
      if (ok) success++;
      else failed++;
    }
    console.log(
      chalk.bold(
        `\n━━━ Done: ${chalk.green(success + " rendered")}, ${chalk.red(failed + " failed")} ━━━\n`
      )
    );
    return;
  }

  let running = true;
  while (running) {
    console.log(
      chalk.bold.yellow(`
┌─────────────────────────────────────┐
│  YALLA LONDON · Remotion Studio     │
│  ─── ─── ───                        │
└─────────────────────────────────────┘
`)
    );

    const choices = [
      ...COMPOSITIONS.map((c) => ({ name: c.label, value: c.id })),
      { name: "🚀  Render ALL", value: "__ALL__" },
      { name: "👁️  Preview in Browser", value: "__PREVIEW__" },
      { name: "🚪  Exit", value: "__EXIT__" },
    ];

    const { choice } = await inquirer.prompt([
      { type: "list", name: "choice", message: "What do you want to render?", choices },
    ]);

    if (choice === "__EXIT__") {
      running = false;
      break;
    }

    if (choice === "__PREVIEW__") {
      console.log(chalk.dim("\n$ npx remotion preview\n"));
      try {
        execSync("npx remotion preview", { stdio: "inherit" });
      } catch {
        // User closed preview
      }
      continue;
    }

    if (choice === "__ALL__") {
      let success = 0;
      let failed = 0;
      for (const comp of COMPOSITIONS) {
        const ok = renderComposition(comp, comp.defaultFile, comp.props);
        if (ok) success++;
        else failed++;
      }
      console.log(
        chalk.bold(
          `\n━━━ Done: ${chalk.green(success + " rendered")}, ${chalk.red(failed + " failed")} ━━━\n`
        )
      );
      continue;
    }

    // Specific composition
    const comp = COMPOSITIONS.find((c) => c.id === choice);
    if (!comp) continue;

    let props = comp.props;
    let outputFile = comp.defaultFile;

    // Interactive prompt per composition type
    if (choice === "ContentPost") {
      const result = await promptContentPost();
      props = result.props;
      outputFile = result.output;
    } else if (choice === "PromoSale") {
      const result = await promptPromoSale();
      props = result.props;
      outputFile = result.output;
    } else if (choice === "PhotoFeature") {
      const result = await promptPhotoFeature();
      props = result.props;
      outputFile = result.output;
    } else if (choice === "EventTicket") {
      const result = await promptEventTicket();
      props = result.props;
      outputFile = result.output;
    } else if (choice === "VideoWithBranding") {
      const result = await promptVideoWithBranding();
      props = result.props;
      outputFile = result.output;
    } else {
      // Simple compositions (BrandIntro, BrandOutro, StoryOverlay)
      const { output } = await inquirer.prompt([
        { type: "input", name: "output", message: "Output filename:", default: comp.defaultFile },
      ]);
      outputFile = output;
    }

    renderComposition(comp, outputFile, props);

    const { again } = await inquirer.prompt([
      { type: "confirm", name: "again", message: "Render another?", default: true },
    ]);
    if (!again) running = false;
  }

  console.log(chalk.yellow("\n👋 Bye!\n"));
}

main().catch(console.error);
