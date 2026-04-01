import { ok } from "../utils/response.js";
import * as Skill from "../models/skill.model.js";

export async function getAllSkills(req, res, next) {
  try {
    const skills = await Skill.listAllSkills();
    return ok(res, { skills });
  } catch (err) {
    return next(err);
  }
}
