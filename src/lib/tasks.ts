/** Practitioner tasks. Orientation is original. Every rule link is resolved against the corpus. */

import { ecfrPart, ecfrSection, halfById, type HalfId } from "./desk";
import { findForm } from "./formCatalog";
import { readingSet, type ReadingLink } from "./reading";
import { loadManifest, ruleTarget } from "./rules";
import { findSection } from "./statutes";

export type TaskRef =
  | { label: string; rule: string; anchor?: string }
  | { label: string; form: string }
  | { label: string; act: "33-act" | "34-act"; slug: string; hash?: string }
  | { label: string; part: string }
  | { label: string; path: string }
  | { label: string; href: string };

export interface TaskGroup {
  heading: string;
  refs: TaskRef[];
}

export interface Task {
  slug: string;
  half: HalfId;
  nav: string;
  title: string;
  orientation: string[];
  groups: TaskGroup[];
  rules: string[];
  forms: string[];
  sections: string[];
  reading: string[];
}

export interface ResolvedLink {
  label: string;
  path?: string;
  href?: string;
}

const R = (rule: string, label: string, anchor?: string): TaskRef => ({ rule, label, anchor });
const F = (form: string, label: string): TaskRef => ({ form, label });
const S = (act: "33-act" | "34-act", slug: string, label: string, hash?: string): TaskRef => ({ act, slug, label, hash });
const P = (part: string, label: string): TaskRef => ({ part, label });
const L = (path: string, label: string): TaskRef => ({ path, label });
const X = (href: string, label: string): TaskRef => ({ href, label });

export const TASKS: Task[] = [
  {
    slug: "registered-offerings",
    half: "securities-act",
    nav: "Registered offerings",
    title: "Registered offerings (Forms S-1, S-3, S-4, S-8, F-1, F-3, and F-4)",
    orientation: [
      "Section 5 requires a registration statement to be in effect before an issuer sells securities, unless an exemption applies. Form S-1 is the long form. Form S-3 is the short form for eligible issuers and the usual shelf.",
      "A shelf takedown uses Rule 415, a Rule 424(b) prospectus supplement, and Rule 430B for omitted information. Form S-4 registers securities issued in a business combination. Form S-8 registers employee-plan securities.",
      "Foreign private issuers use Form F-1 for a long-form offering, Form F-3 for a short-form or shelf offering, and Form F-4 for a business combination.",
    ],
    groups: [
      {
        heading: "Forms",
        refs: [
          F("s-1", "Form S-1"),
          F("s-3", "Form S-3"),
          F("s-4", "Form S-4"),
          F("s-8", "Form S-8"),
          F("f-1", "Form F-1"),
          F("f-3", "Form F-3"),
          R("239.34", "Form F-4 (§ 239.34)"),
          R("239.40", "Form F-10 (§ 239.40)"),
        ],
      },
      {
        heading: "Shelf and takedown",
        refs: [
          R("230.415", "Rule 415", "a"),
          R("230.424", "Rule 424(b)", "b"),
          R("230.430B", "Rule 430B"),
          R("230.462", "Rule 462(a)", "a"),
        ],
      },
      {
        heading: "Statute and disclosure",
        refs: [
          S("33-act", "section-5", "Securities Act § 5"),
          S("33-act", "section-7", "Securities Act § 7"),
          S("33-act", "section-10", "Securities Act § 10"),
          P("229", "Regulation S-K"),
          P("210", "Regulation S-X"),
          R("230.405", "Rule 405"),
        ],
      },
    ],
    rules: ["230.415", "230.424", "230.430B", "230.405", "239.11", "239.13", "239.25", "239.16b", "239.31", "239.33", "239.34"],
    forms: ["s-1", "s-3", "s-4", "s-8", "f-1", "f-3"],
    sections: ["33-act/section-5", "33-act/section-7", "33-act/section-10"],
    reading: ["sk", "sx"],
  },
  {
    slug: "exempt-offerings",
    half: "securities-act",
    nav: "Exempt offerings",
    title: "Exempt offerings (Regulation D, Rule 144A, Regulation S, and Rule 701)",
    orientation: [
      "Section 4(a)(2) exempts a transaction by an issuer not involving a public offering. Regulation D is the set of safe harbors practitioners actually use: Rule 504, and Rule 506(b) and Rule 506(c).",
      "A Regulation D sale is noticed on Form D. Rule 144A covers resales to qualified institutional buyers. Regulation S covers offshore offers and sales. Rule 701 covers compensatory securities of a non-reporting issuer.",
      "Regulation A uses Form 1-A. Regulation Crowdfunding is a separate exemption for offerings through a registered intermediary.",
    ],
    groups: [
      {
        heading: "Statute",
        refs: [
          S("33-act", "section-4", "Securities Act § 4(a)(2)", "a-2"),
          S("33-act", "section-4a", "Securities Act § 4A"),
          S("33-act", "section-3", "Securities Act § 3(b)", "b"),
        ],
      },
      {
        heading: "Regulation D",
        refs: [
          R("230.500", "Rule 500"),
          R("230.501", "Rule 501"),
          R("230.502", "Rule 502"),
          R("230.503", "Rule 503"),
          R("230.504", "Rule 504"),
          R("230.506", "Rule 506(b)", "b"),
          R("230.506", "Rule 506(c)", "c"),
          F("d", "Form D"),
        ],
      },
      {
        heading: "Other exemptions",
        refs: [
          R("230.144A", "Rule 144A"),
          R("230.901", "Regulation S (Rule 901)"),
          R("230.902", "Rule 902"),
          R("230.903", "Rule 903"),
          R("230.701", "Rule 701", "d"),
          R("230.251", "Regulation A (Rule 251)"),
          F("1-a", "Form 1-A"),
          P("227", "Regulation Crowdfunding"),
        ],
      },
    ],
    rules: ["230.501", "230.502", "230.504", "230.506", "230.144A", "230.901", "230.701", "230.251"],
    forms: ["d", "1-a"],
    sections: ["33-act/section-4", "33-act/section-4a", "33-act/section-3"],
    reading: ["d", "s"],
  },
  {
    slug: "resales",
    half: "securities-act",
    nav: "Resales",
    title: "Resales (Rule 144 and Section 4(a)(7))",
    orientation: [
      "Section 4(a)(1) exempts a transaction by a person other than an issuer, underwriter, or dealer. Rule 144 is the non-exclusive safe harbor for resales of restricted securities and securities held by affiliates.",
      "The conditions that matter in practice are current public information, the holding period, the manner of sale, and the volume limit. Form 144 is the notice of a proposed sale.",
      "Section 4(a)(7) is a separate resale exemption for certain private sales to accredited investors. Rule 144A is the institutional resale exemption and is treated with the other exempt offerings.",
    ],
    groups: [
      {
        heading: "Rule 144",
        refs: [
          R("230.144", "Rule 144"),
          R("230.144", "Rule 144(a) definitions", "a"),
          R("230.144", "Rule 144(b) conditions", "b"),
          R("230.144", "Rule 144(c) current information", "c"),
          R("230.144", "Rule 144(d) holding period", "d"),
          F("144", "Form 144"),
        ],
      },
      {
        heading: "Statute",
        refs: [
          S("33-act", "section-4", "Securities Act § 4(a)(1)", "a-1"),
          S("33-act", "section-4", "Securities Act § 4(a)(7)", "a-7"),
          S("33-act", "section-2", "Securities Act § 2(a)(11)"),
          R("230.144A", "Rule 144A"),
        ],
      },
    ],
    rules: ["230.144", "230.144A"],
    forms: ["144"],
    sections: ["33-act/section-4"],
    reading: ["144"],
  },
  {
    slug: "communications",
    half: "securities-act",
    nav: "Communications and gun-jumping",
    title: "Communications and gun-jumping (Section 5)",
    orientation: [
      "Section 5 divides an offering into the pre-filing period, the waiting period, and the post-effective period, and it limits what counts as an offer. A communication that conditions the market can be an illegal offer.",
      "Rules 135, 163, 163A, and 169 describe communications that are not offers, or that a well-known seasoned issuer may make. Rules 134 and 135c describe notices that are permitted around an offering.",
      "Rules 164 and 433 govern free writing prospectuses. Rules 168 and 169 cover factual and forward-looking business information. Rules 138 and 139 cover research reports.",
    ],
    groups: [
      {
        heading: "Section 5",
        refs: [
          S("33-act", "section-5", "Securities Act § 5"),
          S("33-act", "section-5", "§ 5(b) prospectus delivery", "b"),
          S("33-act", "section-5", "§ 5(c) gun-jumping", "c"),
          S("33-act", "section-2", "Securities Act § 2(a)(3)"),
        ],
      },
      {
        heading: "Permitted communications",
        refs: [
          R("230.135", "Rule 135"),
          R("230.135c", "Rule 135c"),
          R("230.134", "Rule 134"),
          R("230.163", "Rule 163"),
          R("230.163A", "Rule 163A"),
          R("230.163B", "Rule 163B"),
          R("230.168", "Rule 168"),
          R("230.169", "Rule 169"),
        ],
      },
      {
        heading: "Free writing prospectuses and research",
        refs: [
          R("230.164", "Rule 164"),
          R("230.433", "Rule 433"),
          R("230.138", "Rule 138"),
          R("230.139", "Rule 139"),
          R("230.405", "Rule 405"),
        ],
      },
    ],
    rules: ["230.134", "230.135", "230.135c", "230.163", "230.163A", "230.163B", "230.164", "230.433", "230.168", "230.169", "230.138", "230.139"],
    forms: [],
    sections: ["33-act/section-5", "33-act/section-2"],
    reading: ["desk"],
  },
  {
    slug: "liability",
    half: "securities-act",
    nav: "Liability",
    title: "Liability under the Securities Act (Sections 11, 12, 15, and 17(a))",
    orientation: [
      "Section 11 imposes liability for a materially false registration statement on the issuer, directors, signing officers, and named experts and underwriters. Section 12(a)(1) reaches a sale that violates section 5. Section 12(a)(2) reaches a false prospectus or oral communication.",
      "Section 15 extends that liability to a person who controls a liable person. Section 17(a) is the Securities Act antifraud provision and does not require a purchase or sale in the same way Exchange Act § 10(b) does.",
      "Rule 176 lists circumstances that bear on whether a person conducted a reasonable investigation under section 11. Exchange Act Rule 10b-5 is the companion antifraud rule and is treated with disclosure policy.",
    ],
    groups: [
      {
        heading: "Statute",
        refs: [
          S("33-act", "section-11", "Securities Act § 11"),
          S("33-act", "section-12", "Securities Act § 12(a)(1)", "a-1"),
          S("33-act", "section-12", "Securities Act § 12(a)(2)", "a-2"),
          S("33-act", "section-15", "Securities Act § 15"),
          S("33-act", "section-17", "Securities Act § 17(a)", "a"),
        ],
      },
      {
        heading: "Related rules",
        refs: [
          R("230.176", "Rule 176"),
          R("240.10b-5", "Rule 10b-5"),
          S("34-act", "section-10", "Exchange Act § 10(b)", "b"),
        ],
      },
    ],
    rules: ["230.176"],
    forms: [],
    sections: ["33-act/section-11", "33-act/section-12", "33-act/section-15", "33-act/section-17"],
    reading: ["desk"],
  },
  {
    slug: "periodic-reporting",
    half: "exchange-act",
    nav: "Periodic reporting",
    title: "Periodic reporting (Forms 10-K, 10-Q, 20-F, and 40-F)",
    orientation: [
      "Section 13(a) and section 15(d) require an annual report and quarterly reports. Domestic issuers file Form 10-K and Form 10-Q. Foreign private issuers file Form 20-F, or Form 40-F if they are in the multijurisdictional disclosure system.",
      "The narrative is Regulation S-K. The financial statements are Regulation S-X. The items a practitioner opens most often are management’s discussion and analysis, risk factors, executive compensation, cybersecurity, and the exhibit index.",
      "Rules 13a-1 and 15d-1 are the annual-report rules. Rules 13a-13 and 15d-13 are the quarterly-report rules.",
    ],
    groups: [
      {
        heading: "Forms and filing rules",
        refs: [
          F("10-k", "Form 10-K"),
          F("10-q", "Form 10-Q"),
          F("20-f", "Form 20-F"),
          F("40-f", "Form 40-F"),
          R("240.13a-1", "Rule 13a-1"),
          R("240.15d-1", "Rule 15d-1"),
          R("240.13a-13", "Rule 13a-13"),
          R("240.15d-13", "Rule 15d-13"),
          S("34-act", "section-13", "Exchange Act § 13(a)", "a"),
          S("34-act", "section-15", "Exchange Act § 15(d)", "d"),
        ],
      },
      {
        heading: "Regulation S-K, by topic",
        refs: [
          R("229.303", "Item 303, MD&A"),
          R("229.105", "Item 105, risk factors"),
          R("229.402", "Item 402, executive compensation"),
          R("229.402", "Item 402(c), summary table", "c"),
          R("229.106", "Item 106, cybersecurity"),
          R("229.601", "Item 601, exhibits"),
          P("229", "Regulation S-K"),
        ],
      },
      {
        heading: "Regulation S-X",
        refs: [
          P("210", "Regulation S-X"),
          R("210.3-01", "Rule 3-01"),
          R("210.8-01", "Rule 8-01"),
          R("210.10-01", "Rule 10-01"),
        ],
      },
    ],
    rules: ["240.13a-1", "240.13a-13", "240.15d-1", "240.15d-13", "229.303", "229.105", "229.402", "229.106", "229.601"],
    forms: ["10-k", "10-q", "20-f", "40-f"],
    sections: ["34-act/section-13", "34-act/section-15"],
    reading: ["sk", "sx", "13a"],
  },
  {
    slug: "current-reporting",
    half: "exchange-act",
    nav: "Current reporting",
    title: "Current reporting (Form 8-K and Form 6-K)",
    orientation: [
      "Form 8-K is the domestic current report. Rules 13a-11 and 15d-11 require it when an item in sections 1 through 6, or Item 9.01, happens. The ordinary deadline is four business days.",
      "Items 7.01 and 8.01 are voluntary. Item 7.01 is how a company furnishes a Regulation FD disclosure. Item 1.05 is the material cybersecurity incident item.",
      "A foreign private issuer does not file Form 8-K. It furnishes Form 6-K for material information the issuer publishes or is required to publish at home.",
    ],
    groups: [
      {
        heading: "The forms",
        refs: [
          F("8-k", "Form 8-K"),
          F("6-k", "Form 6-K"),
          R("249.308", "Form 8-K (§ 249.308)"),
          R("240.13a-11", "Rule 13a-11"),
          R("240.15d-11", "Rule 15d-11"),
          R("240.13a-16", "Rule 13a-16"),
          R("240.15d-16", "Rule 15d-16"),
        ],
      },
      {
        heading: "Form 8-K items",
        refs: [
          L("forms/8-k/#item-1-01", "Item 1.01, material agreement"),
          L("forms/8-k/#item-1-02", "Item 1.02, termination"),
          L("forms/8-k/#item-1-03", "Item 1.03, bankruptcy"),
          L("forms/8-k/#item-1-05", "Item 1.05, cybersecurity incident"),
          L("forms/8-k/#item-2-01", "Item 2.01, acquisition or disposition"),
          L("forms/8-k/#item-2-02", "Item 2.02, results of operations"),
          L("forms/8-k/#item-4-01", "Item 4.01, change in accountant"),
          L("forms/8-k/#item-4-02", "Item 4.02, non-reliance"),
          L("forms/8-k/#item-5-02", "Item 5.02, directors and officers"),
          L("forms/8-k/#item-5-07", "Item 5.07, vote of security holders"),
          L("forms/8-k/#item-7-01", "Item 7.01, Regulation FD"),
          L("forms/8-k/#item-9-01", "Item 9.01, financial statements and exhibits"),
        ],
      },
    ],
    rules: ["240.13a-11", "240.15d-11", "249.308", "249.306"],
    forms: ["8-k", "6-k"],
    sections: [],
    reading: ["13a"],
  },
  {
    slug: "proxies",
    half: "exchange-act",
    nav: "Proxies and meetings",
    title: "Proxies and meetings (Regulation 14A and Rule 14a-8)",
    orientation: [
      "Section 14(a) makes it unlawful to solicit a proxy for a registered security in contravention of the Commission’s rules. Regulation 14A is that set of rules. The disclosure document is Schedule 14A, filed as DEF 14A.",
      "Rule 14a-8 is the shareholder-proposal rule, including the substantive bases on which a company may exclude a proposal. Rule 14a-9 is the antifraud rule for proxy statements.",
      "Say-on-pay is Rule 14a-21. Rule 14a-19 is the universal-proxy rule for a contested election.",
    ],
    groups: [
      {
        heading: "Regulation 14A",
        refs: [
          S("34-act", "section-14", "Exchange Act § 14(a)", "a"),
          R("240.14a-1", "Rule 14a-1"),
          R("240.14a-3", "Rule 14a-3"),
          R("240.14a-4", "Rule 14a-4"),
          R("240.14a-6", "Rule 14a-6"),
          R("240.14a-8", "Rule 14a-8"),
          R("240.14a-9", "Rule 14a-9"),
          R("240.14a-19", "Rule 14a-19"),
          R("240.14a-21", "Rule 14a-21, say-on-pay"),
          R("240.14a-101", "Schedule 14A"),
          F("def-14a", "DEF 14A"),
        ],
      },
    ],
    rules: ["240.14a-1", "240.14a-3", "240.14a-8", "240.14a-9", "240.14a-19", "240.14a-21", "240.14a-101"],
    forms: ["def-14a"],
    sections: ["34-act/section-14"],
    reading: ["14a"],
  },
  {
    slug: "insiders",
    half: "exchange-act",
    nav: "Insiders",
    title: "Insiders (Section 16 and Rule 10b5-1)",
    orientation: [
      "Section 16(a) requires directors, officers, and more-than-10-percent holders of a class registered under section 12 to report their holdings and transactions. Form 3 is the initial report. Form 4 covers changes. Form 5 is the annual catch-up.",
      "Section 16(b) allows the issuer to recover short-swing profits. Rule 16b-3 exempts certain transactions under employee plans.",
      "Rule 10b5-1 is the affirmative defense for a purchase or sale under a written plan adopted when the person was not aware of material nonpublic information. A Form 4 checkbox discloses when a transaction was made under such a plan.",
    ],
    groups: [
      {
        heading: "Section 16",
        refs: [
          S("34-act", "section-16", "Exchange Act § 16(a)", "a"),
          S("34-act", "section-16", "Exchange Act § 16(b)", "b"),
          R("240.16a-1", "Rule 16a-1"),
          R("240.16a-3", "Rule 16a-3"),
          R("240.16b-3", "Rule 16b-3"),
          F("3", "Form 3"),
          F("4", "Form 4"),
          F("5", "Form 5"),
        ],
      },
      {
        heading: "Trading plans",
        refs: [
          R("240.10b5-1", "Rule 10b5-1"),
          R("240.10b-5", "Rule 10b-5"),
        ],
      },
    ],
    rules: ["240.16a-1", "240.16a-3", "240.16b-3", "240.10b5-1"],
    forms: ["3", "4", "5"],
    sections: ["34-act/section-16"],
    reading: ["16"],
  },
  {
    slug: "beneficial-ownership",
    half: "exchange-act",
    nav: "Beneficial ownership",
    title: "Beneficial ownership (Schedules 13D and 13G)",
    orientation: [
      "Section 13(d) requires a person who acquires beneficial ownership of more than 5 percent of a class of voting equity securities registered under section 12 to file a statement. Schedule 13D is the long form.",
      "Schedule 13G is available to qualified institutional investors, passive investors, and exempt investors on the terms in Rule 13d-1. An amendment is required when the information changes materially, and on the schedule in Rule 13d-2.",
      "The schedules themselves are Rules 13d-101 and 13d-102. EDGAR files them as SC 13D and SC 13G.",
    ],
    groups: [
      {
        heading: "Statute and rules",
        refs: [
          S("34-act", "section-13", "Exchange Act § 13(d)", "d"),
          S("34-act", "section-13", "Exchange Act § 13(g)", "g"),
          R("240.13d-1", "Rule 13d-1"),
          R("240.13d-2", "Rule 13d-2"),
          R("240.13d-3", "Rule 13d-3"),
          R("240.13d-101", "Schedule 13D"),
          R("240.13d-102", "Schedule 13G"),
          F("schedule-13d", "Schedule 13D"),
          F("schedule-13g", "Schedule 13G"),
        ],
      },
    ],
    rules: ["240.13d-1", "240.13d-2", "240.13d-101", "240.13d-102"],
    forms: ["schedule-13d", "schedule-13g"],
    sections: ["34-act/section-13"],
    reading: ["13a"],
  },
  {
    slug: "disclosure-policy",
    half: "exchange-act",
    nav: "Disclosure policy",
    title: "Disclosure policy (Regulation FD, Regulation G, and Rule 10b-5)",
    orientation: [
      "Regulation FD requires a reporting issuer to make public any material nonpublic information it selectively discloses to specified market professionals. The usual vehicle is Form 8-K Item 7.01, or a method of dissemination that is reasonably designed to provide broad, non-exclusionary distribution.",
      "Regulation G governs non-GAAP financial measures in a public announcement. Item 10(e) of Regulation S-K governs the same measures when they appear in a filed document.",
      "Rule 10b-5 is the general antifraud rule under section 10(b). It reaches a false statement, or an omission of a material fact necessary to make statements made not misleading, in connection with the purchase or sale of a security.",
    ],
    groups: [
      {
        heading: "Selective disclosure and non-GAAP",
        refs: [
          P("243", "Regulation FD"),
          R("243.100", "Regulation FD Rule 100"),
          L("forms/8-k/#item-7-01", "Form 8-K Item 7.01"),
          P("244", "Regulation G"),
          R("244.100", "Regulation G Rule 100"),
          R("229.10", "Item 10(e), non-GAAP in filings", "e"),
        ],
      },
      {
        heading: "Antifraud",
        refs: [
          R("240.10b-5", "Rule 10b-5"),
          R("240.10b-5", "Rule 10b-5(b)", "b"),
          R("240.10b5-1", "Rule 10b5-1"),
          S("34-act", "section-10", "Exchange Act § 10(b)", "b"),
        ],
      },
    ],
    rules: ["240.10b-5", "240.10b5-1", "229.10"],
    forms: ["8-k"],
    sections: ["34-act/section-10"],
    reading: ["10b"],
  },
  {
    slug: "governance",
    half: "exchange-act",
    nav: "Governance and Sarbanes-Oxley",
    title: "Governance and Sarbanes-Oxley (certifications, controls, and clawbacks)",
    orientation: [
      "Rule 13a-14 and Rule 15d-14 are the Sarbanes-Oxley § 302 certification rules for periodic reports. The § 906 certification is a separate criminal statute, 18 U.S.C. § 1350, and is furnished as an exhibit rather than filed as part of the report.",
      "Rules 13a-15 and 15d-15 require disclosure controls and procedures and, for issuers that must have one, internal control over financial reporting. Rule 10A-3 sets the audit-committee independence and responsibility standards for listed issuers.",
      "Rule 10D-1 requires national securities exchanges to adopt clawback listing standards for erroneously awarded incentive compensation. The exchange listing rules themselves are the exchange’s, not the Commission’s.",
    ],
    groups: [
      {
        heading: "Certifications, controls, and committees",
        refs: [
          R("240.13a-14", "Rule 13a-14 (§ 302)"),
          R("240.15d-14", "Rule 15d-14 (§ 302)"),
          X("https://www.law.cornell.edu/uscode/text/18/1350", "18 U.S.C. § 1350 (§ 906)"),
          R("240.13a-15", "Rule 13a-15, disclosure controls and ICFR"),
          R("240.15d-15", "Rule 15d-15"),
          R("240.10A-3", "Rule 10A-3, audit committees"),
          R("240.10D-1", "Rule 10D-1, clawbacks"),
          S("34-act", "section-10a", "Exchange Act § 10A"),
          S("34-act", "section-10d", "Exchange Act § 10D"),
        ],
      },
    ],
    rules: ["240.13a-14", "240.15d-14", "240.13a-15", "240.10A-3", "240.10D-1"],
    forms: [],
    sections: ["34-act/section-10a", "34-act/section-10d"],
    reading: ["desk"],
  },
  {
    slug: "tender-offers",
    half: "exchange-act",
    nav: "Tender offers and M&A",
    title: "Tender offers and M&A (Regulations 14D, 14E, and M-A)",
    orientation: [
      "A third-party tender offer for a class registered under section 12 is governed by Regulation 14D. Regulation 14E applies to tender offers more broadly, including the all-holders and best-price rules and the time the offer must stay open.",
      "Rule 13e-4 is the issuer tender-offer rule. Rule 13e-3 is the going-private rule. Regulation M-A, Items 1000 through 1016 of Regulation S-K, is the disclosure scheme those filings share.",
      "A stock-for-stock business combination is registered on Form S-4, or Form F-4 for a foreign private issuer, and Rule 145 addresses whether the transaction is an offer to sell.",
    ],
    groups: [
      {
        heading: "Tender offers and going private",
        refs: [
          R("240.14d-1", "Regulation 14D (Rule 14d-1)"),
          R("240.14d-100", "Schedule TO"),
          R("240.14e-1", "Regulation 14E (Rule 14e-1)"),
          R("240.13e-4", "Rule 13e-4"),
          R("240.13e-3", "Rule 13e-3"),
          R("240.13e-100", "Schedule 13E-3"),
        ],
      },
      {
        heading: "Regulation M-A and registration",
        refs: [
          R("229.1001", "Item 1001"),
          R("229.1004", "Item 1004, terms of the transaction"),
          R("229.1011", "Item 1011, additional information"),
          P("229", "Regulation S-K (Items 1000–1016)"),
          F("s-4", "Form S-4"),
          R("239.34", "Form F-4 (§ 239.34)"),
          R("230.145", "Rule 145"),
        ],
      },
    ],
    rules: ["240.14d-1", "240.14d-100", "240.14e-1", "240.13e-3", "240.13e-4", "229.1001", "230.145"],
    forms: ["s-4"],
    sections: [],
    reading: ["sk"],
  },
  {
    slug: "foreign-private-issuers",
    half: "exchange-act",
    nav: "Foreign private issuers",
    title: "Foreign private issuer status (Rules 405 and 3b-4)",
    orientation: [
      "Foreign private issuer status is defined in Securities Act Rule 405 and Exchange Act Rule 3b-4. The test looks at the percentage of U.S. resident shareholders and at whether the business is administered, and the officers and directors are located, in the United States. Status is measured once a year.",
      "An eligible foreign private issuer files Form 20-F instead of Form 10-K, furnishes Form 6-K instead of Form 8-K, and may follow specified home-country practice in lieu of certain Exchange Act rules, including proxy rules and Regulation FD.",
      "Rule 12g3-2(b) is the information-supplying exemption from section 12(g) registration for a foreign private issuer that publishes its home-country disclosure in English. Canadian issuers that qualify for the multijurisdictional disclosure system use Form 40-F and the F-series forms.",
    ],
    groups: [
      {
        heading: "Status",
        refs: [
          R("230.405", "Rule 405"),
          R("240.3b-4", "Rule 3b-4"),
          R("240.12g3-2", "Rule 12g3-2(b)", "b"),
          S("34-act", "section-12", "Exchange Act § 12(g)", "g"),
        ],
      },
      {
        heading: "Reports and MJDS",
        refs: [
          F("20-f", "Form 20-F"),
          F("6-k", "Form 6-K"),
          F("40-f", "Form 40-F"),
          F("f-1", "Form F-1"),
          F("f-3", "Form F-3"),
          R("239.34", "Form F-4 (§ 239.34)"),
          R("239.40", "Form F-10 (§ 239.40)"),
          R("240.3a12-3", "Rule 3a12-3"),
        ],
      },
    ],
    rules: ["230.405", "240.3b-4", "240.12g3-2", "240.3a12-3"],
    forms: ["20-f", "6-k", "40-f", "f-1", "f-3"],
    sections: ["34-act/section-12"],
    reading: ["desk"],
  },
  {
    slug: "deregistration",
    half: "exchange-act",
    nav: "Deregistration",
    title: "Deregistration (Forms 15 and 25)",
    orientation: [
      "Form 15 is the notice that terminates section 12(g) registration, or suspends the duty to file reports under section 13(a) or 15(d), when the holder-of-record tests are met. Rules 12g-4 and 12h-3 are the domestic rules. Rule 12h-6 is the foreign-private-issuer exit rule.",
      "Form 25 is the notice that strikes a class from listing on a national securities exchange and, on the timetable in Rule 12d2-2, withdraws the section 12(b) registration.",
      "Suspension under section 15(d) is not the same thing as termination of a section 12 registration. The duty can spring back if the holder count later exceeds the threshold.",
    ],
    groups: [
      {
        heading: "Forms and rules",
        refs: [
          F("15", "Form 15"),
          F("25", "Form 25"),
          R("240.12g-4", "Rule 12g-4"),
          R("240.12h-3", "Rule 12h-3"),
          R("240.12h-6", "Rule 12h-6"),
          R("240.12d2-2", "Rule 12d2-2"),
          S("34-act", "section-12", "Exchange Act § 12(g)", "g"),
          S("34-act", "section-12", "Exchange Act § 12(b)", "b"),
          S("34-act", "section-15", "Exchange Act § 15(d)", "d"),
        ],
      },
    ],
    rules: ["240.12g-4", "240.12h-3", "240.12h-6", "240.12d2-2"],
    forms: ["15", "25"],
    sections: ["34-act/section-12", "34-act/section-15"],
    reading: ["desk"],
  },
];

const bySlug = new Map(TASKS.map((task) => [task.slug, task]));

export function tasksFor(half: HalfId): Task[] {
  return TASKS.filter((task) => task.half === half);
}

export function findTask(half: HalfId, slug: string): Task | undefined {
  const task = bySlug.get(slug);
  return task && task.half === half ? task : undefined;
}

export function taskPath(task: Task): string {
  return `${task.half}/${task.slug}/`;
}

function owned(task: Task, kind: "rules" | "forms" | "sections", value: string): boolean {
  return task[kind].includes(value);
}

export function taskForRule(id: string): Task | undefined {
  return TASKS.find((task) => owned(task, "rules", id));
}

export function taskForForm(slug: string): Task | undefined {
  return TASKS.find((task) => owned(task, "forms", slug));
}

export function taskForSection(actId: string, slug: string): Task | undefined {
  const key = `${actId}/${slug}`;
  return TASKS.find((task) => owned(task, "sections", key));
}

export function taskReading(task: Task): ReadingLink[] {
  const seen = new Set<string>();
  const links: ReadingLink[] = [];
  for (const name of task.reading) {
    for (const link of readingSet(name)) {
      if (seen.has(link.href)) continue;
      seen.add(link.href);
      links.push(link);
    }
  }
  return links;
}

export function resolveRef(ref: TaskRef): ResolvedLink {
  if ("href" in ref) return { label: ref.label, href: ref.href };
  if ("path" in ref) return { label: ref.label, path: ref.path };
  if ("form" in ref) {
    const form = findForm(ref.form);
    return form ? { label: ref.label, path: `forms/${form.slug}/` } : { label: ref.label, href: "https://www.sec.gov/forms" };
  }
  if ("act" in ref) {
    const section = findSection(ref.act, ref.slug);
    if (!section) return { label: ref.label, href: "https://uscode.house.gov/" };
    return { label: ref.label, path: ref.hash ? `${section.path}#${ref.hash}` : section.path };
  }
  if ("part" in ref) {
    const known = loadManifest().parts.some((part) => part.part === ref.part);
    if (!known) return { label: ref.label, href: ecfrPart(ref.part) };
    const half = ref.part === "227" || ref.part === "230" || ref.part === "239" ? "securities-act" : "exchange-act";
    return { label: ref.label, path: `${half}/rules/17-cfr-${ref.part}/` };
  }
  const found = ruleTarget(ref.rule, ref.anchor);
  if (found) return { label: ref.label, path: found.path };
  return { label: ref.label, href: ecfrSection(ref.rule) };
}

export function halfName(id: HalfId): string {
  return halfById(id).label;
}
