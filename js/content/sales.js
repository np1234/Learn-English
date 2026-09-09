// Sales Mode content bank (Section 4 / track C).
//
// Same level-keyed shape family as sentences.js/vocab.js, but preA1 is
// deliberately omitted: a total beginner isn't running sales conversations,
// and levels.sales starts at A1 (see placement.js: "a specialised register:
// start conservative"). If recordAccuracy() ever steps levels.sales below
// A1, pickScenario() below falls back to A2 - the same bank[level] || bank.A2
// idiom sentences.js's pickOne() uses.
//
// Each scenario is a short branching roleplay: a fixed sequence of customer
// turns, each offering 2-3 pre-written response options (best/ok/weak,
// authored answer-first - `options[0]` is always the strongest response,
// same "answer-first, shuffle at display time" convention as
// placement-items.js). Every option is a COMPLETE, real, sayable sentence:
// it is both the button label the learner reads to choose AND, if chosen,
// the exact reference text scoreAttempt() grades the read-aloud against -
// so every option, not just the best one, must stand on its own as sayable
// English content the learner could genuinely say to a customer.
//
// `why` is short Hebrew coaching, unlike sentences.js's English-only tags:
// sentences.js's coaching is generic-per-tag and lives in i18n.js's PHONEME
// block (one hint reused everywhere that tag appears), but a sales option's
// "why" is bespoke per option with no shared tag to hang a translated string
// off - the same reasoning i18n.js gives for translating coaching text at
// all ("a hint he has to decode is a hint wasted") applies here, so it is
// authored directly as Hebrew, the same way content/vocab.js carries its
// `he` gloss alongside the English word.
//
// v1 shipped deliberately small - 2 scenarios for A1, 1 each for A2/B1, 3
// turns per scenario - with more scenarios and a B2 tier meant to be
// appended later with no code changes, the same way sentences.js/vocab.js
// have grown over time. Section 5 did exactly that: A2/B1 are now 2
// scenarios each, and a B2 tier (2 scenarios) was added. Per
// content/vocab.js's header: Sales Mode covers conversational moves and
// phrases, not word knowledge, so there is deliberately no overlap with the
// vocabulary bank to sort out.

import { fanOut, pickFresh } from './pick.js';

export const LEVELS = ['A1', 'A2', 'B1', 'B2'];

export const SALES_SCENARIOS = {
  A1: [
    {
      id: 'a1-basic-price',
      turns: [
        {
          customerLine: 'How much does this cost?',
          options: [
            { text: "It's $49 a month. Would you like to see what's included?", quality: 'best',
              why: 'שאלת מחיר היא הזדמנות להראות ערך, לא רק להגיד מספר.' },
            { text: "It's $49 a month.", quality: 'ok',
              why: 'תשובה נכונה אך לא ממשיכה את השיחה - כדאי להוסיף שאלה או הצעה.' },
            { text: "I'm not sure, let me check.", quality: 'weak',
              why: 'לא לדעת מחיר בסיסי פוגע באמינות שלך כאיש מכירות.' },
          ],
        },
        {
          customerLine: "That's more expensive than I expected.",
          options: [
            { text: 'I understand. Many customers feel that way at first - can I show you what makes it worth the price?', quality: 'best',
              why: 'מכיר בהתנגדות ומציע להמשיך בשיחה במקום להתגונן.' },
            { text: "It's a good price for what you get.", quality: 'ok',
              why: 'טענה סבירה אך לא מתייחסת לתחושת הלקוח.' },
            { text: 'Okay, I can give you a discount.', quality: 'weak',
              why: 'לוותר על המחיר מיד לפני שהסברת את הערך מחליש את המיקוח שלך.' },
          ],
        },
        {
          customerLine: "Okay, I think I'd like to go ahead.",
          options: [
            { text: "Great! I'll send the agreement right now - what's the best email for you?", quality: 'best',
              why: 'סוגר בפעולה קונקרטית ומיידית.' },
            { text: "Great, I'll get back to you with the details.", quality: 'ok',
              why: 'מוותר על הרגע לסגור עכשיו, מסתכן בכך שהלקוח יתקרר.' },
            { text: 'Are you sure?', quality: 'weak',
              why: 'מטיל ספק בהחלטה של הלקוח בדיוק ברגע שהוא רוצה לקנות.' },
          ],
        },
      ],
    },
    {
      id: 'a1-simple-hesitation',
      turns: [
        {
          customerLine: "I need to think about it.",
          options: [
            { text: "Of course. What's the main thing you'd like to think over?", quality: 'best',
              why: 'שאלה פתוחה שמבררת את החשש האמיתי במקום ללחוץ.' },
            { text: "Sure, take your time.", quality: 'ok',
              why: 'מנומס אך לא מקדם את השיחה.' },
            { text: "Why? Is there a problem?", quality: 'weak',
              why: 'נשמע הגנתי ולוחץ, במקום סקרן ותומך.' },
          ],
        },
        {
          customerLine: "I'm worried it won't work for my team.",
          options: [
            { text: "That's a fair concern. What does your team need most from a tool like this?", quality: 'best',
              why: 'מתייחס ישירות לחשש ומזמין פרטים.' },
            { text: "It works for most teams.", quality: 'ok',
              why: 'כללי מדי ולא נוגע בחשש הספציפי.' },
            { text: "It will definitely work, don't worry.", quality: 'weak',
              why: 'הבטחה גורפת בלי בסיס נשמעת לא אמינה.' },
          ],
        },
        {
          customerLine: "Okay, that makes sense. Let's try it.",
          options: [
            { text: "Perfect - I'll set you up today. What's a good time for a quick onboarding call?", quality: 'best',
              why: 'ממשיך מיד לצעד הבא הקונקרטי.' },
            { text: "Great, I'll send you the next steps.", quality: 'ok',
              why: 'סביר אך פחות מיידי מקביעת זמן בפועל.' },
            { text: "Okay, I'll wait to hear from you.", quality: 'weak',
              why: 'מעביר את היוזמה בחזרה ללקוח בדיוק כשהוא כבר מוכן.' },
          ],
        },
      ],
    },
  ],
  A2: [
    {
      id: 'a2-discovery',
      turns: [
        {
          customerLine: "We're just looking around for now, not ready to decide.",
          options: [
            { text: 'No problem at all. What made you start looking in the first place?', quality: 'best',
              why: 'שאלת בירור פתוחה ממשיכה את השיחה בלי לחץ.' },
            { text: 'Sure, take your time.', quality: 'ok',
              why: 'מנומס אך לא מקדם את השיחה.' },
            { text: "Okay, let me know when you're ready to buy.", quality: 'weak',
              why: 'סוגר את הדלת לשיחה במקום לפתוח אותה.' },
          ],
        },
        {
          customerLine: "Honestly, your competitor is cheaper.",
          options: [
            { text: "That's fair - price is one part of it. What matters most to you besides price?", quality: 'best',
              why: 'לא מתווכח על המחיר, אלא מסיט את השיחה לערך.' },
            { text: 'Our quality is much better than theirs.', quality: 'ok',
              why: 'טוען יתרון בלי לבדוק מה חשוב ללקוח.' },
            { text: 'I can match their price.', quality: 'weak',
              why: 'מוריד מחיר מיד מוביל למירוץ מחירים במקום להראות ערך.' },
          ],
        },
        {
          customerLine: "Alright, send me a proposal and I'll think about it.",
          options: [
            { text: "I'll send it today. Can we set a quick call for Thursday to go over any questions?", quality: 'best',
              why: 'מבטיח פעולה וקובע צעד הבא קונקרטי.' },
            { text: "Sure, I'll send it over.", quality: 'ok',
              why: 'לא קובע המשך, הלקוח עלול להיעלם.' },
            { text: 'Take your time, no rush.', quality: 'weak',
              why: 'מוריד את הדחיפות ומקטין סיכוי לסגירה.' },
          ],
        },
      ],
    },
    {
      id: 'a2-feature-question',
      turns: [
        {
          customerLine: 'Does it work with the software we already use?',
          options: [
            { text: 'Which software are you currently using? I can check exactly how it connects.', quality: 'best',
              why: 'שואל פרט קונקרטי לפני שנותן תשובה כללית ולא מדויקת.' },
            { text: 'Yes, it works with most systems.', quality: 'ok',
              why: 'תשובה כללית שלא מוודאת את המקרה הספציפי.' },
            { text: "I'm not sure, but probably.", quality: 'weak',
              why: 'חוסר ודאות על שאלה טכנית חשובה פוגע באמינות.' },
          ],
        },
        {
          customerLine: "That's good, but we'd also need training for the team.",
          options: [
            { text: 'That\'s included - we run a live onboarding session for every new team.', quality: 'best',
              why: 'עונה ישירות על החשש ומראה שזה כבר חלק מהתהליך.' },
            { text: 'We can probably arrange something.', quality: 'ok',
              why: 'לא ברור ולא מבטיח כלום קונקרטי.' },
            { text: "You'll figure it out, it's not complicated.", quality: 'weak',
              why: 'מזלזל בחשש אמיתי של הלקוח.' },
          ],
        },
        {
          customerLine: 'Okay, that sounds reasonable. What are the next steps?',
          options: [
            { text: "I'll set up the onboarding call - are you free this week or next?", quality: 'best',
              why: 'ממשיך מיד לצעד קונקרטי ומזמין ללוח זמנים.' },
            { text: "I'll follow up with more details soon.", quality: 'ok',
              why: 'לא קובע לוח זמנים ברור.' },
            { text: 'Just let me know when you decide.', quality: 'weak',
              why: 'מעביר את היוזמה בחזרה ללקוח בדיוק כשהוא כבר מתקדם.' },
          ],
        },
      ],
    },
  ],
  B1: [
    {
      id: 'b1-existing-supplier',
      turns: [
        {
          customerLine: "We already have a supplier we're happy with.",
          options: [
            { text: "That's great to hear. What do you like most about working with them?", quality: 'best',
              why: 'לומד מה חשוב ללקוח לפני שמנסה להחליף ספק.' },
            { text: 'We could still offer better terms.', quality: 'ok',
              why: 'קופץ להצעה בלי להבין מה הלקוח מעריך.' },
            { text: 'Okay, thanks anyway.', quality: 'weak',
              why: 'מוותר על השיחה מהר מדי.' },
          ],
        },
        {
          customerLine: "The contract length worries me - a year feels like a big commitment.",
          options: [
            { text: "That's understandable. Would starting with a three-month trial make this easier?", quality: 'best',
              why: 'מציע פתרון קונקרטי שמפחית את הסיכון הנתפס.' },
            { text: "It's a standard contract for everyone.", quality: 'ok',
              why: 'לא מתייחס לחשש הספציפי של הלקוח.' },
            { text: "You have to commit for a year, that's just how it works.", quality: 'weak',
              why: 'נשמע נוקשה ומתעלם מהחשש שהלקוח הביע.' },
          ],
        },
        {
          customerLine: "Okay, let's do the trial. What happens next?",
          options: [
            { text: "I'll set it up today and send you the confirmation - can you start this Monday?", quality: 'best',
              why: 'פועל מיד וקובע תאריך התחלה ברור.' },
            { text: "I'll get the paperwork ready soon.", quality: 'ok',
              why: 'לא נותן לוח זמנים ברור.' },
            { text: "I'll let you know once everything is approved.", quality: 'weak',
              why: 'משאיר את הלקוח בלי מידע ומאט את המומנטום.' },
          ],
        },
      ],
    },
    {
      id: 'b1-bad-timing',
      turns: [
        {
          customerLine: "This isn't a good time - we're in the middle of a big reorganization.",
          options: [
            { text: 'Understood - would it help to reconnect once things settle, or is there a smaller piece worth starting now?', quality: 'best',
              why: 'מכבד את התזמון אך משאיר פתח קונקרטי במקום לוותר לגמרי.' },
            { text: "No problem, I'll check back in a few months.", quality: 'ok',
              why: 'סביר, אבל מוותר על ההזדמנות לצעד קטן יותר עכשיו.' },
            { text: "This will only take a few minutes, it's really not a big deal.", quality: 'weak',
              why: 'מתעלם מהחשש שהלקוח כבר הביע במפורש.' },
          ],
        },
        {
          customerLine: "Actually, maybe a smaller pilot with one department could work.",
          options: [
            { text: 'That works well - which department feels like the easiest place to start?', quality: 'best',
              why: 'תופס את ההזדמנות שהלקוח פתח ומקדם אותה מיד.' },
            { text: "Sure, whichever you prefer.", quality: 'ok',
              why: 'מוותר על ההובלה בדיוק כשהלקוח מחפש כיוון.' },
            { text: "A full rollout would really be better for everyone.", quality: 'weak',
              why: 'דוחף בחזרה למשהו גדול יותר ממה שהלקוח כבר הסכים אליו.' },
          ],
        },
        {
          customerLine: "Okay, let's try it with the sales team first.",
          options: [
            { text: "Great choice - I'll prepare a short pilot plan and send it over by tomorrow.", quality: 'best',
              why: 'סוגר עם צעד קונקרטי ולוח זמנים ברור.' },
            { text: "Sounds good, I'll be in touch.", quality: 'ok',
              why: 'לא קובע לוח זמנים או פעולה מוחשית.' },
            { text: "Great, let me know if you have any questions.", quality: 'weak',
              why: 'מעביר את היוזמה בחזרה ללקוח בדיוק אחרי שהוא כבר הסכים.' },
          ],
        },
      ],
    },
  ],
  B2: [
    {
      id: 'b2-budget-freeze',
      turns: [
        {
          customerLine: "I'll be honest - finance has put a freeze on any new spending until next quarter.",
          options: [
            { text: "That's a common constraint. Would it help if I put together a proposal now, so it's ready to move the moment the freeze lifts?", quality: 'best',
              why: 'מקבל את המגבלה בלי ויכוח, ומציע לשמור על מומנטום עד שהיא תוסר.' },
            { text: "We could offer a discount if you sign before the freeze.", quality: 'ok',
              why: 'קופץ למחיר בלי לבדוק אם החתימה בכלל אפשרית עכשיו.' },
            { text: "Budgets can usually be adjusted if leadership sees enough value.", quality: 'weak',
              why: 'מרמז שהלקוח צריך לעקוף את התהליך הפנימי שלו, מה שנשמע לא רגיש.' },
          ],
        },
        {
          customerLine: "That's reasonable. What would you need from me to put that together?",
          options: [
            { text: 'Just a sense of your priorities for next quarter, so the proposal matches what will actually get approved.', quality: 'best',
              why: 'מבקש מידע רלוונטי שמגדיל את הסיכוי לאישור בפועל.' },
            { text: 'Just your approval once the freeze is over.', quality: 'ok',
              why: 'דוחה את כל השאלות המועילות לשלב מאוחר מדי.' },
            { text: 'Nothing really, I already know what to include.', quality: 'weak',
              why: 'מפספס הזדמנות ללמוד מה חשוב ללקוח ולפורמלית של הארגון.' },
          ],
        },
        {
          customerLine: "Sounds good. Let's touch base again once the new quarter starts.",
          options: [
            { text: "I'll send the proposal in the meantime and follow up right when the quarter opens - does the first week work?", quality: 'best',
              why: 'קובע תאריך המשך קונקרטי במקום להשאיר את זה פתוח.' },
            { text: "Sure, I'll reach out sometime next quarter.", quality: 'ok',
              why: 'לא קובע תאריך, מסתכן בכך שהעניין יישכח.' },
            { text: "Okay, feel free to reach out to us whenever you're ready.", quality: 'weak',
              why: 'מעביר את כל האחריות להמשך ללקוח.' },
          ],
        },
      ],
    },
    {
      id: 'b2-competitor-pitch',
      turns: [
        {
          customerLine: 'Your competitor made a compelling case that their platform is simpler to implement.',
          options: [
            { text: "Implementation speed matters a lot - what specifically did they show you that stood out?", quality: 'best',
              why: 'לא מתגונן אלא מברר את הפרט הקונקרטי כדי להתייחס אליו נכון.' },
            { text: 'Our implementation is actually just as simple.', quality: 'ok',
              why: 'טענה כללית ומתגוננת בלי להתייחס למה שהרשים את הלקוח.' },
            { text: 'They tend to oversimplify things in their pitches.', quality: 'weak',
              why: 'תוקף את המתחרה במקום להתמקד בערך של עצמו.' },
          ],
        },
        {
          customerLine: "They showed a setup that took about a week, start to finish.",
          options: [
            { text: "For a similar scope, ours typically runs about the same - I can walk you through exactly what that week looks like for a team your size.", quality: 'best',
              why: 'משווה בכנות ומציע מידע קונקרטי שמבסס אמון.' },
            { text: "A week sounds unrealistic to me.", quality: 'ok',
              why: 'מטיל ספק במתחרה בלי להביא מידע משלו.' },
            { text: "I wouldn't trust everything they show in a demo.", quality: 'weak',
              why: 'ציני כלפי המתחרה ולא בונה ערך לעסקה שלו.' },
          ],
        },
        {
          customerLine: "Okay, that's fair. Could you send me a realistic implementation timeline?",
          options: [
            { text: "I'll send a week-by-week timeline today, based on teams similar to yours.", quality: 'best',
              why: 'מספק מסמך קונקרטי ומותאם, בדיוק כפי שהתבקש.' },
            { text: "I'll put something together when I get a chance.", quality: 'ok',
              why: 'לא נותן מסגרת זמן ומחליש את הרושם המקצועי.' },
            { text: "Every implementation is different, so it's hard to say exactly.", quality: 'weak',
              why: 'מתחמק מבקשה ישירה וסבירה של הלקוח.' },
          ],
        },
      ],
    },
  ],
};

/**
 * Shuffle one turn's options for display, carrying quality/why along.
 * NOT content/placement-items.js's shuffleOptions() - that helper assumes
 * exactly one boolean-correct `answer` index and doesn't generalize to a
 * 3-tier quality field per option, so it's reimplemented here rather than
 * stretched to fit.
 */
export function shuffleTurnOptions(options) {
  const arr = options.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick one scenario for `level`, falling back like sentences.js's pickOne()
 * - and, like that helper, fanning out to neighboring levels and avoiding
 * `excludeIds` (recently shown) when possible. Only 2 scenarios/level exist,
 * so without fan-out a learner sees both within a week and then replays the
 * same two scripted customers for as long as that level holds - potentially
 * the whole program. See content/pick.js.
 */
export function pickScenario(level, excludeIds = []) {
  const effLevel = SALES_SCENARIOS[level] ? level : 'A2';
  let pool = fanOut(SALES_SCENARIOS, LEVELS, effLevel, 6);
  if (!pool.length) pool = Object.values(SALES_SCENARIOS).flat();
  return pickFresh(pool, excludeIds, 1, (s) => s.id)[0];
}
