import { z } from "zod";
import { ok, fail } from "../utils/response.js";
import * as Search from "../models/search.model.js";
import * as Skill from "../models/skill.model.js";

const searchSchema = z.object({
  q: z.string().optional(),
  availability: z.string().optional(),
  minRating: z.string().optional(),
  sortBy: z.enum(["relevance", "rating", "experience"]).optional(),
  limit: z.string().optional(),
});

export async function searchMentors(req, res, next) {
  try {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid query params", 400, parsed.error.flatten());

    const params = {
      q: parsed.data.q?.trim() || "",
      availability: parsed.data.availability?.trim() || "",
      minRating: parsed.data.minRating,
      sortBy: parsed.data.sortBy || "relevance",
      limit: parsed.data.limit || "20",
    };

    let results = await Search.searchMentors(params);
    let fallbackUsed = false;

    if (!results.length) {
      results = await Search.searchUsersFallback(params);
      fallbackUsed = true;
    }

    return ok(res, {
      fallbackUsed,
      count: results.length,
      results,
    });
  } catch (e) {
    return next(e);
  }
}

const autocompleteSchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional(),
});

export async function autocompleteSkills(req, res, next) {
  try {
    const parsed = autocompleteSchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid query params", 400, parsed.error.flatten());

    const rows = await Skill.autocompleteSkills(
      parsed.data.q.trim(),
      parsed.data.limit || "10"
    );

    return ok(res, { skills: rows });
  } catch (e) {
    return next(e);
  }
}