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
            { text: "Honestly, I'm not sure about the exact price, so let me check with my manager and get back to you later.", quality: 'weak',
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
            { text: "Okay, no problem at all, I can definitely give you a big discount right now if you decide to sign up today.", quality: 'weak',
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
            { text: "Are you really sure about this? It is a big decision, so maybe you should think about it for a few more days.", quality: 'weak',
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
            { text: "Why do you need to think about it? Is there some kind of problem with the price or with the product?", quality: 'weak',
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
            { text: "It will definitely work for your team, I promise, so please don't worry about it at all.", quality: 'weak',
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
            { text: "Okay, that is fine, I will just wait here and hope to hear from you whenever you have the time.", quality: 'weak',
              why: 'מעביר את היוזמה בחזרה ללקוח בדיוק כשהוא כבר מוכן.' },
          ],
        },
      ],
    },
    {
      id: 'a1-cold-open',
      turns: [
        {
          customerLine: "Hello? Who is this?",
          options: [
            { text: "Hi, this is Elad from BrightDesk. Do you have two minutes?", quality: 'best',
              why: 'מציג את עצמך בקצרה ומבקש רשות לזמן - זה מכבד את הלקוח ומקטין התנגדות.' },
            { text: "Hello, I'm calling from BrightDesk.", quality: 'ok',
              why: 'מציג את עצמך, אבל לא מסביר למה התקשרת ולא מבקש זמן.' },
            { text: "Hello! I'm calling today because I wanted to tell you all about our amazing new product, and I think you will really love every part of it.", quality: 'weak',
              why: 'נאום ארוך לפני שהלקוח הסכים להקשיב - נשמע כמו פרסומת.' },
          ],
        },
        {
          customerLine: "I'm quite busy right now. What is this about?",
          options: [
            { text: "I'll be quick. We help small teams save time on invoices. Is that something you deal with?", quality: 'best',
              why: 'קצר, ברור, ומסיים בשאלה שמזמינה את הלקוח להשתתף.' },
            { text: "It is about our service. It is very good and many companies use it every day.", quality: 'ok',
              why: 'כללי מדי - לא אומר מה הלקוח ירוויח.' },
            { text: "It's a long story. Can I just send you an email?", quality: 'weak',
              why: 'מוותר על השיחה לפני שניסית להסביר ערך במשפט אחד.' },
          ],
        },
        {
          customerLine: "Actually, that sounds interesting. Tell me more.",
          options: [
            { text: "Great. How do you handle invoices today?", quality: 'best',
              why: 'שאלה פתוחה קצרה - קודם מבינים את הלקוח, אחר כך מציעים.' },
            { text: "Great! Our service has many features, and I can tell you about all of them if you want, one by one.", quality: 'ok',
              why: 'מציע לספר הכול, אבל לא בודק מה באמת חשוב ללקוח.' },
            { text: "Okay, so first, it costs forty-nine dollars a month.", quality: 'weak',
              why: 'קופץ למחיר לפני שהבנת מה הלקוח צריך.' },
          ],
        },
      ],
    },
    {
      id: 'a1-voicemail',
      turns: [
        {
          customerLine: "You have reached Dana Cohen. Please leave a message after the tone.",
          options: [
            { text: "Hi Dana, this is Elad from BrightDesk. I'll call again tomorrow at ten. Have a good day.", quality: 'best',
              why: 'שם, חברה וצעד הבא ברור - הודעה קולית טובה קצרה ועם פעולה.' },
            { text: "Hi Dana, this is Elad. Please call me back.", quality: 'ok',
              why: 'חסר מי אתה ולמה - קשה לה להחליט אם להתקשר בחזרה.' },
            { text: "Hello? Hello? Is anyone there? Okay, I will try again later, I think, maybe tomorrow or the next day.", quality: 'weak',
              why: 'מגמגם ולא משאיר שום מידע שימושי.' },
          ],
        },
        {
          customerLine: "Thanks for the voicemail. I'm free tomorrow afternoon. What time works for you?",
          options: [
            { text: "Tomorrow at three o'clock works for me. I'll send an invite now.", quality: 'best',
              why: 'קובע שעה מדויקת ושולח הזמנה - אין מקום לבלבול.' },
            { text: "Any time is fine for me.", quality: 'ok',
              why: 'נעים, אבל זורק את ההחלטה בחזרה ללקוח.' },
            { text: "I am free all week, so you can choose any time and just tell me when you decide.", quality: 'weak',
              why: 'נשמע כאילו אין לך עניינים אחרים, ומאריך את הקביעה.' },
          ],
        },
        {
          customerLine: "Three o'clock is good. Where shall we meet?",
          options: [
            { text: "We can use video. I'll put the link in the invite.", quality: 'best',
              why: 'פתרון פשוט ומיידי.' },
            { text: "We can meet at your office, if you like, or at a cafe near the station.", quality: 'ok',
              why: 'מתאים, אבל מעמיס אפשרויות כשאפשר לפשט.' },
            { text: "I don't know yet, I'll tell you later.", quality: 'weak',
              why: 'משאיר פרט חשוב פתוח.' },
          ],
        },
      ],
    },
    {
      id: 'a1-book-meeting',
      turns: [
        {
          customerLine: "I'd like to see a demo. When can you do it?",
          options: [
            { text: "I can do Tuesday at ten or Wednesday at two. Which is better for you?", quality: 'best',
              why: 'שתי אפשרויות קונקרטיות מקלות על ההחלטה.' },
            { text: "I can do any day next week, so just tell me which day you prefer and I will try to make it work.", quality: 'ok',
              why: 'גמיש, אבל פתוח מדי - הלקוח צריך לעשות את העבודה.' },
            { text: "I'm very busy, but I'll try.", quality: 'weak',
              why: 'גורם ללקוח להרגיש שהוא מפריע.' },
          ],
        },
        {
          customerLine: "Wednesday at two is good. How long will it take?",
          options: [
            { text: "About thirty minutes. I'll keep it short.", quality: 'best',
              why: 'תשובה מדויקת והבטחה שמכבדת את זמנו.' },
            { text: "It depends on how many questions you have, so maybe thirty minutes or maybe one hour, I am not sure.", quality: 'ok',
              why: 'כנה, אבל חסר ביטחון - עדיף להבטיח זמן ברור.' },
            { text: "It takes a long time, usually.", quality: 'weak',
              why: 'מרתיע את הלקוח מלהסכים.' },
          ],
        },
        {
          customerLine: "Okay. Do I need to prepare anything?",
          options: [
            { text: "Just a list of your questions. I'll send a reminder the day before.", quality: 'best',
              why: 'מבקש מעט, ומראה אחריות עם תזכורת.' },
            { text: "No, you don't need to prepare anything.", quality: 'ok',
              why: 'נכון, אבל מפספס הזדמנות להכין את הלקוח לשיחה טובה.' },
            { text: "Please read the whole manual before we meet, and also check all the settings and the prices on the website.", quality: 'weak',
              why: 'מטיל משימות כבדות על לקוח שעוד לא התחייב.' },
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
            { text: "Okay, that is fine, then just let me know when you are ready to buy and we can talk again.", quality: 'weak',
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
            { text: "I can match their price right away, and I can probably make it even a little bit cheaper for you.", quality: 'weak',
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
            { text: "You'll figure it out very quickly by yourselves, it's really not complicated and you don't need any help.", quality: 'weak',
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
            { text: "Take your time, there's no rush at all, and just let me know when you finally decide what to do.", quality: 'weak',
              why: 'מעביר את היוזמה בחזרה ללקוח בדיוק כשהוא כבר מתקדם.' },
          ],
        },
      ],
    },
    {
      id: 'a2-follow-up-call',
      turns: [
        {
          customerLine: "Hi, I got your email last week but I didn't have time to read it.",
          options: [
            { text: "No problem. Can I give you the short version in thirty seconds?", quality: 'best',
              why: 'לא מאשים, ומציע גרסה קצרה שמכבדת את הזמן.' },
            { text: "That's okay. I can send it again if you want, or I can explain everything now over the phone, whichever is easier for you.", quality: 'ok',
              why: 'נחמד וגמיש, אבל אפשרויות רבות מדי ולא מתקדם.' },
            { text: "It was an important email. You should read it.", quality: 'weak',
              why: 'מאשים את הלקוח ויוצר התנגדות.' },
          ],
        },
        {
          customerLine: "Okay, go ahead. What's the main point?",
          options: [
            { text: "We can cut your reporting time in half. Would that matter to your team?", quality: 'best',
              why: 'תועלת אחת ברורה ושאלה שבודקת רלוונטיות.' },
            { text: "The main point is that our software is easy and modern, with many useful features and good support.", quality: 'ok',
              why: 'רשימת תכונות כלליות ללא תועלת מוחשית.' },
            { text: "Well, there are really a lot of main points, so it is difficult to choose just one of them for you.", quality: 'weak',
              why: 'לא מצליח לתמצת - מאבד את הלקוח.' },
          ],
        },
        {
          customerLine: "That would matter, yes. What do you suggest?",
          options: [
            { text: "Let's do a short demo on Thursday. Does ten work?", quality: 'best',
              why: 'מציע צעד קטן ותאריך מוצע.' },
            { text: "I suggest we speak again soon, maybe next week or the week after, when you have more time.", quality: 'ok',
              why: 'לא קובע תאריך - הסיכוי להמשך יורד.' },
            { text: "I suggest that you buy it now.", quality: 'weak',
              why: 'קפיצה לסגירה לפני שהלקוח ראה משהו.' },
          ],
        },
      ],
    },
    {
      id: 'a2-demo-walkthrough',
      turns: [
        {
          customerLine: "I'm looking at the dashboard. What am I seeing here?",
          options: [
            { text: "This shows your sales this month. What number matters most to you?", quality: 'best',
              why: 'מסביר בקצרה ומחבר למה שחשוב ללקוח.' },
            { text: "This is the dashboard. It shows many numbers and charts about your sales and your team.", quality: 'ok',
              why: 'נכון אבל גנרי - לא מכוון את תשומת הלב.' },
            { text: "That's a complicated screen, I'll explain it later.", quality: 'weak',
              why: 'מודה שזה מסובך ודוחה את ההסבר.' },
          ],
        },
        {
          customerLine: "The numbers are a bit confusing. Can it be simpler?",
          options: [
            { text: "Yes. You can hide anything you don't need - let me show you.", quality: 'best',
              why: 'פתרון מיידי והדגמה במקום הסבר.' },
            { text: "Yes, it can be simpler, and I can explain how to change the settings step by step after the meeting is over.", quality: 'ok',
              why: 'נכון, אבל דוחה את הפתרון לאחרי הפגישה.' },
            { text: "No, that's how it works.", quality: 'weak',
              why: 'סוגר את הדלת על משוב אמיתי.' },
          ],
        },
        {
          customerLine: "That's much better. Can my team see this too?",
          options: [
            { text: "Yes, everyone gets their own login. How many people are on your team?", quality: 'best',
              why: 'עונה וממשיך לשאלה שמקדמת הצעה.' },
            { text: "Yes, your team can see it too, with different levels of access for each person, if you want.", quality: 'ok',
              why: 'מידע נכון אבל לא מקדם את השיחה.' },
            { text: "I think so, but I'm not sure.", quality: 'weak',
              why: 'חוסר ודאות על תכונה בסיסית פוגע באמון.' },
          ],
        },
      ],
    },
    {
      id: 'a2-small-talk',
      turns: [
        {
          customerLine: "Nice to meet you. Did you have a long trip?",
          options: [
            { text: "Not at all, thanks. How long have you been in this office?", quality: 'best',
              why: 'עונה קצר ומעביר את השיחה אל הלקוח.' },
            { text: "Yes, the traffic was terrible this morning and I left home very early, but it's fine now.", quality: 'ok',
              why: 'כנה אבל מתמקד בעצמך ובתלונה.' },
            { text: "Yes, it was terrible. Let's start the meeting.", quality: 'weak',
              why: 'מקצר שיחת חולין ונשמע קר ולחוץ.' },
          ],
        },
        {
          customerLine: "About five years. We moved here when the company grew.",
          options: [
            { text: "That's great growth. What changed the most for your team?", quality: 'best',
              why: 'מגיב באמת ושואל שאלה פתוחה.' },
            { text: "Nice. It is a good building.", quality: 'ok',
              why: 'מנומס אבל סוגר את הנושא.' },
            { text: "Five years is a long time. Okay, now about our product...", quality: 'weak',
              why: 'קופץ למכירה בלי להתעניין.' },
          ],
        },
        {
          customerLine: "More customers, mostly. So, what do you have for us?",
          options: [
            { text: "Then let me show you how we help busy teams handle more customers.", quality: 'best',
              why: 'מקשר את מה שהלקוח אמר למה שאתה מציע.' },
            { text: "Thank you for asking. I have prepared a short presentation with some slides about our company and our products.", quality: 'ok',
              why: 'מקצועי אבל לא קשור למה שהלקוח הזכיר.' },
            { text: "I have a lot of things. Which one do you want?", quality: 'weak',
              why: 'מעביר ללקוח את העבודה ונשמע לא מוכן.' },
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
            { text: "You have to commit for a full year, that's just how it works and we cannot change it for anyone, I'm sorry.", quality: 'weak',
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
            { text: "I'll let you know once everything is approved on our side, but it can take a while, so please be patient.", quality: 'weak',
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
            { text: "Great, that sounds good, and please let me know if you have any questions or if you need anything else from me.", quality: 'weak',
              why: 'מעביר את היוזמה בחזרה ללקוח בדיוק אחרי שהוא כבר הסכים.' },
          ],
        },
      ],
    },
    {
      id: 'b1-price-negotiation',
      turns: [
        {
          customerLine: "We like the product, but we need a better price to move forward.",
          options: [
            { text: "I hear you. What price would make this an easy yes for you?", quality: 'best',
              why: 'מקשיב ושואל שאלה שחושפת את הגבול האמיתי.' },
            { text: "I understand, and we always try to be flexible with our customers when it makes sense for both sides.", quality: 'ok',
              why: 'נשמע גמיש אבל לא מתקדם ולא מברר שום דבר.' },
            { text: "The price is fixed. I can't change it.", quality: 'weak',
              why: 'נוקשה, וסוגר משא ומתן לפני שהתחיל.' },
          ],
        },
        {
          customerLine: "If you could do ten percent off, we could sign this month.",
          options: [
            { text: "I can't do ten, but I could include extra onboarding if you sign this month. Would that help?", quality: 'best',
              why: 'לא מוותר על מחיר - מוסיף ערך בתמורה להתחייבות.' },
            { text: "Ten percent is difficult. Let me ask my manager and come back to you.", quality: 'ok',
              why: 'סביר, אבל מאבד תנופה ולא מציע חלופה.' },
            { text: "Okay, ten percent. Deal.", quality: 'weak',
              why: 'מוותר מיד בלי לקבל שום דבר בתמורה.' },
          ],
        },
        {
          customerLine: "Extra onboarding is useful. Send me the updated offer.",
          options: [
            { text: "Will do. I'll send it within the hour, and I'll confirm the start date too.", quality: 'best',
              why: 'מתחייב לזמן קצר ולפרט נוסף.' },
            { text: "Great, I'll send it by the end of the day, probably.", quality: 'ok',
              why: 'המילה "probably" מחלישה את ההתחייבות.' },
            { text: "I'll send the offer when my manager has approved everything on his side, which might take some days.", quality: 'weak',
              why: 'מאט עסקה שכבר מוכנה להתקדם.' },
          ],
        },
      ],
    },
    {
      id: 'b1-decision-maker',
      turns: [
        {
          customerLine: "This looks good to me, but I'm not the one who decides.",
          options: [
            { text: "Thanks for being open. Who else is involved in the decision?", quality: 'best',
              why: 'מודה ללקוח על הכנות ושואל מי עוד מעורב.' },
            { text: "I see. Could you please tell your manager about the product and ask him to call me when he can?", quality: 'ok',
              why: 'מעביר את העבודה ללקוח ונותן לו שליטה בתהליך.' },
            { text: "Then why are we having this meeting?", quality: 'weak',
              why: 'נשמע מתלונן ופוגע במי שמוכן לעזור לך.' },
          ],
        },
        {
          customerLine: "My director, Dana, decides. She cares most about cost.",
          options: [
            { text: "Good to know. Could we set up a short call with Dana, with a few numbers on savings?", quality: 'best',
              why: 'מבקש פגישה עם מקבל ההחלטות וקשור לדאגה שלה.' },
            { text: "Okay, I will send the information to Dana by email.", quality: 'ok',
              why: 'אימייל קר פחות אפקטיבי משיחה.' },
            { text: "Okay. Please give me Dana's email and I'll write to her myself, without telling you.", quality: 'weak',
              why: 'עוקף את הלקוח שתומך בך ופוגע באמון.' },
          ],
        },
        {
          customerLine: "I can ask her. What should I tell her about the call?",
          options: [
            { text: "Tell her it's twenty minutes, focused on how much she'll save.", quality: 'best',
              why: 'נותן ללקוח משפט קצר ומשכנע להעביר הלאה.' },
            { text: "Tell her that I have a great product, and that I would like to meet with her as soon as possible.", quality: 'ok',
              why: 'כללי - לא נותן לדנה סיבה לקחת זמן.' },
            { text: "Just tell her it's important.", quality: 'weak',
              why: 'עמום מדי ונשמע לוחץ.' },
          ],
        },
      ],
    },
    {
      id: 'b1-renewal-risk',
      turns: [
        {
          customerLine: "We're thinking about not renewing next month. Usage has been low.",
          options: [
            { text: "Thanks for telling me early. What's been getting in the way of using it?", quality: 'best',
              why: 'מודה על הכנות ומחפש את הסיבה האמיתית.' },
            { text: "I'm sorry to hear that. We would really like you to stay as our customer, and we can do many things to help you.", quality: 'ok',
              why: 'אמפתי אבל כללי - לא מברר מה השתבש.' },
            { text: "Low usage is not our problem.", quality: 'weak',
              why: 'מתגונן ומאשים את הלקוח.' },
          ],
        },
        {
          customerLine: "Honestly, the team found the setup confusing and just stopped.",
          options: [
            { text: "That's on us to fix. Could I run a short training session for them this week?", quality: 'best',
              why: 'לוקח אחריות ומציע פתרון קונקרטי עם זמן.' },
            { text: "I understand. We can send more training videos and guides to your team, if you would like that.", quality: 'ok',
              why: 'פתרון פסיבי - הצוות כבר הפסיק להשתמש.' },
            { text: "The setup is simple. Maybe they didn't try hard enough.", quality: 'weak',
              why: 'מאשים את הצוות של הלקוח.' },
          ],
        },
        {
          customerLine: "A training session might help. Let's see how it goes.",
          options: [
            { text: "Agreed. I'll book it for Wednesday and check in with you next Friday.", quality: 'best',
              why: 'קובע שני תאריכים - אימון ומעקב.' },
            { text: "Sure, let's see. I will be in touch.", quality: 'ok',
              why: 'לא קובע שום דבר מוחשי.' },
            { text: "Great, so you'll renew for another year, right?", quality: 'weak',
              why: 'לוחץ לסגירה מוקדם מדי, אחרי שהלקוח ביקש זמן.' },
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
    {
      id: 'b2-multi-stakeholder',
      turns: [
        {
          customerLine: "From a financial view, what's the payback period?",
          options: [
            { text: "For teams your size, most reach break-even in about seven months. May I walk you through the assumptions?", quality: 'best',
              why: 'מספר קונקרטי והצעה לשקיפות על ההנחות - מה שסמנכ"ל כספים רוצה.' },
            { text: "It depends on many factors, but our customers usually see a good return after some time, in my experience.", quality: 'ok',
              why: 'מתחמק ממספר - נשמע לא מוכן.' },
            { text: "It pays for itself quickly, trust me.", quality: 'weak',
              why: '"תסמוך עליי" לא עובד מול אנשי כספים.' },
          ],
        },
        {
          customerLine: "Seven months is longer than our target. We need under six.",
          options: [
            { text: "Fair target. If we start with the two highest-impact modules, we can get much closer - shall I model that?", quality: 'best',
              why: 'לא מתווכח, ומציע דרך להגיע ליעד ואומר שיעשה חישוב.' },
            { text: "We can probably get closer to six months with some changes.", quality: 'ok',
              why: 'עמום - אילו שינויים?' },
            { text: "Six months isn't realistic for any vendor.", quality: 'weak',
              why: 'דוחה את היעד של הלקוח במקום לעבוד איתו.' },
          ],
        },
        {
          customerLine: "Model it, and include the risks too.",
          options: [
            { text: "Absolutely. You'll have it Friday, with best and worst cases.", quality: 'best',
              why: 'תאריך ברור ושקיפות לגבי תרחישים.' },
            { text: "Sure, I'll include everything you need in a clear document, with the numbers, the risks, and some customer examples from our other clients.", quality: 'ok',
              why: 'מבטיח הרבה אבל בלי תאריך.' },
            { text: "I'll include the risks, though there aren't many.", quality: 'weak',
              why: 'מקטין סיכונים בפני מי שביקש לראות אותם.' },
          ],
        },
      ],
    },
    {
      id: 'b2-contract-redlines',
      turns: [
        {
          customerLine: "Our lawyers flagged the liability clause. It's too broad for us.",
          options: [
            { text: "Thanks for flagging that. Which part concerns them most?", quality: 'best',
              why: 'מקשיב ומצמצם את הבעיה לנקודה אחת.' },
            { text: "I understand your lawyers' concern, but this clause is standard in our industry and most of our customers accept it as it is.", quality: 'ok',
              why: 'מגן על הסעיף ולא מקשיב.' },
            { text: "We never change the contract.", quality: 'weak',
              why: 'סוגר דיון לפני שהתחיל.' },
          ],
        },
        {
          customerLine: "They want liability capped at twelve months of fees.",
          options: [
            { text: "That's a reasonable request. Let me check with our legal team and confirm by Thursday.", quality: 'best',
              why: 'לא מתחייב בלי אישור, אבל נותן תאריך.' },
            { text: "I think that might be possible, but I need to ask someone first.", quality: 'ok',
              why: 'ללא מועד - הלקוח לא יודע מתי לצפות לתשובה.' },
            { text: "That's too much. We can only cap it at one month of fees.", quality: 'weak',
              why: 'נוקשה, ונשמע כמו התחלה של ויכוח.' },
          ],
        },
        {
          customerLine: "Good. Anything else we should expect on your side?",
          options: [
            { text: "One thing: we'd need signed terms by the thirtieth to keep this price. Is that workable?", quality: 'best',
              why: 'פותח בגילוי מוקדם של מגבלה ושואל אם היא ריאלית.' },
            { text: "No, I think that's everything, but I will let you know if there is anything else that comes up later.", quality: 'ok',
              why: 'מפספס הזדמנות לקבוע תאריך סגירה.' },
            { text: "Just sign as soon as you can, please.", quality: 'weak',
              why: 'לחץ ללא הקשר או תאריך.' },
          ],
        },
      ],
    },
    {
      id: 'b2-churn-save',
      turns: [
        {
          customerLine: "We've decided to switch to another provider. I wanted to tell you personally.",
          options: [
            { text: "I appreciate you telling me directly. Would you share what tipped the decision?", quality: 'best',
              why: 'מכבד את הכנות ושואל למה, בלי להתחנן.' },
            { text: "That's disappointing to hear, and I would like to ask you to please reconsider, because we have been working together for a long time.", quality: 'ok',
              why: 'מתחנן ומתמקד בעצמך ולא בסיבה.' },
            { text: "Okay. Goodbye then.", quality: 'weak',
              why: 'מוותר ללא ניסיון ללמוד.' },
          ],
        },
        {
          customerLine: "Mainly price, and some delays in support.",
          options: [
            { text: "Thank you - both are fair points. If I could fix the support delays and review the price, would you stay open to a conversation?", quality: 'best',
              why: 'מכיר בשתי הבעיות ומבקש רק פתח לשיחה.' },
            { text: "I understand. We can offer you a discount if you stay with us.", quality: 'ok',
              why: 'מתייחס רק למחיר ומתעלם מהתמיכה.' },
            { text: "Our support isn't slow. Maybe it was your side.", quality: 'weak',
              why: 'מכחיש ומאשים - סוגר את הדלת.' },
          ],
        },
        {
          customerLine: "I'd listen, but I can't promise anything.",
          options: [
            { text: "That's all I ask. Can I call you Monday with a concrete offer?", quality: 'best',
              why: 'לא דוחף, אבל קובע מועד ברור.' },
            { text: "Okay, thank you. I'll send you an email with an offer in the next days.", quality: 'ok',
              why: 'אימייל בלי תאריך - פחות אישי.' },
            { text: "Then I can't do anything for you.", quality: 'weak',
              why: 'מוותר בדיוק כשנפתח פתח קטן.' },
          ],
        },
      ],
    },
    {
      id: 'b2-upsell',
      turns: [
        {
          customerLine: "The new reports are great. We're using them every day.",
          options: [
            { text: "That's wonderful to hear. Which reports does your team use the most?", quality: 'best',
              why: 'מתעניין ומברר שימוש אמיתי לפני שמציע עוד.' },
            { text: "Thank you! I'm glad you like them. We have many other features that you might also enjoy.", quality: 'ok',
              why: 'קופץ להצעה לפני שמבין מה עובד.' },
            { text: "Good. You should buy the premium plan now.", quality: 'weak',
              why: 'לחץ מכירה מיידי ללא קשר לצורך.' },
          ],
        },
        {
          customerLine: "The weekly forecast, mostly. It saves hours.",
          options: [
            { text: "Then our forecasting add-on could save even more. Would a quick look be useful?", quality: 'best',
              why: 'מחבר ישירות לשימוש שהלקוח ציין.' },
            { text: "Our premium plan has a better forecast and more. It costs a little more each month, but many customers say it is worth it.", quality: 'ok',
              why: 'מעמיס מידע ומחיר לפני שנוצר עניין.' },
            { text: "The forecast is only a basic one. It's not very good.", quality: 'weak',
              why: 'מזלזל במה שהלקוח אוהב.' },
          ],
        },
        {
          customerLine: "A quick look is fine. Not today though.",
          options: [
            { text: "Perfectly fine. I'll send a two-minute video, and we can talk next week.", quality: 'best',
              why: 'מכבד את הסירוב להיום ומשאיר צעד קטן.' },
            { text: "No problem, I will call you again soon.", quality: 'ok',
              why: '"Soon" לא נותן מועד.' },
            { text: "But it's a limited offer. It ends today.", quality: 'weak',
              why: 'לחץ מלאכותי אחרי שהלקוח אמר "לא היום".' },
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
