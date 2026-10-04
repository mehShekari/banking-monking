// Page copy, from docs/پژوهشیار چیست؟ (the member-facing brochure) and docs/پژوهش یار دانشمند (the partnership proposal).
// Verbatim: hook («انتخاب شده‌اید، چون متفاوتید»), the payoff caption, finale sub, and endCredits
//   (the brochure's closing «متن پیشنهادی بروشور»; only spacing/ZWNJ typos fixed).
// Adapted (tense/person only): the seven stage lines (stage 0 from the proposal's «فردی که امروز در «راهی‌شو»
//   برگزیده می‌شود…»), caption 1 (phase-one purpose), the achievement caption (the brochure's «پول بیشتر الزاماً
//   جایگاه بالاتر نمی‌سازد؛ دستاورد بیشتر می‌تواند جایگاه بالاتر بسازد», halves swapped), the doors line,
//   the four doors («فرصت …» list), finale title («از دانش، تا اثر»).
// Only ctaHref is DRAFT.

export const credits = {
  /** One name per partner, in the braid's order. Join with " · " where one line is needed. */
  issuers: ["مؤسسه تحقیق و توسعه دانشمند", "بانک سینا", "گرین‌بانک"],
  present: "تقدیم می‌کنند",
};

/** First words of the film, risen at the end of the autoplayed intro. */
export const hook = { at: 3.3, out: 7.2, title: "انتخاب شده‌اید، چون متفاوتید." };

/** Captions that rise out of the dark at sequence times `at` → `out` (seconds). */
export const captions: { at: number; out: number; title: string; body?: string }[] = [
  {
    at: 11.4,
    out: 14.0,
    title: "کارتی برای جامعهٔ منتخب دانشمند.",
    body: "برای دریافت جوایز، پژوهانه‌ها و گرنت‌های مؤسسه تحقیق و توسعه دانشمند؛ با بانک سینا و گرین‌بانک.",
  },
  {
    at: 29.6,
    out: 31.6,
    title: "دستاورد بیشتر می‌تواند جایگاه بالاتر بسازد.",
    body: "در پژوهش‌یار، پول بیشتر الزاماً جایگاه بالاتر نمی‌سازد.",
  },
  {
    at: 31.8,
    out: 33.8,
    title: "پژوهش‌یار برای همراهی با همین مسیر طراحی می‌شود.",
    body: "از دریافت اولین حمایت، تا ساختن اولین کسب‌وکار.",
  },
  { at: 34.4, out: 36.6, title: "ارزش پژوهش‌یار، در درهایی است که می‌تواند به روی شما باز کند." },
];

/** The seven stages of the path, in STAGES order (path.ts). */
export const stages = [
  { title: "استعداد", line: "امروز، در «راهی‌شو» برگزیده می‌شوید." },
  { title: "پژوهش", line: "فردا، یک پژوهشگرید." },
  { title: "فناوری", line: "چند ماه بعد، نمونهٔ اولیهٔ یک فناوری را می‌سازید." },
  { title: "سرمایه", line: "برای توسعهٔ محصول، به سرمایه نیاز دارید." },
  { title: "بازار", line: "و فناوری‌تان راهی به بازار پیدا می‌کند." },
  { title: "کسب‌وکار", line: "چند سال بعد، صاحب یک شرکت فناورانه‌اید." },
  { title: "اثر", line: "از دانش، تا اثر." },
];

/** One door each, in DOORS_Z order (storyboard.ts). */
export const doors = ["فرصت پژوهش", "فرصت همکاری با صنعت", "فرصت تأمین مالی", "فرصت دیده‌شدن"];

export const finale = {
  at: 42.0,
  title: "از دانش، تا اثر.",
  sub: "پژوهش‌یار؛ امتیازِ انتخاب شدن.",
  cta: "ورود به مسیر پژوهش‌یار",
  ctaHref: "#", // DRAFT: real destination undecided. The card is issued only to Daneshmand's selected people, never "request card".
  hint: "کارت را بکشید تا بچرخد · نگه دارید تا مدارش روشن شود",
};

/** The film rail: where each act begins. */
export const shots = [
  { at: 4.2, name: "ظهور" },
  { at: 11.0, name: "پژوهش‌یار" },
  { at: 14.4, name: "مسیر" },
  { at: 32.4, name: "درها" },
  { at: 40.4, name: "اثر" },
];

/**
 * Closing credits: the brochure's own closing text, verbatim. Privileges are worded as the
 * brochure words them («به‌تدریج…»), so nothing on the roadmap reads as available today.
 */
export const endCredits = {
  title: "پژوهش‌یار؛ امتیازِ انتخاب شدن",
  lead: [
    "پژوهش‌یار فقط یک کارت بانکی نیست.",
    "این کارت برای افرادی طراحی شده است که بر اساس ضوابط مؤسسه دانشمند وارد یکی از مسیرهای علمی، پژوهشی، فناورانه یا حمایتی دانشمند شده‌اند.",
    "و ما معتقدیم این انتخاب باید تفاوتی واقعی در زندگی شما ایجاد کند.",
    "به همین دلیل، پژوهش‌یار به‌تدریج مجموعه‌ای از امتیازات اختصاصی را در اختیار اعضای واجد شرایط خود قرار خواهد داد:",
  ],
  privileges: [
    {
      title: "اعتبار و خرید اقساطی با شرایط اختصاصی",
      line: "برای خرید تجهیزات حرفه‌ای، لپ‌تاپ، ابزارهای مورد نیاز و سایر کالاها و خدمات منتخب.",
    },
    { title: "تخفیف و بازگشت وجه", line: "در شبکه‌ای منتخب از کالاها و خدمات مورد استفاده در زندگی روزمره." },
    { title: "خدمات بیمه و سلامت", line: "با شرایط گروهی و مزایای اختصاصی پژوهش‌یار." },
    {
      title: "سفر، اقامت و گردشگری",
      line: "با استفاده از ظرفیت شرکای پژوهش‌یار و نرخ‌ها و بسته‌های قراردادی منتخب.",
    },
    {
      title: "آموزش و توسعه فردی",
      line: "از دوره‌های تخصصی و مهارتی تا آموزش زبان، فناوری، هوش مصنوعی و کارآفرینی.",
    },
    {
      title: "خدمات حرفه‌ای",
      line: "از آزمایشگاه و فضای کار تا خدمات حقوقی، مالکیت فکری، ثبت شرکت و توسعه کسب‌وکار.",
    },
    {
      title: "فرصت‌های مالی و سرمایه‌گذاری",
      line: "از ابزارهای مدیریت و حفظ ارزش دارایی تا تأمین مالی پروژه‌ها و کسب‌وکارهای واجد شرایط.",
    },
    {
      title: "امتیازات ویژه برای پژوهش‌یاران برتر",
      line: "با افزایش دستاورد و اثرگذاری شما، سطح خدمات و فرصت‌های قابل دسترس نیز می‌تواند افزایش یابد.",
    },
  ],
  access: {
    lead: [
      "اما مهم‌ترین امتیاز پژوهش‌یار، چیزی فراتر از تخفیف است.",
      "پژوهش‌یار تلاش می‌کند دری را به روی شما باز کند که همیشه با پول باز نمی‌شود:",
    ],
    title: "دسترسی به فرصت.",
    list: [
      "فرصت پژوهش.",
      "فرصت همکاری با صنعت.",
      "فرصت تأمین مالی.",
      "فرصت سرمایه‌گذاری.",
      "فرصت دیده‌شدن.",
      "فرصت ساختن یک کسب‌وکار.",
    ],
  },
  closing:
    "و در کنار همه این‌ها، مجموعه‌ای از مزایای مالی، رفاهی و اجتماعی که داشتن پژوهش‌یار را در زندگی روزمره نیز ارزشمند می‌کند.",
  signoff: ["پژوهش‌یار هستید.", "انتخاب شده‌اید، چون متفاوتید."],
};
