import { readFile } from "fs/promises";
import { extname } from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";
import type { IngestedDocument } from "./types.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function extractText(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();
  const buffer = await readFile(filePath);

  if (ext === ".pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === ".txt" || ext === ".md") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}. Supported: .pdf, .docx, .txt, .md`);
}

const EXTRACTION_PROMPT = `You are a document analysis assistant for VAEO, a digital marketing company. Analyze the following document text and extract structured information.

RULES:
- Extract ONLY facts that are explicitly present in the document. Do NOT invent or assume any information.
- If a claim in the document seems unverifiable or lacks a source, include it in keyFacts but prefix it with "[UNVERIFIED]".
- The title should reflect the document's main subject, not be a generic label.
- The summary should be 2-3 sentences capturing the core message.
- keyFacts should be specific, factual bullet points — numbers, names, outcomes, dates.
- suggestedKeywords should be SEO-relevant phrases a reader might search for.
- contentType must be exactly one of: "case_study", "win", "explanation", "guide", "unknown".
  - case_study: describes a client engagement, project, or before/after scenario
  - win: highlights a specific achievement, metric improvement, or success
  - explanation: explains a concept, process, or technology
  - guide: provides step-by-step instructions or how-to content
  - unknown: does not clearly fit the above categories

Respond with valid JSON only. No markdown fences. No commentary outside the JSON.

{
  "title": "string",
  "summary": "string",
  "keyFacts": ["string"],
  "suggestedKeywords": ["string"],
  "contentType": "case_study" | "win" | "explanation" | "guide" | "unknown"
}`;

export async function ingestDocument(filePath: string): Promise<IngestedDocument> {
  const rawText = await extractText(filePath);

  if (!rawText.trim()) {
    throw new Error("Document is empty or text extraction failed.");
  }

  const truncatedText = rawText.slice(0, 30000);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n--- DOCUMENT TEXT ---\n${truncatedText}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude.");
  }

  const parsed = JSON.parse(textBlock.text) as {
    title: string;
    summary: string;
    keyFacts: string[];
    suggestedKeywords: string[];
    contentType: IngestedDocument["contentType"];
  };

  return {
    rawText,
    title: parsed.title,
    summary: parsed.summary,
    keyFacts: parsed.keyFacts,
    suggestedKeywords: parsed.suggestedKeywords,
    contentType: parsed.contentType,
  };
}
