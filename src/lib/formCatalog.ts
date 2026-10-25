/** Guide pages for the forms a capital-markets practice actually opens.
 * Instruction PDFs are linked, not copied. */

export interface Pointer {
  label: string;
  path?: string;
  href?: string;
}

export interface FormGuide {
  slug: string;
  name: string;
  aka?: string;
  purpose: string;
  who: string;
  cfr: Pointer;
  rules: Pointer[];
  statutes: Pointer[];
  pdf?: Pointer;
  edgarForms: string;
  items?: { item: string; title: string; rules: Pointer[] }[];
}

const R = (path: string, label: string): Pointer => ({ path, label });
const E = (href: string, label: string): Pointer => ({ href, label });

export const FORMS: FormGuide[] = [
  {
    slug: "s-1",
    name: "Form S-1",
    purpose:
      "The long-form registration statement for a public offering of securities when no shorter form is available. It carries the prospectus and the Part II information Securities Act § 7 and § 10 require.",
    who: "A domestic issuer registering an offering under the Securities Act, including most initial public offerings.",
    cfr: R("rules/17-cfr-239/section-11/", "Form S-1 (§ 239.11)"),
    rules: [
      R("rules/17-cfr-229/", "Regulation S-K"),
      R("rules/17-cfr-210/", "Regulation S-X"),
      R("rules/17-cfr-230/rule-405/", "Rule 405"),
    ],
    statutes: [
      R("33-act/section-5/", "Securities Act § 5"),
      R("33-act/section-7/", "Securities Act § 7"),
      R("33-act/section-10/", "Securities Act § 10"),
    ],
    pdf: E("https://www.sec.gov/files/forms-1.pdf", "Form S-1 (sec.gov PDF)"),
    edgarForms: "S-1,S-1/A",
  },
  {
    slug: "s-3",
    name: "Form S-3",
    purpose:
      "The short-form registration statement for issuers that already report under the Exchange Act and meet the form’s registrant and transaction tests. It is the usual form for a shelf under Rule 415.",
    who: "A domestic issuer eligible under the Form S-3 instructions, registering securities for its own account or, in some cases, for selling holders.",
    cfr: R("rules/17-cfr-239/section-13/", "Form S-3 (§ 239.13)"),
    rules: [
      R("rules/17-cfr-230/rule-415/", "Rule 415"),
      R("rules/17-cfr-230/rule-430b/", "Rule 430B"),
      R("rules/17-cfr-229/item-512/", "Item 512"),
      R("rules/17-cfr-230/rule-405/", "Rule 405"),
    ],
    statutes: [R("33-act/section-5/", "Securities Act § 5"), R("33-act/section-10/", "Securities Act § 10")],
    pdf: E("https://www.sec.gov/files/forms-3.pdf", "Form S-3 (sec.gov PDF)"),
    edgarForms: "S-3,S-3/A,S-3ASR",
  },
  {
    slug: "s-4",
    name: "Form S-4",
    purpose:
      "The registration statement for securities issued in a business combination. The prospectus is often the same document that goes to security holders as a proxy or information statement.",
    who: "An issuer registering securities offered in a merger, exchange offer, or other business combination.",
    cfr: R("rules/17-cfr-239/section-25/", "Form S-4 (§ 239.25)"),
    rules: [
      R("rules/17-cfr-230/rule-145/", "Rule 145"),
      R("rules/17-cfr-229/", "Regulation S-K"),
      R("rules/17-cfr-210/rule-3-05/", "Rule 3-05"),
    ],
    statutes: [R("33-act/section-5/", "Securities Act § 5")],
    pdf: E("https://www.sec.gov/files/forms-4.pdf", "Form S-4 (sec.gov PDF)"),
    edgarForms: "S-4,S-4/A",
  },
  {
    slug: "s-8",
    name: "Form S-8",
    purpose:
      "The registration statement for securities offered to employees under an employee benefit plan. It becomes effective on filing under Rule 462(a), and the plan materials can serve as the prospectus under Rule 428.",
    who: "An issuer that is current in its Exchange Act reporting and is offering its securities, or interests in a plan, to employees, directors, and the other persons the form allows.",
    cfr: R("rules/17-cfr-239/section-16b/", "Form S-8 (§ 239.16b)"),
    rules: [
      R("rules/17-cfr-230/rule-405/", "Rule 405"),
      R("rules/17-cfr-230/rule-428/", "Rule 428"),
      R("rules/17-cfr-230/rule-457/#h", "Rule 457(h)"),
      R("rules/17-cfr-230/rule-462/#a", "Rule 462(a)"),
      R("rules/17-cfr-230/rule-701/#d", "Rule 701(d)"),
    ],
    statutes: [R("33-act/section-5/", "Securities Act § 5")],
    pdf: E("https://www.sec.gov/files/forms-8.pdf", "Form S-8 (sec.gov PDF)"),
    edgarForms: "S-8,S-8/A",
  },
  {
    slug: "f-1",
    name: "Form F-1",
    purpose:
      "The long-form registration statement for a foreign private issuer. Disclosure follows Form 20-F rather than the domestic Regulation S-K items, except where the form says otherwise.",
    who: "A foreign private issuer, as defined in Rule 405, registering an offering under the Securities Act.",
    cfr: R("rules/17-cfr-239/section-31/", "Form F-1 (§ 239.31)"),
    rules: [R("rules/17-cfr-230/rule-405/", "Rule 405"), R("rules/17-cfr-249/section-220f/", "Form 20-F (§ 249.220f)")],
    statutes: [R("33-act/section-5/", "Securities Act § 5")],
    pdf: E("https://www.sec.gov/files/formf-1.pdf", "Form F-1 (sec.gov PDF)"),
    edgarForms: "F-1,F-1/A",
  },
  {
    slug: "f-3",
    name: "Form F-3",
    purpose:
      "The short-form registration statement for a foreign private issuer that already reports and meets the form’s registrant and transaction tests. It is the foreign counterpart of Form S-3.",
    who: "An eligible foreign private issuer registering securities for its own account or for selling holders.",
    cfr: R("rules/17-cfr-239/section-33/", "Form F-3 (§ 239.33)"),
    rules: [R("rules/17-cfr-230/rule-415/", "Rule 415"), R("rules/17-cfr-230/rule-405/", "Rule 405")],
    statutes: [R("33-act/section-5/", "Securities Act § 5")],
    pdf: E("https://www.sec.gov/files/formf-3.pdf", "Form F-3 (sec.gov PDF)"),
    edgarForms: "F-3,F-3/A,F-3ASR",
  },
  {
    slug: "1-a",
    name: "Form 1-A",
    purpose:
      "The offering statement for a Regulation A exemption. It is not a Securities Act registration statement. Tier 1 and Tier 2 have different offering limits and ongoing-report duties.",
    who: "An issuer eligible under Rule 251 that is conducting a Regulation A offering.",
    cfr: R("rules/17-cfr-239/section-90/", "Form 1-A (§ 239.90)"),
    rules: [R("rules/17-cfr-230/rule-251/", "Rule 251"), R("rules/17-cfr-230/rule-252/", "Rule 252")],
    statutes: [R("33-act/section-3/#b", "Securities Act § 3(b)")],
    pdf: E("https://www.sec.gov/files/form1_1.pdf", "Form 1-A (sec.gov PDF)"),
    edgarForms: "1-A,1-A/A,1-A POS",
  },
  {
    slug: "10-k",
    name: "Form 10-K",
    purpose:
      "The annual report for an issuer with a class of securities registered under Exchange Act § 12 or with a reporting duty under § 15(d). The narrative is Regulation S-K. The financial statements are Regulation S-X.",
    who: "A domestic issuer required to file under Rule 13a-1 or Rule 15d-1. Large accelerated, accelerated, and other filers have different due dates, set out in the form.",
    cfr: R("rules/17-cfr-249/section-310/", "Form 10-K (§ 249.310)"),
    rules: [
      R("rules/17-cfr-240/rule-13a-1/", "Rule 13a-1"),
      R("rules/17-cfr-240/rule-15d-1/", "Rule 15d-1"),
      R("rules/17-cfr-229/", "Regulation S-K"),
      R("rules/17-cfr-210/", "Regulation S-X"),
    ],
    statutes: [R("34-act/section-13/", "Exchange Act § 13(a)"), R("34-act/section-15/", "Exchange Act § 15(d)")],
    pdf: E("https://www.sec.gov/files/form10-k.pdf", "Form 10-K (sec.gov PDF)"),
    edgarForms: "10-K,10-K/A",
  },
  {
    slug: "10-q",
    name: "Form 10-Q",
    purpose:
      "The quarterly report for the first three fiscal quarters. It covers interim financial statements and the updates the form specifies. There is no Form 10-Q for the fourth quarter.",
    who: "A domestic issuer required to file under Rule 13a-13 or Rule 15d-13.",
    cfr: R("rules/17-cfr-249/section-308a/", "Form 10-Q (§ 249.308a)"),
    rules: [
      R("rules/17-cfr-240/rule-13a-13/", "Rule 13a-13"),
      R("rules/17-cfr-240/rule-15d-13/", "Rule 15d-13"),
      R("rules/17-cfr-210/rule-10-01/", "Rule 10-01"),
    ],
    statutes: [R("34-act/section-13/", "Exchange Act § 13(a)"), R("34-act/section-15/", "Exchange Act § 15(d)")],
    pdf: E("https://www.sec.gov/files/form10-q.pdf", "Form 10-Q (sec.gov PDF)"),
    edgarForms: "10-Q,10-Q/A",
  },
  {
    slug: "8-k",
    name: "Form 8-K",
    purpose:
      "The current report. A domestic issuer files it when one of the specified events happens, generally within four business days, and may also use it to furnish information under Regulation FD.",
    who: "An issuer with a reporting duty under Exchange Act § 13(a) or § 15(d), filing under Rule 13a-11 or Rule 15d-11.",
    cfr: R("rules/17-cfr-249/section-308/", "Form 8-K (§ 249.308)"),
    rules: [R("rules/17-cfr-240/rule-13a-11/", "Rule 13a-11"), R("rules/17-cfr-240/rule-15d-11/", "Rule 15d-11")],
    statutes: [R("34-act/section-13/", "Exchange Act § 13(a)"), R("34-act/section-15/", "Exchange Act § 15(d)")],
    pdf: E("https://www.sec.gov/files/form8-k.pdf", "Form 8-K (sec.gov PDF)"),
    edgarForms: "8-K,8-K/A",
    items: [
      { item: "1.01", title: "Entry into a Material Definitive Agreement", rules: [R("rules/17-cfr-229/item-601/b/#b-10", "Item 601(b)(10)")] },
      { item: "1.02", title: "Termination of a Material Definitive Agreement", rules: [R("rules/17-cfr-229/item-601/b/#b-10", "Item 601(b)(10)")] },
      { item: "1.03", title: "Bankruptcy or Receivership", rules: [] },
      { item: "1.04", title: "Mine Safety — Reporting of Shutdowns and Patterns of Violations", rules: [R("rules/17-cfr-229/item-104/", "Item 104")] },
      { item: "1.05", title: "Material Cybersecurity Incidents", rules: [R("rules/17-cfr-229/item-106/", "Item 106")] },
      {
        item: "2.01",
        title: "Completion of Acquisition or Disposition of Assets",
        rules: [R("rules/17-cfr-210/rule-3-05/", "Rule 3-05"), R("rules/17-cfr-210/rule-11-01/", "Rule 11-01")],
      },
      { item: "2.02", title: "Results of Operations and Financial Condition", rules: [R("rules/17-cfr-229/item-10/#e", "Item 10(e)")] },
      {
        item: "2.03",
        title: "Creation of a Direct Financial Obligation or an Obligation under an Off-Balance Sheet Arrangement",
        rules: [R("rules/17-cfr-229/item-303/", "Item 303")],
      },
      {
        item: "2.04",
        title: "Triggering Events That Accelerate or Increase a Direct Financial Obligation or an Obligation under an Off-Balance Sheet Arrangement",
        rules: [R("rules/17-cfr-229/item-303/", "Item 303")],
      },
      { item: "2.05", title: "Costs Associated with Exit or Disposal Activities", rules: [] },
      { item: "2.06", title: "Material Impairments", rules: [] },
      {
        item: "3.01",
        title: "Notice of Delisting or Failure to Satisfy a Continued Listing Rule or Standard; Transfer of Listing",
        rules: [R("rules/17-cfr-240/rule-12d2-2/", "Rule 12d2-2")],
      },
      { item: "3.02", title: "Unregistered Sales of Equity Securities", rules: [R("rules/17-cfr-229/item-701/", "Item 701")] },
      { item: "3.03", title: "Material Modification to Rights of Security Holders", rules: [R("rules/17-cfr-229/item-202/", "Item 202")] },
      { item: "4.01", title: "Changes in Registrant’s Certifying Accountant", rules: [R("rules/17-cfr-229/item-304/", "Item 304")] },
      {
        item: "4.02",
        title: "Non-Reliance on Previously Issued Financial Statements or a Related Audit Report or Completed Interim Review",
        rules: [],
      },
      { item: "5.01", title: "Changes in Control of Registrant", rules: [R("rules/17-cfr-240/rule-13d-1/", "Rule 13d-1")] },
      {
        item: "5.02",
        title: "Departure of Directors or Certain Officers; Election of Directors; Appointment of Certain Officers; Compensatory Arrangements of Certain Officers",
        rules: [
          R("rules/17-cfr-229/item-401/", "Item 401"),
          R("rules/17-cfr-229/item-402/", "Item 402"),
          R("rules/17-cfr-229/item-404/", "Item 404"),
        ],
      },
      { item: "5.03", title: "Amendments to Articles of Incorporation or Bylaws; Change in Fiscal Year", rules: [R("rules/17-cfr-229/item-601/b/#b-3", "Item 601(b)(3)")] },
      {
        item: "5.04",
        title: "Temporary Suspension of Trading Under Registrant’s Employee Benefit Plans",
        rules: [E("https://www.ecfr.gov/current/title-17/chapter-II/part-245", "Regulation BTR (17 CFR Part 245)")],
      },
      {
        item: "5.05",
        title: "Amendments to the Registrant’s Code of Ethics, or Waiver of a Provision of the Code of Ethics",
        rules: [R("rules/17-cfr-229/item-406/", "Item 406")],
      },
      { item: "5.06", title: "Change in Shell Company Status", rules: [R("rules/17-cfr-240/rule-12b-2/", "Rule 12b-2")] },
      { item: "5.07", title: "Submission of Matters to a Vote of Security Holders", rules: [R("forms/def-14a/", "Schedule 14A")] },
      { item: "5.08", title: "Shareholder Director Nominations", rules: [R("rules/17-cfr-240/rule-14a-19/", "Rule 14a-19")] },
      { item: "6.01", title: "ABS Informational and Computational Material", rules: [R("rules/17-cfr-229/item-1101/", "Item 1101")] },
      { item: "6.02", title: "Change of Servicer or Trustee", rules: [R("rules/17-cfr-229/item-1101/", "Item 1101")] },
      { item: "6.03", title: "Change in Credit Enhancement or Other External Support", rules: [R("rules/17-cfr-229/item-1101/", "Item 1101")] },
      { item: "6.04", title: "Failure to Make a Required Distribution", rules: [R("rules/17-cfr-229/item-1101/", "Item 1101")] },
      { item: "6.05", title: "Securities Act Updating Disclosure", rules: [R("rules/17-cfr-230/rule-424/", "Rule 424")] },
      { item: "6.06", title: "Static Pool", rules: [R("rules/17-cfr-229/item-1101/", "Item 1101")] },
      {
        item: "7.01",
        title: "Regulation FD Disclosure",
        rules: [E("https://www.ecfr.gov/current/title-17/chapter-II/part-243", "Regulation FD (17 CFR Part 243)")],
      },
      { item: "8.01", title: "Other Events", rules: [] },
      {
        item: "9.01",
        title: "Financial Statements and Exhibits",
        rules: [R("rules/17-cfr-210/rule-3-05/", "Rule 3-05"), R("rules/17-cfr-229/item-601/", "Item 601")],
      },
    ],
  },
  {
    slug: "20-f",
    name: "Form 20-F",
    purpose:
      "The registration statement and annual report for most foreign private issuers. It is also the disclosure form that Form F-1 and Form F-3 incorporate.",
    who: "A foreign private issuer registering a class under Exchange Act § 12 or filing the annual report required by § 13(a) or § 15(d).",
    cfr: R("rules/17-cfr-249/section-220f/", "Form 20-F (§ 249.220f)"),
    rules: [R("rules/17-cfr-240/rule-13a-1/", "Rule 13a-1"), R("rules/17-cfr-230/rule-405/", "Rule 405")],
    statutes: [R("34-act/section-12/", "Exchange Act § 12"), R("34-act/section-13/", "Exchange Act § 13(a)")],
    pdf: E("https://www.sec.gov/files/form20-f.pdf", "Form 20-F (sec.gov PDF)"),
    edgarForms: "20-F,20-F/A",
  },
  {
    slug: "6-k",
    name: "Form 6-K",
    purpose:
      "The report a foreign private issuer furnishes for material information it makes public, or is required to make public, in its home country, or that it files with its home exchange, between annual reports.",
    who: "A foreign private issuer reporting under Rule 13a-16 or Rule 15d-16.",
    cfr: R("rules/17-cfr-249/section-306/", "Form 6-K (§ 249.306)"),
    rules: [R("rules/17-cfr-240/rule-13a-16/", "Rule 13a-16"), R("rules/17-cfr-240/rule-15d-16/", "Rule 15d-16")],
    statutes: [R("34-act/section-13/", "Exchange Act § 13(a)")],
    pdf: E("https://www.sec.gov/files/form6-k.pdf", "Form 6-K (sec.gov PDF)"),
    edgarForms: "6-K,6-K/A",
  },
  {
    slug: "40-f",
    name: "Form 40-F",
    purpose:
      "The registration statement and annual report for an eligible Canadian issuer under the multijurisdictional disclosure system. It wraps the issuer’s Canadian disclosure.",
    who: "A Canadian issuer that meets the Form 40-F eligibility tests.",
    cfr: R("rules/17-cfr-249/section-240f/", "Form 40-F (§ 249.240f)"),
    rules: [R("rules/17-cfr-240/rule-13a-3/", "Rule 13a-3")],
    statutes: [R("34-act/section-12/", "Exchange Act § 12"), R("34-act/section-13/", "Exchange Act § 13(a)")],
    pdf: E("https://www.sec.gov/files/form40-f.pdf", "Form 40-F (sec.gov PDF)"),
    edgarForms: "40-F,40-F/A",
  },
  {
    slug: "11-k",
    name: "Form 11-K",
    purpose:
      "The annual report for an employee stock purchase, savings, or similar plan whose interests are registered under the Securities Act. Plan financial statements follow Article 6A of Regulation S-X, with an ERISA alternative.",
    who: "The issuer of the plan interests, even when the employer already files its own annual report. Rule 15d-21 allows the plan information to be included in the employer’s report in some cases.",
    cfr: R("rules/17-cfr-249/section-311/", "Form 11-K (§ 249.311)"),
    rules: [R("rules/17-cfr-240/rule-15d-21/", "Rule 15d-21"), R("rules/17-cfr-210/", "Regulation S-X")],
    statutes: [R("34-act/section-15/", "Exchange Act § 15(d)")],
    pdf: E("https://www.sec.gov/files/form11-k.pdf", "Form 11-K (sec.gov PDF)"),
    edgarForms: "11-K,11-K/A",
  },
  {
    slug: "def-14a",
    name: "Schedule 14A",
    aka: "DEF 14A",
    purpose:
      "The information required in a proxy statement. The definitive proxy statement is filed on EDGAR as DEF 14A. Preliminary material, when required, is filed as PRE 14A.",
    who: "A person soliciting a proxy for a security registered under Exchange Act § 12, other than a solicitation exempt under Rule 14a-2.",
    cfr: R("rules/17-cfr-240/rule-14a-101/", "Schedule 14A (§ 240.14a-101)"),
    rules: [
      R("rules/17-cfr-240/rule-14a-3/", "Rule 14a-3"),
      R("rules/17-cfr-240/rule-14a-6/", "Rule 14a-6"),
      R("rules/17-cfr-240/rule-14a-8/", "Rule 14a-8"),
      R("rules/17-cfr-240/rule-14a-9/", "Rule 14a-9"),
    ],
    statutes: [R("34-act/section-14/", "Exchange Act § 14(a)")],
    edgarForms: "DEF 14A,DEFA14A,PRE 14A",
  },
  {
    slug: "schedule-13d",
    name: "Schedule 13D",
    purpose:
      "The statement a person files after acquiring beneficial ownership of more than 5 percent of a class of voting equity securities registered under Exchange Act § 12. Amendments are filed as Schedule 13D/A.",
    who: "A beneficial owner who is not eligible to use Schedule 13G, or who is no longer passive.",
    cfr: R("rules/17-cfr-240/rule-13d-101/", "Schedule 13D (§ 240.13d-101)"),
    rules: [R("rules/17-cfr-240/rule-13d-1/", "Rule 13d-1"), R("rules/17-cfr-240/rule-13d-2/", "Rule 13d-2")],
    statutes: [R("34-act/section-13/", "Exchange Act § 13(d)")],
    edgarForms: "SC 13D,SC 13D/A",
  },
  {
    slug: "schedule-13g",
    name: "Schedule 13G",
    purpose:
      "The short-form beneficial-ownership statement for qualified institutional investors, passive investors, and exempt investors under Rule 13d-1.",
    who: "A person who beneficially owns more than 5 percent and meets one of the Rule 13d-1 tests for using Schedule 13G instead of Schedule 13D.",
    cfr: R("rules/17-cfr-240/rule-13d-102/", "Schedule 13G (§ 240.13d-102)"),
    rules: [R("rules/17-cfr-240/rule-13d-1/", "Rule 13d-1"), R("rules/17-cfr-240/rule-13d-2/", "Rule 13d-2")],
    statutes: [R("34-act/section-13/", "Exchange Act § 13(d)")],
    edgarForms: "SC 13G,SC 13G/A",
  },
  {
    slug: "3",
    name: "Form 3",
    purpose: "The initial statement of beneficial ownership. A new director, officer, or more-than-10-percent holder files it to report holdings when Section 16 starts to apply.",
    who: "A director, officer, or beneficial owner of more than 10 percent of a class of equity security registered under Exchange Act § 12.",
    cfr: R("rules/17-cfr-249/section-103/", "Form 3 (§ 249.103)"),
    rules: [R("rules/17-cfr-240/rule-16a-3/", "Rule 16a-3"), R("rules/17-cfr-240/rule-16a-1/", "Rule 16a-1")],
    statutes: [R("34-act/section-16/", "Exchange Act § 16(a)")],
    pdf: E("https://www.sec.gov/files/form3.pdf", "Form 3 (sec.gov PDF)"),
    edgarForms: "3,3/A",
  },
  {
    slug: "4",
    name: "Form 4",
    purpose: "The statement of changes in beneficial ownership. Most transactions by a Section 16 insider are reported on Form 4 before the end of the second business day after the trade.",
    who: "A director, officer, or more-than-10-percent holder reporting a change required by Rule 16a-3.",
    cfr: R("rules/17-cfr-249/section-104/", "Form 4 (§ 249.104)"),
    rules: [R("rules/17-cfr-240/rule-16a-3/", "Rule 16a-3"), R("rules/17-cfr-240/rule-16b-3/", "Rule 16b-3")],
    statutes: [R("34-act/section-16/", "Exchange Act § 16(a)")],
    pdf: E("https://www.sec.gov/files/form4.pdf", "Form 4 (sec.gov PDF)"),
    edgarForms: "4,4/A",
  },
  {
    slug: "5",
    name: "Form 5",
    purpose: "The annual statement of beneficial ownership. It picks up transactions and holdings that were exempt from Form 4 and were not reported voluntarily during the year.",
    who: "A Section 16 insider who has a reportable transaction or holding that was not already reported on Form 4. It is due 45 days after the issuer’s fiscal year-end.",
    cfr: R("rules/17-cfr-249/section-105/", "Form 5 (§ 249.105)"),
    rules: [R("rules/17-cfr-240/rule-16a-3/", "Rule 16a-3")],
    statutes: [R("34-act/section-16/", "Exchange Act § 16(a)")],
    pdf: E("https://www.sec.gov/files/form5.pdf", "Form 5 (sec.gov PDF)"),
    edgarForms: "5,5/A",
  },
  {
    slug: "144",
    name: "Form 144",
    purpose:
      "The notice of a proposed sale under Rule 144. It is filed when an affiliate, or a person selling restricted securities, intends to sell under the rule and the conditions in the form are met.",
    who: "The person for whose account the securities are to be sold.",
    cfr: R("rules/17-cfr-239/section-144/", "Form 144 (§ 239.144)"),
    rules: [R("rules/17-cfr-230/rule-144/", "Rule 144")],
    statutes: [R("33-act/section-4/", "Securities Act § 4(a)(1)")],
    pdf: E("https://www.sec.gov/files/form144.pdf", "Form 144 (sec.gov PDF)"),
    edgarForms: "144,144/A",
  },
  {
    slug: "d",
    name: "Form D",
    purpose:
      "The notice of an exempt offering, filed for a sale that relies on Regulation D or § 4(a)(5). It is a notice, not a registration statement, and it is generally due within 15 days after the first sale.",
    who: "Each issuer of the securities being sold in reliance on Rule 504, Rule 506, or Securities Act § 4(a)(5).",
    cfr: R("rules/17-cfr-239/section-500/", "Form D (§ 239.500)"),
    rules: [
      R("rules/17-cfr-230/rule-503/", "Rule 503"),
      R("rules/17-cfr-230/rule-504/", "Rule 504"),
      R("rules/17-cfr-230/rule-506/", "Rule 506"),
    ],
    statutes: [R("33-act/section-4/", "Securities Act § 4(a)(5)")],
    pdf: E("https://www.sec.gov/files/FormD.pdf", "Form D (sec.gov PDF)"),
    edgarForms: "D,D/A",
  },
  {
    slug: "8-a",
    name: "Form 8-A",
    purpose:
      "The short form for registering a class of securities under Exchange Act § 12(b) or § 12(g) when the issuer already reports, or is registering the class alongside a Securities Act offering.",
    who: "An issuer that is eligible under the Form 8-A instructions. Listing on a national securities exchange is filed as 8-A12B. Section 12(g) registration is filed as 8-A12G.",
    cfr: R("rules/17-cfr-249/section-208a/", "Form 8-A (§ 249.208a)"),
    rules: [R("rules/17-cfr-240/rule-12b-2/", "Rule 12b-2")],
    statutes: [R("34-act/section-12/", "Exchange Act § 12")],
    pdf: E("https://www.sec.gov/files/form8a.pdf", "Form 8-A (sec.gov PDF)"),
    edgarForms: "8-A12B,8-A12B/A,8-A12G,8-A12G/A",
  },
  {
    slug: "15",
    name: "Form 15",
    purpose:
      "The certification and notice that terminates § 12(g) registration or suspends the duty to file reports under § 13(a) or § 15(d), when the holder-of-record tests in the cited rules are met.",
    who: "An issuer relying on Rule 12g-4, Rule 12h-3, Rule 15d-6, or Rule 15d-22.",
    cfr: R("rules/17-cfr-249/section-323/", "Form 15 (§ 249.323)"),
    rules: [
      R("rules/17-cfr-240/rule-12g-4/", "Rule 12g-4"),
      R("rules/17-cfr-240/rule-12h-3/", "Rule 12h-3"),
      R("rules/17-cfr-240/rule-15d-6/", "Rule 15d-6"),
    ],
    statutes: [R("34-act/section-12/", "Exchange Act § 12(g)"), R("34-act/section-15/", "Exchange Act § 15(d)")],
    pdf: E("https://www.sec.gov/files/form15.pdf", "Form 15 (sec.gov PDF)"),
    edgarForms: "15-12G,15-12G/A,15-12B,15-12B/A,15-15D,15-15D/A",
  },
  {
    slug: "25",
    name: "Form 25",
    purpose:
      "The notification that removes a class of securities from listing on a national securities exchange and, on the timetable in Rule 12d2-2, withdraws the § 12(b) registration.",
    who: "The exchange, or the issuer in a voluntary withdrawal, filing under Rule 12d2-2.",
    cfr: R("rules/17-cfr-249/section-25/", "Form 25 (§ 249.25)"),
    rules: [R("rules/17-cfr-240/rule-12d2-2/", "Rule 12d2-2")],
    statutes: [R("34-act/section-12/", "Exchange Act § 12(b)")],
    pdf: E("https://www.sec.gov/files/form25.pdf", "Form 25 (sec.gov PDF)"),
    edgarForms: "25-NSE,25-NSE/A",
  },
];

export const FORM_GROUPS: { id: string; heading: string; slugs: string[] }[] = [
  { id: "registration", heading: "Securities Act registration", slugs: ["s-1", "s-3", "s-4", "s-8", "f-1", "f-3", "1-a"] },
  { id: "reports", heading: "Exchange Act reports", slugs: ["10-k", "10-q", "8-k", "20-f", "6-k", "40-f", "11-k"] },
  { id: "proxy", heading: "Proxy and beneficial ownership", slugs: ["def-14a", "schedule-13d", "schedule-13g"] },
  { id: "section-16", heading: "Section 16", slugs: ["3", "4", "5"] },
  { id: "other", heading: "Notices and other forms", slugs: ["144", "d", "8-a", "15", "25"] },
];

const bySlug = new Map(FORMS.map((form) => [form.slug, form]));

export function findForm(slug: string): FormGuide | undefined {
  return bySlug.get(slug);
}

export function formSearchUrl(forms: string): string {
  const params = new URLSearchParams();
  params.set("category", "custom");
  params.set("forms", forms);
  params.set("dateRange", "all");
  return `https://www.sec.gov/edgar/search/#/${params.toString()}`;
}

export function formNeighbors(slug: string): { prev: FormGuide | null; next: FormGuide | null } {
  const order = FORM_GROUPS.flatMap((group) => group.slugs);
  const index = order.indexOf(slug);
  return {
    prev: index > 0 ? bySlug.get(order[index - 1]) || null : null,
    next: index >= 0 && index < order.length - 1 ? bySlug.get(order[index + 1]) || null : null,
  };
}
