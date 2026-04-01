import { pool } from "../db.js";

function buildOrder(sortBy) {
  switch (sortBy) {
    case "rating":
      return `avg_rating DESC NULLS LAST, completed_calls DESC, total_experience DESC NULLS LAST, u.name ASC`;
    case "experience":
      return `total_experience DESC NULLS LAST, avg_rating DESC NULLS LAST, completed_calls DESC, u.name ASC`;
    case "relevance":
    default:
      return `match_count DESC, avg_rating DESC NULLS LAST, total_experience DESC NULLS LAST, completed_calls DESC, u.name ASC`;
  }
}

async function searchByRole({ q, availability, minRating, sortBy, limit, role }) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const orderBy = buildOrder(sortBy);

  const values = [];
  let i = 1;

  let where = `u.deleted_at IS NULL AND u.role = $${i++}`;
  values.push(role);

  if (availability) {
    where += ` AND u.availability ILIKE $${i++}`;
    values.push(`%${availability}%`);
  }

  // q is matched against skill_name
  if (q) {
    where += ` AND EXISTS (
      SELECT 1
      FROM "UserSkill" usx
      JOIN "Skill" sx ON sx.skill_id = usx.skill_id
      WHERE usx.user_id = u.user_id
        AND sx.skill_name ILIKE $${i}
    )`;
    values.push(`%${q}%`);
    i++;
  }

  let having = "";
  if (minRating !== undefined && minRating !== null && minRating !== "") {
    having = `HAVING COALESCE(AVG(rv.rating), 0) >= $${i++}`;
    values.push(Number(minRating));
  }

  const sql = `
    SELECT
      u.user_id,
      u.name,
      u.email,
      u.bio,
      u.profile_picture,
      u.role,
      u.experience,
      u.availability,
      COALESCE(AVG(rv.rating), 0)::numeric(3,2) AS avg_rating,
      COUNT(DISTINCT CASE
        WHEN vc.end_time IS NOT NULL OR vc.status = 'completed'
        THEN vc.video_call_id
      END)::int AS completed_calls,
      COALESCE(SUM(DISTINCT us.years_experience), 0)::numeric(10,1) AS total_experience,
      COUNT(DISTINCT CASE
        WHEN sk.skill_name ILIKE ${q ? `$${values.findIndex(v => typeof v === "string" && v === `%${q}%`) + 1}` : `'%'`}
        THEN sk.skill_id
      END)::int AS match_count,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'skill_id', sk.skill_id,
            'skill_name', sk.skill_name,
            'skill_category', sk.skill_category,
            'proficiency_level', us.proficiency_level,
            'years_experience', us.years_experience
          )
        ) FILTER (WHERE sk.skill_id IS NOT NULL),
        '[]'::json
      ) AS skills
    FROM "User" u
    LEFT JOIN "UserSkill" us ON us.user_id = u.user_id
    LEFT JOIN "Skill" sk ON sk.skill_id = us.skill_id
    LEFT JOIN "Review" rv ON rv.reviewee_id = u.user_id
    LEFT JOIN "VideoCall" vc ON vc.mentor_user_id = u.user_id
    WHERE ${where}
    GROUP BY
      u.user_id, u.name, u.email, u.bio, u.profile_picture, u.role, u.experience, u.availability
    ${having}
    ORDER BY ${orderBy}
    LIMIT ${lim}
  `;

  const r = await pool.query(sql, values);
  return r.rows;
}

export async function searchMentors(params) {
  return searchByRole({ ...params, role: "mentor" });
}

export async function searchUsersFallback(params) {
  return searchByRole({ ...params, role: "user" });
}