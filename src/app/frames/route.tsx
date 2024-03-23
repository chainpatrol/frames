/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/jsx-key */
import { createFrames, Button } from "frames.js/next";
import { ThreatDetector } from "@chainpatrol/sdk";
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const detector = new ThreatDetector({
  mode: "cloud",
  apiKey: process.env.CHAINPATROL_API_KEY!,
});

const regularFont = fetch(
  new URL("/public/assets/inter-latin-400-normal.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const boldFont = fetch(
  new URL("/public/assets/inter-latin-700-normal.ttf", import.meta.url)
).then((res) => res.arrayBuffer());

const frames = createFrames({
  basePath: "/frames",
});

type ImageOptions = ConstructorParameters<typeof ImageResponse>[1];

const handleRequest = frames(async (ctx) => {
  const [regularFontData, boldFontData] = await Promise.all([
    regularFont,
    boldFont,
  ]);

  const imageOptions = {
    fonts: [
      {
        name: "Inter",
        data: regularFontData,
        weight: 400,
      },
      {
        name: "Inter",
        data: boldFontData,
        weight: 700,
      },
    ],
  } satisfies ImageOptions;

  const content = ctx.message?.inputText ?? "";
  const error = (() => {
    try {
      new URL(content);
      return null;
    } catch (e) {
      if (e instanceof TypeError) {
        return "Invalid URL";
      } else {
        return "Unknown error";
      }
    }
  })();
  const op =
    error && ctx.searchParams.op === "" && content !== ""
      ? "error"
      : ctx.searchParams.op;

  switch (op) {
    case "check": {
      const result = await detector.url(content);

      if (!result.ok) {
        return {
          imageOptions,
          image: (
            <div tw="flex">
              <span tw="mr-2">❌ Error: </span>
              <span tw="font-bold">{result.error}</span>
            </div>
          ),
          buttons: [
            <Button action="post" target={{ query: { op: "initial" } }}>
              Back to Home
            </Button>,
          ],
        };
      }

      return {
        imageOptions,
        image: (
          <div tw="flex flex-col items-center">
            {result.status === "ALLOWED" && (
              <div tw="flex">
                <span tw="mr-2">✅ Allowed</span>
              </div>
            )}

            {result.status === "BLOCKED" && (
              <div tw="flex">
                <span tw="mr-2">🚫 Blocked</span>
              </div>
            )}

            {(result.status === "UNKNOWN" || result.status === "IGNORED") && (
              <div tw="flex">
                <span tw="mr-2">❓ Unknown</span>
              </div>
            )}

            <div tw="flex mt-2">
              <span tw="mr-2">🔗 URL: </span>
              <span tw="font-bold">{result.url}</span>
            </div>
          </div>
        ),
        buttons: [
          <Button action="post" target={{ query: { op: "initial" } }}>
            Back to Home
          </Button>,
          <Button
            action="link"
            target={`https://app.chainpatrol.io/search?content=${result.url}`}
          >
            Details
          </Button>,
        ],
      };
    }

    case "report": {
      return {
        imageOptions,
        image: (
          <div tw="flex">
            <span tw="mr-2">⏳ Reporting </span>
            <span tw="font-bold">{content}</span>
            <span>...</span>
          </div>
        ),
      };
    }

    case "error": {
      return {
        imageOptions,
        image: (
          <div tw="flex">
            <span tw="mr-2">❌ Error: </span>
            <span tw="font-bold">{error}</span>
          </div>
        ),
        buttons: [
          <Button action="post" target={{ query: { op: "" } }}>
            🔄 Retry
          </Button>,
        ],
      };
    }

    case "initial":
    default: {
      return {
        imageOptions,
        image: (
          <div tw="flex flex-col">
            <div tw="flex ">Enter a URL to check or report:</div>
          </div>
        ),
        textInput: "Type a URL",
        buttons: [
          <Button action="post" target={{ query: { op: "check" } }}>
            🔎 Check
          </Button>,
          <Button action="post" target={{ query: { op: "report" } }}>
            🥷 Report
          </Button>,
        ],
      };
    }
  }
});

export const GET = handleRequest;
export const POST = handleRequest;
