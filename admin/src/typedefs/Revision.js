/**
 * Nested user object returned alongside a revision record.
 * Matches UserNested from backend/apps/cms/schemas/_nested.py.
 * NOTE: Not yet included in ContentRevision — backend PageContentRevisionNested
 * does not expose owner. Add `owner: Optional[UserNested]` to the schema when needed.
 *
 * @typedef RevisionOwner
 *
 * @property {number} id
 * @property {string | null} username
 * @property {string | null} name
 * @property {string | null} email
 * @property {string | null} first_name
 * @property {string | null} last_name
 */

/**
 * A single revision record for a Page or Blog Post content row.
 * Returned as nested array inside PageContentRead / BlogPostContentRead.
 * Matches PageContentRevisionNested / BlogPostContentRevisionNested from
 * backend/apps/cms/schemas/_nested.py.
 *
 * @typedef ContentRevision
 *
 * @property {number} id
 * @property {string | null} name - Human-readable label, e.g. "Published by Admin".
 *   Set automatically on publish; can be overridden by the user via rename.
 * @property {number | null} revision_number - Sequential per content row (1, 2, 3…)
 * @property {string | null} old_content - HTML content before this publish
 * @property {string | null} new_content - HTML content after this publish
 * @property {string | null} string_id
 * @property {string | null} created_at - ISO datetime string (UTC)
 * @property {string | null} updated_at - ISO datetime string (UTC)
 */
