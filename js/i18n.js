// Interface language.
//
// Deliberate split: the INTERFACE can be Hebrew, but everything he PRACTISES
// stays English. Sentences, passages, prompts and answer options are never
// translated - that is the input he is here for. What gets translated is the
// scaffolding around it: instructions, buttons, coaching hints, error messages.
//
// The reason is the pronunciation coaching. "Tongue tip lightly between the
// teeth" is the highest-value text in the app, and it does nothing for a learner
// who is busy decoding it. At A1-A2 English instructions compete with the task
// itself for working memory.

const S = {
  // ---------------------------------------------------------- welcome
  'app.name':            { en: 'Speak English',  he: 'לדבר אנגלית' },
  'welcome.lede':        { en: 'A short daily practice built around speaking out loud. Ten minutes a day beats an hour on Sunday.',
                           he: 'תרגול יומי קצר שבנוי סביב דיבור בקול. עשר דקות ביום שוות יותר משעה אחת בשבוע.' },
  'welcome.askName':     { en: 'What should I call you?', he: 'איך לקרוא לך?' },
  'welcome.namePlaceholder': { en: 'Your first name', he: 'השם הפרטי שלך' },
  'welcome.start':       { en: 'Start', he: 'מתחילים' },
  'welcome.needName':    { en: 'Please enter your name first.', he: 'צריך להזין שם קודם.' },
  'welcome.language':    { en: 'Language', he: 'שפת התפריטים' },

  // -------------------------------------------------------- soundcheck
  'sc.title':            { en: 'Sound check', he: 'בדיקת שמע' },
  'sc.intro':            { en: 'Two quick checks so the app knows what this device can do. Headphones make everything work better.',
                           he: 'שתי בדיקות קצרות כדי שהאפליקציה תדע מה המכשיר הזה יודע לעשות. עם אוזניות הכול עובד טוב יותר.' },
  'sc.check1':           { en: 'Check 1', he: 'בדיקה 1' },
  'sc.canYouHear':       { en: 'Can you hear the app speak?', he: 'אתה שומע את האפליקציה מדברת?' },
  'sc.playTest':         { en: 'Play test sound', he: 'נגן צליל בדיקה' },
  'sc.playAgain':        { en: 'Play again', he: 'נגן שוב' },
  'sc.heardIt':          { en: 'Yes, I heard it', he: 'כן, שמעתי' },
  'sc.noSound':          { en: 'No sound', he: 'אין קול' },
  'sc.silentSwitch':     { en: 'No sound? Check the silent switch on the side of the phone, then try again.',
                           he: 'אין קול? בדוק את מתג ההשתקה בצד הטלפון ונסה שוב.' },
  'sc.check2':           { en: 'Check 2', he: 'בדיקה 2' },
  'sc.canAppHear':       { en: 'Can the app hear you?', he: 'האפליקציה שומעת אותך?' },
  'sc.willAsk':          { en: 'You will be asked for microphone permission. Tap Allow.',
                           he: 'תתבקש לאשר גישה למיקרופון. לחץ "אפשר".' },
  'sc.testMic':          { en: 'Test microphone', he: 'בדוק מיקרופון' },
  'sc.listening':        { en: 'Listening... say "hello, my name is"', he: 'מקשיב... תגיד "hello, my name is"' },
  'sc.speakNow':         { en: 'Speak now.', he: 'דבר עכשיו.' },
  'sc.micWorks':         { en: 'Microphone works.', he: 'המיקרופון עובד.' },
  'sc.nothingRecorded':  { en: 'Nothing was recorded.', he: 'לא הוקלט כלום.' },
  'sc.asrWorks':         { en: 'Speech recognition works. It heard:', he: 'זיהוי הדיבור עובד. זה מה שנשמע:' },
  'sc.noAsr':            { en: 'Automatic scoring is not available on this device. Everything still works - you will compare your recording against the model by ear instead.',
                           he: 'ניקוד אוטומטי לא זמין במכשיר הזה. הכול עדיין עובד - במקום זה תשווה את ההקלטה שלך למודל באוזן.' },
  'sc.continue':         { en: 'Continue', he: 'המשך' },
  'sc.continueAnyway':   { en: 'Continue anyway', he: 'המשך בכל זאת' },
  'sc.soundOk':          { en: 'Sound: working', he: 'שמע: עובד' },
  'sc.soundNo':          { en: 'Sound: not available', he: 'שמע: לא זמין' },
  'sc.micOk':            { en: 'Microphone: working', he: 'מיקרופון: עובד' },
  'sc.micNo':            { en: 'Microphone: not available', he: 'מיקרופון: לא זמין' },
  'sc.asrOk':            { en: 'Automatic scoring: available', he: 'ניקוד אוטומטי: זמין' },
  'sc.asrNo':            { en: 'Automatic scoring: not on this device', he: 'ניקוד אוטומטי: לא במכשיר הזה' },
  'sc.noMicNote':        { en: 'Without a microphone the speaking drills cannot record you. You can still listen and practise, and you can redo this check later from the More tab.',
                           he: 'בלי מיקרופון תרגילי הדיבור לא יכולים להקליט אותך. עדיין אפשר להאזין ולתרגל, ואפשר לחזור על הבדיקה מאוחר יותר בלשונית "עוד".' },
  'sc.next':             { en: 'Next', he: 'הבא' },

  // ------------------------------------------------------------ budget
  'budget.title':        { en: 'How much time per day?', he: 'כמה זמן ביום?' },
  'budget.hint':         { en: 'Be honest rather than ambitious - a plan you actually keep beats a bigger one you abandon. You can change this any time.',
                           he: 'עדיף כן מאשר שאפתני - תוכנית שבאמת תעמוד בה שווה יותר מתוכנית גדולה שתיזנח. אפשר לשנות בכל רגע.' },
  'budget.speech':       { en: 'Speaking', he: 'דיבור' },
  'budget.speechBlurb':  { en: 'The main event. Talking out loud, pronunciation, fluency.',
                           he: 'העיקר. דיבור בקול, הגייה, שטף.' },
  'budget.vocab':        { en: 'Vocabulary', he: 'אוצר מילים' },
  'budget.vocabBlurb':   { en: 'New words, spaced out so they stick.', he: 'מילים חדשות, בפריסה שגורמת להן להישאר.' },
  'budget.sales':        { en: 'Sales English', he: 'אנגלית למכירות' },
  'budget.salesBlurb':   { en: 'Discovery questions, objections, closing language.',
                           he: 'שאלות בירור, התמודדות עם התנגדויות, שפת סגירה.' },
  'budget.listening':    { en: 'Listening', he: 'הבנת הנשמע' },
  'budget.listeningBlurb': { en: 'Understand spoken English - no microphone needed.',
                           he: 'להבין אנגלית מדוברת - בלי צורך במיקרופון.' },
  'budget.perDay':       { en: 'min / day', he: 'דק\' ביום' },
  'budget.skip':         { en: 'Skip', he: 'דלג' },
  'budget.length':       { en: 'Program length', he: 'אורך התוכנית' },
  'budget.months':       { en: '{n} months', he: '{n} חודשים' },
  'budget.next':         { en: 'Next: quick level check', he: 'הבא: בדיקת רמה קצרה' },
  'budget.needTime':     { en: 'Pick at least a few minutes somewhere.', he: 'צריך לבחור לפחות כמה דקות באחד התחומים.' },

  // --------------------------------------------------------- placement
  'pl.title':            { en: 'Level check', he: 'בדיקת רמה' },
  'pl.listenThen':       { en: 'Listen, then choose the natural reply.', he: 'הקשב, ואז בחר את התשובה הטבעית.' },
  'pl.play':             { en: 'Play', he: 'נגן' },
  'pl.speaking':         { en: 'Speaking', he: 'דיבור' },
  'pl.hearFirst':        { en: 'Hear it first', he: 'שמע קודם' },
  'pl.startRec':         { en: 'Start recording', he: 'התחל הקלטה' },
  'pl.stop':             { en: 'Stop', he: 'עצור' },
  'pl.processing':       { en: 'Processing...', he: 'מעבד...' },
  'pl.recorded':         { en: 'Recorded.', he: 'הוקלט.' },
  'pl.skipThis':         { en: 'Skip this', he: 'דלג על זה' },
  'pl.resultTitle':      { en: 'Your starting point', he: 'נקודת ההתחלה שלך' },
  'pl.resultHint':       { en: 'This is a starting estimate, not a verdict. The app adjusts as you go - if something feels too easy or too hard, it will move.',
                           he: 'זו הערכת פתיחה, לא גזר דין. האפליקציה מתאימה את עצמה תוך כדי - אם משהו קל או קשה מדי, הרמה תזוז.' },
  'pl.speechLags':       { en: 'Speaking usually starts a little below the others. That is normal - understanding always runs ahead of producing.',
                           he: 'דיבור בדרך כלל מתחיל קצת מתחת לשאר. זה נורמלי - ההבנה תמיד מקדימה את היכולת להפיק.' },
  'pl.startPractising':  { en: 'Start practising', he: 'מתחילים לתרגל' },

  // ------------------------------------------------------------ today
  'today.hi':            { en: 'Hi {name}', he: 'היי {name}' },
  'today.practisedToday':{ en: 'practised today', he: 'תורגל היום' },
  'today.streak':        { en: 'day streak', he: 'ימים ברצף' },
  'today.title':         { en: "Today's practice", he: 'התרגול של היום' },
  'today.min':           { en: '{n} min', he: '{n} דק\'' },
  'today.spareTitle':    { en: 'Got a spare minute?', he: 'יש לך דקה פנויה?' },
  'today.spareBlurb':    { en: 'No timer, no plan. Two sentences and you are done.',
                           he: 'בלי טיימר, בלי תוכנית. שני משפטים וסיימת.' },
  'today.quick':         { en: 'Quick practice', he: 'תרגול מהיר' },
  'today.restDay':       { en: 'Today is a rest day.', he: 'היום יום מנוחה.' },
  'today.practiseAnyway':{ en: 'Practise anyway', he: 'תרגל בכל זאת' },
  'today.allDone':       { en: "Today's practice is done. Nice work.", he: 'סיימת את התרגול של היום. כל הכבוד.' },
  'today.doneTick':      { en: 'Done', he: 'בוצע' },
  'today.missedDays':    { en: 'You missed {n} days of practice in a row.', he: 'פספסת {n} ימי תרגול ברצף.' },
  'today.missedCta':     { en: 'Get back in with two sentences', he: 'תחזור עם שני משפטים' },
  'today.programComplete':     { en: 'You completed your {n}-month program!', he: 'סיימת את התוכנית בת {n} החודשים שלך!' },
  'today.programCompleteHint': { en: '{days} days practised, longest streak {streak}, {minutes} minutes total. Keep going with a new program, or keep this one open and practise freely.',
                                  he: '{days} ימי תרגול, הרצף הארוך ביותר {streak}, סה"כ {minutes} דקות. אפשר להמשיך עם תוכנית חדשה, או להשאיר את זו פתוחה ולתרגל בחופשיות.' },
  'today.startNewProgram':     { en: 'Start a new program', he: 'התחל תוכנית חדשה' },
  'today.backupNudge':         { en: "It's been a while - back up your progress so it's never at risk.",
                                  he: 'עבר קצת זמן - כדאי לגבות את ההתקדמות שלך כדי שלא תהיה בסיכון.' },
  'today.backupNudgeCta':      { en: 'Back up now', he: 'גבה עכשיו' },

  // ---------------------------------------------------------- program
  'program.week':            { en: 'Week {week} of {total}', he: 'שבוע {week} מתוך {total}' },
  'program.phaseName.foundation': { en: 'Foundation', he: 'יסודות' },
  'program.phaseName.building':   { en: 'Building', he: 'בנייה' },
  'program.phaseName.integration':{ en: 'Integration', he: 'שילוב' },
  'program.phase.foundation':     { en: 'Weeks {from}-{to}: locking in your hardest sounds before building speed.',
                                     he: 'שבועות {from}-{to}: מבססים את הצלילים הכי קשים לפני שמעלים קצב.' },
  'program.phase.building':       { en: 'Weeks {from}-{to}: balancing accuracy, rhythm and speaking rate.',
                                     he: 'שבועות {from}-{to}: איזון בין דיוק, קצב וסחף בדיבור.' },
  'program.phase.integration':    { en: 'Weeks {from}-{to}: broader practice and speed, so it holds up under pressure.',
                                     he: 'שבועות {from}-{to}: תרגול רחב יותר ומהירות, כדי שזה יחזיק גם בלחץ.' },
  'program.practiceDays':    { en: 'Practice days', he: 'ימי תרגול' },
  'program.practiceDaysHint':{ en: 'Which days count toward your plan and streak. Change any time.',
                               he: 'אילו ימים נחשבים לתוכנית ולרצף. אפשר לשנות בכל רגע.' },
  'program.needDays':        { en: 'Pick at least one practice day.', he: 'צריך לבחור לפחות יום תרגול אחד.' },

  'drill.repeat':        { en: 'Repeat & Grade', he: 'חזור וקבל ציון' },
  'drill.repeatBlurb':   { en: 'Say sentences aimed at your weakest sounds', he: 'משפטים שמכוונים לצלילים החלשים שלך' },
  'drill.shadow':        { en: 'Shadowing', he: 'צל (Shadowing)' },
  'drill.shadowBlurb':   { en: 'Copy the rhythm of a natural passage', he: 'חיקוי הקצב של קטע טבעי' },
  'drill.fluency':       { en: 'Fluency Sprint', he: 'ספרינט שטף' },
  'drill.fluencyBlurb':  { en: 'Tell the same story three times, faster each time',
                           he: 'ספר את אותו סיפור שלוש פעמים, מהר יותר בכל פעם' },
  'drill.vocab':         { en: 'Vocabulary', he: 'אוצר מילים' },
  'drill.vocabBlurb':    { en: 'Spaced review of new words', he: 'חזרה מרווחת על מילים חדשות' },
  'drill.sales':         { en: 'Sales English', he: 'אנגלית למכירות' },
  'drill.salesBlurb':    { en: 'Discovery, objections, closing', he: 'בירור, התנגדויות, סגירה' },
  'drill.listening':     { en: 'Listening', he: 'הבנת הנשמע' },
  'drill.listeningBlurb':{ en: 'Understand spoken English, no mic needed', he: 'להבין אנגלית מדוברת, בלי מיקרופון' },

  // -------------------------------------------------------- sales mode
  'sl.turnOf':           { en: 'Turn {i} of {n}', he: 'תור {i} מתוך {n}' },
  'sl.customerSays':     { en: 'The customer says:', he: 'הלקוח אומר:' },
  'sl.howRespond':       { en: 'How do you respond?', he: 'איך אתה מגיב?' },
  'sl.tagBest':          { en: 'Strong move', he: 'מהלך חזק' },
  'sl.tagOk':            { en: 'Workable', he: 'עובד, אבל לא הכי טוב' },
  'sl.tagWeak':          { en: 'Risky', he: 'מהלך מסוכן' },
  'sl.nowSayIt':         { en: 'Now say it out loud, like you mean it.',
                           he: 'עכשיו תגיד את זה בקול, כאילו אתה מתכוון לזה.' },
  'sl.nextTurn':         { en: 'Next turn', he: 'התור הבא' },
  'sl.scenarioDone':     { en: 'Conversation complete', he: 'סיימת את השיחה' },
  'sl.turnsCount':       { en: '{n} turns practised', he: '{n} תורות תורגלו' },
  'sl.sessionHint':      { en: 'This is judgment practice, not a pronunciation test - the goal is to build instinct for what to say next.',
                           he: 'זה תרגול של שיקול דעת, לא מבחן הגייה - המטרה היא לבנות אינסטינקט למה להגיד הלאה.' },

  // -------------------------------------------------------- vocabulary
  'vc.due':              { en: '{n} due', he: '{n} לחזרה' },
  'vc.reveal':           { en: 'Show answer', he: 'הצג תשובה' },
  'vc.cardOf':           { en: 'Card {i} of {n}', he: 'כרטיס {i} מתוך {n}' },
  'vc.again':            { en: 'Again', he: 'לא זכרתי' },
  'vc.hard':             { en: 'Hard', he: 'קשה לי' },
  'vc.good':             { en: 'Good', he: 'זכרתי' },
  'vc.easy':             { en: 'Easy', he: 'קל מדי' },
  'vc.reviewedCount':    { en: '{n} reviewed', he: '{n} מילים נסקרו' },
  'vc.sessionHint':      { en: 'Words you found hard will come back sooner.',
                           he: 'מילים שהיו קשות יחזרו אליך מוקדם יותר.' },
  'vc.noneDueHint':      { en: 'Nothing is due right now - check back later.',
                           he: 'אין כרגע כלום לחזרה - נסה שוב מאוחר יותר.' },
  'vc.learned':          { en: 'learned', he: 'נלמדו' },
  'vc.mature':           { en: 'mastered', he: 'בשליטה' },
  'vc.dueTomorrow':      { en: 'due tomorrow', he: 'לחזרה מחר' },
  'vc.pos.n':            { en: 'noun', he: 'שם עצם' },
  'vc.pos.v':            { en: 'verb', he: 'פועל' },
  'vc.pos.adj':          { en: 'adjective', he: 'שם תואר' },

  // --------------------------------------------------------- listening
  'ls.passageOf':        { en: 'Passage {i} of {n}', he: 'קטע {i} מתוך {n}' },
  'ls.listenPrompt':     { en: 'Listen. You can play it as many times as you like - there is no text to read yet.',
                           he: 'הקשב. אפשר לנגן כמה פעמים שרוצים - עדיין אין טקסט לקרוא.' },
  'ls.playAgain':        { en: 'Play again', he: 'נגן שוב' },
  'ls.ready':            { en: "I'm ready - show the questions", he: 'אני מוכן - הצג שאלות' },
  'ls.questionOf':       { en: 'Question {i} of {n}', he: 'שאלה {i} מתוך {n}' },
  'ls.correct':          { en: 'Correct', he: 'נכון' },
  'ls.incorrect':        { en: 'Not quite', he: 'לא בדיוק' },
  'ls.correctWas':       { en: 'The correct answer:', he: 'התשובה הנכונה:' },
  'ls.nextQuestion':     { en: 'Next question', he: 'השאלה הבאה' },
  'ls.showTranscript':   { en: 'Show what was said', he: 'הצג את מה שנאמר' },
  'ls.transcriptTitle':  { en: 'What was said', he: 'מה שנאמר' },
  'ls.nextPassage':      { en: 'Next passage', he: 'הקטע הבא' },
  'ls.doneTitle':        { en: 'Listening complete', he: 'סיימת הבנת נשמע' },
  'ls.scoreLine':        { en: '{correct} of {total} correct', he: '{correct} מתוך {total} נכונות' },
  'ls.sessionHint':      { en: 'Understanding always runs ahead of speaking - this trains the skill on its own, without needing to produce anything.',
                           he: 'ההבנה תמיד מקדימה את הדיבור - זה מתרגל את היכולת הזו בפני עצמה, בלי צורך להפיק כלום.' },

  // ----------------------------------------------------------- drills
  'd.endSession':        { en: 'End session', he: 'סיים תרגול' },
  'd.exit':              { en: 'Exit', he: 'יציאה' },
  'd.listen':            { en: 'Listen', he: 'הקשב' },
  'd.listenSlowly':      { en: 'Listen slowly', he: 'הקשב לאט' },
  'd.recordYourself':    { en: 'Record yourself', he: 'הקלט את עצמך' },
  'd.stop':              { en: 'Stop', he: 'עצור' },
  'd.processing':        { en: 'Processing...', he: 'מעבד...' },
  'd.tryAgain':          { en: 'Try again', he: 'נסה שוב' },
  'd.nextSentence':      { en: 'Next sentence', he: 'המשפט הבא' },
  'd.finish':            { en: 'Finish', he: 'סיים' },
  'd.sentenceOf':        { en: 'Sentence {i} of {n}', he: 'משפט {i} מתוך {n}' },
  'd.sessionComplete':   { en: 'Session complete', he: 'סיימת את התרגול' },
  'd.recordedCount':     { en: '{n} recorded', he: '{n} הוקלטו' },
  'd.avgAccuracy':       { en: 'Average accuracy across this set.', he: 'דיוק ממוצע בסבב הזה.' },
  'd.noScoring':         { en: 'No scores this time, but what you recorded was practised.',
                           he: 'אין ציונים הפעם, אבל מה שהקלטת תורגל.' },
  'd.compareByEar':      { en: 'No score this time - compare the two recordings by ear.',
                           he: 'אין ציון הפעם - השווה בין שתי ההקלטות באוזן.' },
  'd.done':              { en: 'Done', he: 'סיום' },

  'd.youSaid':           { en: 'You said:', he: 'אמרת:' },
  'd.notHeard':          { en: 'Not heard at all', he: 'לא נשמע בכלל' },
  'd.wrongWordHint':     { en: 'Not quite this word. Listen to the model again and try to match it exactly.',
                           he: 'לא בדיוק המילה הזו. הקשב שוב למודל ונסה להתאים אליו במדויק.' },
  'd.missedWordHint':    { en: 'This word did not come through at all - maybe skipped, said too fast, or too quiet. Say it clearly on its own.',
                           he: 'המילה הזו לא נקלטה בכלל - אולי דילגת עליה, אמרת מהר מדי, או בשקט מדי. תגיד אותה בבירור לבד.' },
  'd.mistakeDetails':    { en: 'Word by word', he: 'מילה במילה' },

  'd.hearDifference':    { en: 'Hear the difference', he: 'שמע את ההבדל' },
  'd.playModel':         { en: 'Play the model', he: 'נגן את המודל' },
  'd.playYourself':      { en: 'Play yourself', he: 'נגן את עצמך' },
  'd.compareHint':       { en: 'Play them one after the other and listen for the difference in rhythm, not just the sounds.',
                           he: 'נגן אחד אחרי השני והקשב להבדל בקצב, לא רק בצלילים.' },

  'sh.passageOf':        { en: 'Passage {i} of {n}', he: 'קטע {i} מתוך {n}' },
  'sh.step1':            { en: 'Step 1 of 3', he: 'שלב 1 מתוך 3' },
  'sh.step1Text':        { en: 'Listen. Do not speak yet - just follow the rhythm.',
                           he: 'הקשב. עוד לא מדברים - רק עוקבים אחרי הקצב.' },
  'sh.step2':            { en: 'Step 2 of 3', he: 'שלב 2 מתוך 3' },
  'sh.step2Text':        { en: 'Play it again and speak along quietly, at the same time. Headphones help here.',
                           he: 'נגן שוב ודבר יחד איתו בשקט, באותו הזמן. אוזניות עוזרות בשלב הזה.' },
  'sh.step3':            { en: 'Step 3 of 3', he: 'שלב 3 מתוך 3' },
  'sh.step3Text':        { en: 'Now perform it yourself, matching the rhythm you heard.',
                           he: 'עכשיו תבצע בעצמך, בקצב ששמעת.' },
  'sh.play':             { en: 'Play', he: 'נגן' },
  'sh.playSlowly':       { en: 'Play slowly', he: 'נגן לאט' },
  'sh.playAlong':        { en: 'Play and speak along', he: 'נגן ודבר יחד' },
  'sh.nextStep':         { en: 'Next step', he: 'השלב הבא' },
  'sh.recordVersion':    { en: 'Record your version', he: 'הקלט את הגרסה שלך' },
  'sh.hearOnceMore':     { en: 'Hear it once more', he: 'שמע עוד פעם' },
  'sh.recordAgain':      { en: 'Record again', he: 'הקלט שוב' },
  'sh.nextPassage':      { en: 'Next passage', he: 'הקטע הבא' },
  'sh.doneTitle':        { en: 'Shadowing done', he: 'סיימת Shadowing' },
  'sh.passageCount':     { en: '{n} passages', he: '{n} קטעים' },
  'sh.doneHint':         { en: 'Rhythm improves fastest with short daily repetition, so a few minutes tomorrow beats a long session once a week.',
                           he: 'הקצב משתפר הכי מהר עם חזרה יומית קצרה, אז כמה דקות מחר שוות יותר מתרגול ארוך פעם בשבוע.' },

  'fl.title':            { en: 'Fluency Sprint', he: 'ספרינט שטף' },
  'fl.brief':            { en: 'You will tell this three times: {a}, then {b}, then {c}. Same story each time. Saying it faster is the point.',
                           he: 'תספר את זה שלוש פעמים: {a}, אחר כך {b}, ואז {c}. אותו סיפור בכל פעם. כל העניין הוא להספיק מהר יותר.' },
  'fl.startPlanning':    { en: 'Start {n}s planning', he: 'התחל {n} שניות תכנון' },
  'fl.planning':         { en: 'Planning', he: 'תכנון' },
  'fl.planHint':         { en: 'Plan what you will say. Do not write full sentences - just decide the order of your ideas.',
                           he: 'תכנן מה תגיד. אל תכתוב משפטים שלמים - רק תחליט על סדר הרעיונות.' },
  'fl.ready':            { en: 'Skip - I am ready', he: 'דלג - אני מוכן' },
  'fl.roundOf':          { en: 'Round {i} of {n} - {t}', he: 'סבב {i} מתוך {n} - {t}' },
  'fl.tapStart':         { en: 'Tap start, then speak until the time runs out.',
                           he: 'לחץ התחל, ואז דבר עד שהזמן נגמר.' },
  'fl.startRound':       { en: 'Start round {i}', he: 'התחל סבב {i}' },
  'fl.keepGoing':        { en: 'Speaking - keep going until the clock reaches zero.',
                           he: 'מדבר - תמשיך עד שהשעון מגיע לאפס.' },
  'fl.wpm':              { en: '{n} words per minute', he: '{n} מילים בדקה' },
  'fl.recorded':         { en: 'Recorded', he: 'הוקלט' },
  'fl.nextRound':        { en: 'Next round ({t})', he: 'הסבב הבא ({t})' },
  'fl.seeResult':        { en: 'See your result', he: 'ראה את התוצאה' },
  'fl.doneTitle':        { en: 'Fluency Sprint complete', he: 'סיימת את ספרינט השטף' },
  'fl.round':            { en: 'Round {i}', he: 'סבב {i}' },
  'fl.gainUp':           { en: 'Your speaking rate rose by {n} words per minute from the first telling to the last. That is exactly what this drill is for.',
                           he: 'קצב הדיבור שלך עלה ב-{n} מילים בדקה מהפעם הראשונה לאחרונה. בדיוק בשביל זה התרגיל הזה.' },
  'fl.gainFlat':         { en: 'Your rate did not rise this time. That is normal early on - the gain usually appears once the content feels familiar.',
                           he: 'הקצב לא עלה הפעם. זה נורמלי בהתחלה - השיפור בדרך כלל מגיע כשהתוכן כבר מוכר.' },
  'fl.noSpeech':         { en: 'No speech was detected, so speaking rate could not be measured this time.',
                           he: 'לא זוהה דיבור, אז לא ניתן היה למדוד את קצב הדיבור הפעם.' },

  // --------------------------------------------------------- verdicts
  'v.excellent':         { en: 'Excellent', he: 'מצוין' },
  'v.good':              { en: 'Good', he: 'טוב' },
  'v.gettingThere':      { en: 'Getting there', he: 'מתקדם' },
  'v.tryAgain':          { en: 'Try again', he: 'נסה שוב' },
  'v.recorded':          { en: 'Recorded', he: 'הוקלט' },

  // --------------------------------------------------------- progress
  'pr.yourLevel':        { en: 'Your level', he: 'הרמה שלך' },
  'pr.totals':           { en: 'Totals', he: 'סיכום' },
  'pr.minutesTotal':     { en: 'minutes total', he: 'דקות סה"כ' },
  'pr.sessions':         { en: 'sessions', he: 'תרגולים' },
  'pr.sounds':           { en: 'Sounds to work on', he: 'צלילים לעבוד עליהם' },
  'pr.soundsHint':       { en: 'Weakest first. The app feeds you sentences that target these.',
                           he: 'החלשים ראשונים. האפליקציה מזינה לך משפטים שמכוונים אליהם.' },
  'pr.soundsEmpty':      { en: 'Finish a Repeat & Grade session and your weakest sounds will show up here.',
                           he: 'סיים תרגול "חזור וקבל ציון" והצלילים החלשים שלך יופיעו כאן.' },
  'pr.recent':           { en: 'Recent sessions', he: 'תרגולים אחרונים' },
  'pr.program':          { en: 'Your program', he: 'התוכנית שלך' },
  'pr.longestStreak':    { en: 'longest streak', he: 'הרצף הארוך ביותר' },
  'pr.daysPractised':    { en: '{practised} / {scheduled} days practised', he: '{practised} מתוך {scheduled} ימי תרגול' },
  'pr.programEnds':      { en: 'Scheduled to end {date}', he: 'התוכנית מתוכננת להסתיים ב-{date}' },
  'pr.prevMonth':        { en: 'Previous month', he: 'החודש הקודם' },
  'pr.nextMonth':        { en: 'Next month', he: 'החודש הבא' },
  'pr.trendTitle':       { en: 'Recent accuracy', he: 'דיוק אחרון' },
  'pr.trendEmpty':       { en: 'Finish a few Repeat & Grade sessions to see your trend here.',
                           he: 'סיים כמה תרגולי "חזור וקבל ציון" כדי לראות כאן את המגמה שלך.' },

  // ------------------------------------------------------------- more
  'more.requestTitle':   { en: 'Ask for a change', he: 'בקש שינוי' },
  'more.requestHint':    { en: 'This goes straight to Netanel by email.', he: 'זה נשלח ישירות לנתנאל במייל.' },
  'more.requestPlaceholder': { en: 'Anything you want added, changed, or fixed...',
                           he: 'כל דבר שתרצה שיתווסף, ישתנה או יתוקן...' },
  'more.send':           { en: 'Send request', he: 'שלח בקשה' },
  'more.writeFirst':     { en: 'Write something first.', he: 'תכתוב משהו קודם.' },
  'more.openingMail':    { en: 'Opening your mail app...', he: 'פותח את אפליקציית המייל...' },
  'more.copyRequest':    { en: 'Copy message instead', he: 'העתק את ההודעה במקום זה' },
  'more.requestCopied':  { en: 'Copied. Paste it into Mail, WhatsApp, or however you usually reach Netanel.',
                           he: 'הועתק. הדבק אותו במייל, בוואטסאפ, או בכל דרך שבה אתה בדרך כלל מדבר עם נתנאל.' },
  'more.requestCopyManually': { en: 'Could not copy automatically. The text below is selected - copy it and send it however you like.',
                           he: 'לא הצלחתי להעתיק אוטומטית. הטקסט למטה מסומן - העתק אותו ושלח בכל דרך שתרצה.' },
  'more.requestFallbackHint': { en: 'If Mail did not open, or you are not sure, use this instead - it will not get lost.',
                           he: 'אם המייל לא נפתח, או שאתה לא בטוח, השתמש בזה במקום - זה לא יאבד.' },
  'more.timeTitle':      { en: 'Daily time', he: 'זמן יומי' },
  'more.timeNow':        { en: 'Currently {n} minutes a day over {m} months.',
                           he: 'כרגע {n} דקות ביום, על פני {m} חודשים.' },
  'more.changeTime':     { en: 'Change my daily time', he: 'שנה את הזמן היומי' },
  'more.deviceTitle':    { en: 'Device', he: 'מכשיר' },
  'more.asrOn':          { en: 'Automatic scoring is working on this device.', he: 'ניקוד אוטומטי עובד במכשיר הזה.' },
  'more.asrOff':         { en: 'Automatic scoring is not available here, so drills compare recordings by ear.',
                           he: 'ניקוד אוטומטי לא זמין כאן, אז התרגילים משווים הקלטות באוזן.' },
  'more.redoCheck':      { en: 'Redo sound check', he: 'בצע שוב בדיקת שמע' },
  'more.iosNote':        { en: 'On iPhone, keep using this in Safari rather than adding it to your home screen - recording is more reliable that way.',
                           he: 'באייפון, כדאי להמשיך להשתמש בזה בספארי ולא להוסיף למסך הבית - ההקלטה אמינה יותר ככה.' },
  'more.langTitle':      { en: 'Interface language', he: 'שפת התפריטים' },
  'more.langHint':       { en: 'The practice content always stays in English. This only changes the menus and instructions.',
                           he: 'תוכן התרגול תמיד נשאר באנגלית. זה משנה רק את התפריטים וההוראות.' },
  'more.backupTitle':    { en: 'Backup', he: 'גיבוי' },
  'more.backupHint':     { en: 'Safari can clear saved data if you do not open this for a long time. Back up now and then.',
                           he: 'ספארי עלול למחוק נתונים שמורים אם לא תפתח את זה הרבה זמן. כדאי לגבות מדי פעם.' },
  'more.copyProgress':   { en: 'Copy my progress', he: 'העתק את ההתקדמות שלי' },
  'more.copied':         { en: 'Progress copied. Paste it somewhere safe.', he: 'ההתקדמות הועתקה. הדבק במקום בטוח.' },
  'more.restorePlaceholder': { en: 'Paste a progress backup here', he: 'הדבק כאן גיבוי התקדמות' },
  'more.saveFile':       { en: 'Save a backup file', he: 'שמור קובץ גיבוי' },
  'more.restoreFile':    { en: 'Restore from a backup file', he: 'שחזר מקובץ גיבוי' },
  'more.fileSaved':      { en: 'Backup file ready. Keep it in Files or iCloud.', he: 'קובץ הגיבוי מוכן. שמור אותו ב"קבצים" או ב-iCloud.' },
  'more.restore':        { en: 'Restore from backup', he: 'שחזר מגיבוי' },
  'more.restored':       { en: 'Progress restored.', he: 'ההתקדמות שוחזרה.' },
  'more.restoreFailed':  { en: 'That did not work.', he: 'זה לא עבד.' },
  'more.startOver':      { en: 'Start over from scratch', he: 'התחל מחדש מאפס' },
  'more.confirmReset':   { en: 'Erase all progress and start again?', he: 'למחוק את כל ההתקדמות ולהתחיל מחדש?' },
  'more.copyManually':   { en: 'Could not copy automatically. The text below is selected - copy it now.',
                           he: 'לא הצלחתי להעתיק אוטומטית. הטקסט למטה מסומן - העתק אותו עכשיו.' },
  'more.restoreSnapshot':{ en: 'Undo recent changes', he: 'בטל שינויים אחרונים' },
  'more.confirmRestoreSnapshot': { en: 'This restores your progress to how it was before you opened the app just now - anything from this visit will be lost. Use this only if something looks broken.',
                           he: 'זה משחזר את ההתקדמות שלך למצב שהיה לפני שפתחת את האפליקציה עכשיו - כל מה שנעשה בביקור הזה יאבד. השתמש בזה רק אם משהו נראה שבור.' },

  // ------------------------------------------- why an attempt wasn't graded
  'v.partial':           { en: 'Only part of it was heard', he: 'נשמע רק חלק מהמשפט' },
  'd.partialHint':       { en: 'The app only caught part of what you said, so this one is not counted. Try again - speak in one go, close to the phone.',
                           he: 'האפליקציה קלטה רק חלק ממה שאמרת, ולכן הניסיון הזה לא נספר. נסה שוב - דבר ברצף, קרוב לטלפון.' },
  'asr.no-speech':       { en: 'No words were picked up this time, so there is no score. Compare your recording with the model by ear, or try again a little louder.',
                           he: 'הפעם לא נקלטו מילים, ולכן אין ציון. השווה את ההקלטה למודל באוזן, או נסה שוב קצת יותר חזק.' },
  'asr.disabled':        { en: 'Recognition is off for this device, so compare your recording with the model by ear.',
                           he: 'זיהוי הדיבור כבוי במכשיר הזה, אז השווה את ההקלטה למודל באוזן.' },
  'asr.unsupported':     { en: 'This browser cannot score speech, so compare your recording with the model by ear.',
                           he: 'הדפדפן הזה לא יכול לנקד דיבור, אז השווה את ההקלטה למודל באוזן.' },
  'asr.blocked':         { en: 'Speech recognition was blocked, so there is no score. Check that the browser may use the microphone for this site.',
                           he: 'זיהוי הדיבור נחסם, ולכן אין ציון. בדוק שהדפדפן רשאי להשתמש במיקרופון באתר הזה.' },
  'asr.blockedIOS':      { en: 'iPhone blocked speech recognition. Open Settings > General > Keyboard and turn on Enable Dictation, and make sure Siri & Dictation is allowed - then try again.',
                           he: 'האייפון חסם את זיהוי הדיבור. פתח הגדרות > כללי > מקלדת והפעל "הפעל הכתבה", ודא שסירי והכתבה מותרים - ואז נסה שוב.' },
  'asr.network':         { en: 'Speech recognition needs an internet connection, and it was not reachable. Check your connection and try again.',
                           he: 'זיהוי הדיבור דורש חיבור לאינטרנט, והוא לא היה זמין. בדוק את החיבור ונסה שוב.' },
  'asr.audio-capture':   { en: 'Speech recognition could not use the microphone this time. Close other apps using it and try again.',
                           he: 'זיהוי הדיבור לא הצליח להשתמש במיקרופון הפעם. סגור אפליקציות אחרות שמשתמשות בו ונסה שוב.' },
  'asr.error':           { en: 'Speech recognition hit an error, so there is no score. Compare by ear, or try again.',
                           he: 'זיהוי הדיבור נתקל בשגיאה, ולכן אין ציון. השווה באוזן, או נסה שוב.' },
  'mic.unsupported':     { en: 'Recording is not supported in this browser. Use Safari on iPhone or Chrome on a computer.',
                           he: 'הקלטה לא נתמכת בדפדפן הזה. השתמש בספארי באייפון או בכרום במחשב.' },

  // ------------------------------------------------ sound check (probe)
  'sc.readThis':         { en: 'When you tap the button, read this out loud, clearly:', he: 'כשתלחץ על הכפתור, קרא בקול את המשפט הזה, בבירור:' },
  'sc.probeSentence':    { en: 'The weather is very warm today.', he: 'The weather is very warm today.' },
  'sc.tryAgain':         { en: 'Test again', he: 'בדוק שוב' },
  'sc.tryAnother':       { en: 'Try another method', he: 'נסה שיטה אחרת' },
  'sc.anotherWorked':    { en: 'That method works on this phone - the app will use it.', he: 'השיטה הזו עובדת בטלפון הזה - האפליקציה תשתמש בה.' },
  'sc.recordedNoAsr':    { en: 'Your voice was recorded, but no words were recognised.', he: 'הקול שלך הוקלט, אבל לא זוהו מילים.' },
  'sc.asrReason':        { en: 'Reason: {r}', he: 'סיבה: {r}' },

  // ---------------------------------------------------------- speech lab
  'diag.title':          { en: 'Speech Lab', he: 'מעבדת דיבור' },
  'diag.intro':          { en: 'Tests how this phone combines recording and speech recognition. Tap a method, read the sentence aloud, and watch the result. Send the report to Netanel if scoring does not work.',
                           he: 'בודק איך הטלפון הזה משלב הקלטה וזיהוי דיבור. לחץ על שיטה, קרא את המשפט בקול, וראה את התוצאה. אם הניקוד לא עובד, שלח את הדוח לנתנאל.' },
  'diag.current':        { en: 'Current method: {m}', he: 'השיטה הנוכחית: {m}' },
  'diag.run':            { en: 'Test: {m}', he: 'בדוק: {m}' },
  'diag.use':            { en: 'Use this method', he: 'השתמש בשיטה הזו' },
  'diag.auto':           { en: 'Back to automatic', he: 'חזרה לאוטומטי' },
  'diag.saved':          { en: 'Saved.', he: 'נשמר.' },
  'diag.copy':           { en: 'Copy report', he: 'העתק דוח' },
  'diag.copied':         { en: 'Report copied.', he: 'הדוח הועתק.' },
  'diag.copyManually':   { en: 'Could not copy automatically. The report below is selected - copy it.', he: 'לא הצלחתי להעתיק אוטומטית. הדוח למטה מסומן - העתק אותו.' },
  'diag.recording':      { en: 'Listening for 6 seconds - read the sentence now...', he: 'מקשיב 6 שניות - קרא את המשפט עכשיו...' },
  'diag.result':         { en: 'Result', he: 'תוצאה' },
  'diag.heard':          { en: 'Heard:', he: 'נשמע:' },
  'diag.nothing':        { en: 'nothing', he: 'כלום' },
  'diag.stats':          { en: 'Graded attempts: {g} · not graded: {u}', he: 'ניסיונות שנוקדו: {g} · לא נוקדו: {u}' },
  'diag.open':           { en: 'Speech Lab (advanced)', he: 'מעבדת דיבור (מתקדם)' },
  'diag.mode.auto':      { en: 'Automatic', he: 'אוטומטי' },
  'diag.mode.both-rec-first': { en: 'Record + recognise (recorder first)', he: 'הקלטה + זיהוי (הקלטה קודם)' },
  'diag.mode.both-asr-first': { en: 'Record + recognise (recognition first)', he: 'הקלטה + זיהוי (זיהוי קודם)' },
  'diag.mode.asr-only':  { en: 'Recognition only (no playback)', he: 'זיהוי בלבד (בלי השמעה חוזרת)' },
  'diag.mode.record-only': { en: 'Recording only (no scoring)', he: 'הקלטה בלבד (בלי ניקוד)' },

  // -------------------------------------------------------------- nav
  'nav.today':           { en: 'Today', he: 'היום' },
  'nav.progress':        { en: 'Progress', he: 'התקדמות' },
  'nav.more':            { en: 'More', he: 'עוד' },

  // ---------------------------------------------------------- mic errors
  'mic.insecure':        { en: 'The microphone only works over https:// or http://localhost. This page was opened as a file, so recording is blocked. Run a local server and open http://localhost:8123 instead.',
                           he: 'המיקרופון עובד רק דרך https:// או http://localhost. הדף הזה נפתח כקובץ, ולכן ההקלטה חסומה. הרץ שרת מקומי ופתח במקום זה את http://localhost:8123.' },
  'mic.blockedSafari':   { en: 'Microphone permission was blocked. In Safari, tap "aA" in the address bar, choose Website Settings, and allow the microphone.',
                           he: 'ההרשאה למיקרופון נחסמה. בספארי, לחץ על "aA" בשורת הכתובת, בחר "הגדרות אתר" ואפשר את המיקרופון.' },
  'mic.blockedChrome':   { en: 'Microphone permission was blocked. Click the padlock (or the camera icon) at the left of the address bar, set Microphone to Allow, then reload the page.',
                           he: 'ההרשאה למיקרופון נחסמה. לחץ על המנעול (או על סמל המצלמה) בצד שמאל של שורת הכתובת, הגדר "מיקרופון" ל"אפשר", ורענן את הדף.' },
  'mic.blockedFirefox':  { en: 'Microphone permission was blocked. Click the padlock at the left of the address bar, clear the blocked microphone permission, then reload the page.',
                           he: 'ההרשאה למיקרופון נחסמה. לחץ על המנעול בצד שמאל של שורת הכתובת, בטל את חסימת המיקרופון, ורענן את הדף.' },
  'mic.notFound':        { en: 'No microphone was found on this device.', he: 'לא נמצא מיקרופון במכשיר הזה.' },
  'mic.inUse':           { en: 'The microphone could not start. Close other apps that might be using it, then try again.',
                           he: 'לא ניתן להפעיל את המיקרופון. סגור אפליקציות אחרות שאולי משתמשות בו ונסה שוב.' },
};

// Phoneme coaching. These are the highest-value strings in the app, which is
// exactly why they are translated - a hint he has to decode is a hint wasted.
const PHONEME = {
  th_unvoiced: {
    label: { en: 'TH  —  as in "think"', he: 'TH  —  כמו ב-"think"' },
    hint: { en: 'Tongue tip BETWEEN your teeth, then blow air out. Never "tink", never "sink".',
            he: 'קצה הלשון בין השיניים, ואז נושפים אוויר החוצה. אף פעם לא "tink", אף פעם לא "sink".' } },
  th_voiced: {
    label: { en: 'TH  —  as in "this"', he: 'TH  —  כמו ב-"this"' },
    hint: { en: 'Same tongue between the teeth, but switch your voice ON. Never "dis", never "zis".',
            he: 'אותה לשון בין השיניים, אבל הפעם מדליקים את הקול. אף פעם לא "dis", אף פעם לא "zis".' } },
  w: {
    label: { en: 'W  —  as in "west"', he: 'W  —  כמו ב-"west"' },
    hint: { en: 'Round your lips like blowing out a candle. Your lips must NOT touch your teeth — if they do, "west" turns into "vest".',
            he: 'עגל את השפתיים כמו בכיבוי נר. השפתיים לא נוגעות בשיניים — אם כן, "west" הופך ל-"vest".' } },
  v: {
    label: { en: 'V  —  as in "vest"', he: 'V  —  כמו ב-"vest"' },
    hint: { en: 'Top teeth resting ON your bottom lip, then add voice and buzz. If your lips only round, you said "west".',
            he: 'השיניים העליונות נחות על השפה התחתונה, ואז מוסיפים קול ומזמזמים. אם רק עיגלת שפתיים, אמרת "west".' } },
  vowel_len: {
    label: { en: 'Long vs short vowels', he: 'תנועות ארוכות מול קצרות' },
    hint: { en: 'Hold the vowel long in "sheep"; cut it short in "ship". In English the length changes the word.',
            he: 'מאריכים את התנועה ב-"sheep", ומקצרים ב-"ship". באנגלית האורך משנה את המילה עצמה.' } },
  ed_ending: {
    label: { en: '-ed endings', he: 'סיומות ed-' },
    hint: { en: 'Three different sounds: walked = "walkt", arrived = "arrived", visited = "visit-id".',
            he: 'שלושה צלילים שונים: walked = "walkt", arrived = "arrived", visited = "visit-id".' } },
  articles: {
    label: { en: 'a / an / the', he: 'a / an / the' },
    hint: { en: 'Hebrew has no "a". English needs one before almost every singular noun: "a car", not "car".',
            he: 'בעברית אין "a". באנגלית צריך אותה כמעט לפני כל שם עצם ביחיד: "a car", לא "car".' } },
  r: {
    label: { en: 'R  —  as in "red"', he: 'R  —  כמו ב-"red"' },
    hint: { en: 'Pull the tongue back and let it touch nothing. Never the Hebrew throat R.',
            he: 'משוך את הלשון אחורה כך שלא תיגע בכלום. אף פעם לא הרי״ש הגרונית של עברית.' } },
  h: {
    label: { en: 'H  —  as in "house"', he: 'H  —  כמו ב-"house"' },
    hint: { en: 'A soft breath out, like fogging a window. Do not drop it, and do not harden it into "ch".',
            he: 'נשיפה רכה, כמו לאדות חלון. לא להשמיט אותה, ולא להקשיח אותה ל-"ח".' } },
  perfect: {
    label: { en: 'Present perfect', he: 'Present perfect' },
    hint: { en: '"I have lived here for 3 years" — started in the past and is still true now.',
            he: '"I have lived here for 3 years" — התחיל בעבר ועדיין נכון עכשיו.' } },
};

const LEVEL_NAMES = {
  preA1: { en: 'Beginner',           he: 'מתחיל' },
  A1:    { en: 'Elementary',         he: 'בסיסי' },
  A2:    { en: 'Pre-intermediate',   he: 'טרום-בינוני' },
  B1:    { en: 'Intermediate',       he: 'בינוני' },
  B2:    { en: 'Upper-intermediate', he: 'בינוני-גבוה' },
};

// Single-glyph weekday abbreviations, 0=Sun..6=Sat - used for both the
// calendar's column headers and the practice-day picker in viewBudget.
const WEEKDAY_NAMES = [
  { en: 'Sun', he: 'א' },
  { en: 'Mon', he: 'ב' },
  { en: 'Tue', he: 'ג' },
  { en: 'Wed', he: 'ד' },
  { en: 'Thu', he: 'ה' },
  { en: 'Fri', he: 'ו' },
  { en: 'Sat', he: 'ש' },
];

let current = 'he';

export function getLang() { return current; }

export function setLang(lang) {
  current = lang === 'en' ? 'en' : 'he';
  applyDir();
  return current;
}

/** Hebrew reads right-to-left; the whole document flips with it. */
export function applyDir() {
  const root = document.documentElement;
  root.lang = current;
  root.dir = current === 'he' ? 'rtl' : 'ltr';
}

/** Translate a key, filling {placeholders} from `vars`. */
export function t(key, vars) {
  const entry = S[key];
  let text = entry ? (entry[current] ?? entry.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

export function phoneme(tag) {
  const p = PHONEME[tag];
  if (!p) return null;
  return { label: p.label[current] ?? p.label.en, hint: p.hint[current] ?? p.hint.en };
}

export function levelName(level) {
  const l = LEVEL_NAMES[level];
  return l ? (l[current] ?? l.en) : level;
}

/** Part-of-speech label for a vocab entry's `pos` field ('n'/'v'/'adj'). */
export function posLabel(pos) {
  return t(`vc.pos.${pos}`);
}

/** Weekday abbreviation for `n` (0=Sun..6=Sat), in the current language. */
export function weekdayShort(n) {
  const w = WEEKDAY_NAMES[n];
  return w ? (w[current] ?? w.en) : '';
}
