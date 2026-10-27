/**
 * SEC fair-access User-Agent for every data.sec.gov and sec.gov request
 * this repo makes. Change this string and nowhere else.
 * https://www.sec.gov/os/webmaster-faq#developers
 */
// The SEC refuses requests whose User-Agent lacks an email address.
// Set the SEC_USER_AGENT Actions secret to "Securities Law Deskbook <email>".
const DEFAULT_UA = "Securities Law Deskbook research portal (contact: GitHub cs-514)";
export const SEC_USER_AGENT = (process.env.SEC_USER_AGENT || "").trim() || DEFAULT_UA;
