// Phase 6 · Loop 10: the skills store.
// Notes = material to pull from. Brain = rules (every time). Skills = procedures an agent RUNS.
//
// A skill is plain English: name, owner agent, when to use it, steps, the "done" test, the
// "never" list, and the tools (code) it uses. Seeded from RISE_Agent_SOPs.md section 4.
// `wired` is honest: true ONLY when code in the app actually runs it today. A skill with no
// code behind it says "new, not wired yet" and nothing pretends otherwise.
//
// Agents read the skill when they take a matching job (skillPrompt) and name it in their
// receipt (skillTag via completeHandoff). A request no skill covers goes to the build log.
// Mandi can read and edit every skill (Assistants tab → Skills). Her edits are never overwritten
// by a re-seed.

import { readDb, writeDb, addBuildLogEntry, getBuildLog, type Skill, type SkillOwner, type HandoffKind } from './db'
import { cut } from './jsonkit'

type Seed = Omit<Skill, 'created_at' | 'updated_at' | 'runs' | 'last_run_at' | 'edited_by'>

const S = (id: string, owner: SkillOwner, sop: string, name: string, when: string, steps: string[], done: string, never: string[], tools: string[], wired: boolean, wired_note: string): Seed =>
  ({ id, owner, sop, name, when, steps, done, never, tools, wired, wired_note })

export const SKILL_SEED: Seed[] = [
  // ── Her ──
  S('her-pick-up', 'her', 'Her 1', 'Pick up', 'Mandi opens a conversation.',
    ['Read the goals, the map, the money, Notes and any questions Commander sent back. Read the killed pile when the map or the goals have changed.', 'Meet her where she is.', 'Think with her.', 'Push back: name the strongest reason this fails and what she may be avoiding.'],
    'She has said what she came to say and knows where it is going.', ['Turn a half-formed thought into a task.', 'Create, change or send anything.'],
    ['lib/her.ts herSay', 'HerPanel'], true, 'Her reads the goals, the thread and its receipts and pushes back once. She does not read the money or the killed pile yet.'),
  S('her-hand-over', 'her', 'Her 2', 'Hand over a decision', 'Mandi decides something, or a conversation leaves ideas worth using.',
    ['For a decision, say it back in one sentence.', 'Save the note to Notes as it is. Do not tidy it or pick out the pieces; that is Commander’s job.', 'Hand it to Commander by name.'],
    'Commander has it and Mandi knows he has it.', ['Turn a private reflection into content unless she asks.'],
    ['lib/her.ts herSay', 'handoffs (her_note)'], true, 'Runs on every message to Her.'),
  S('her-morning-brief', 'her', 'Her 3', 'Morning brief', 'Mandi asks for her brief (until a timer is turned on).',
    ['Read Commander’s report: what the agents did, Cap’s assignments, Biz’s proposals, any questions.', 'Read the final drafts waiting for review.', 'Check what Mandi has on: her cycle, events, travel, what she is going through.', 'Set the order and size the day to fit.', 'Present it: what was done, today’s create list, what to approve, what to decide.'],
    'Mandi can work top-down with an empty head.', ['Add work that is not on Cap’s list.', 'Leave out something Mandi must decide.', 'Pass her personal context down the line.'],
    ['/api/brief (older)', '/api/health?for=her'], false, 'Not wired as Her’s. The older Brief page exists; Her shows Man’s health report and the agents’ ideas, not a full brief.'),
  S('her-present-drafts', 'her', 'Her 4', 'Present drafts for review', 'A final draft is ready for Mandi.',
    ['Present it with the one-line purpose from its brief.', 'Take Mandi’s answer: approved, or one note.', 'If approved, tell Commander so Cap has it for its date.', 'If there is a note, pass it to the writer in her words.'],
    'Every waiting draft has her yes or her one note.', ['Change the draft.', 'Soften or reword her note.'],
    [], false, 'Not wired. Drafts are approved where they live (People → Reset emails, the card, Story).'),
  S('her-nightly-journal', 'her', 'Her 5', 'Nightly journal', 'Mandi journals with Her at night.',
    ['Listen to the debrief and the decompress.', 'Store her gratitudes.', 'Note what she has on and what she is going through.', 'Read her calendar for events and travel.', 'Use it to size tomorrow and order the brief.'],
    'Tomorrow is sized to what she has on.', ['Pass any of it down the line.', 'Turn it into content unless she asks.'],
    [], false, 'Not wired. Her marks private reflections “private” and routes nothing, but there is no journal mode.'),
  S('her-build-log', 'her', 'Her 6', 'Keep the build log', 'Mandi has an idea for changing RISE, the health check finds something that needs a build, or an agent has no skill for a request.',
    ['Write it in the build log as “to do”, in her words.', 'Tell her it is logged.', 'Bring the list to the next build session.'],
    'It is on the build log and she knows it.', ['Let a RISE change interrupt the day’s list.'],
    ['lib/her.ts (rise_change)', 'lib/health.ts', 'lib/skills.ts noSkill', '/api/buildlog'], true, 'Her logs RISE changes; the health check logs build findings; a request with no skill is logged.'),
  S('her-weekly-review', 'her', 'Her 7', 'Weekly review', 'Once a week, with Mandi.',
    ['Go through what moved, what did not, and what to stop.', 'Read the killed pile and bring back anything that now fits.', 'Bring Mandi the rules the weekly health check flagged as conflicting or stale.', 'Hand her decisions to Commander.'],
    'Mandi has decided on every flagged rule and every returning idea.', ['Change a rule herself. Only Mandi changes a rule.'],
    ['lib/health.ts (full check flags rules)'], false, 'Not wired as a conversation. The weekly full health check already lists stale and conflicting Brain rules for it.'),

  // ── Commander ──
  S('commander-read-three-ways', 'commander', 'Commander 1', 'Read a note three ways', 'Her hands over a note, or Mandi drops something directly.',
    ['Read it for what it says: the ideas stated outright.', 'Read between the lines: what is implied, the feeling under it, the question she did not ask.', 'Go meta: set it against the goals, the map, the money and what she has said before.', 'Shred it into every usable piece. One note can become many.', 'Decide where each piece goes: Biz, Cap, both; Notes with the reason if killed; or back to Her with a question only Mandi can answer.', 'Hand each piece off by name, with the line of hers it came from.', 'Report back what the note became.'],
    'Every piece has gone to Biz, Cap, Notes or back to Her, and Her can see where.', ['Write the piece.', 'Decide if or when it runs (Cap’s or Biz’s call).', 'Pass off his own reading as her words; a piece from between the lines is labeled as his reading.'],
    ['lib/her.ts runCommanderPickup', 'handoffs (her_note → piece)'], true, 'Runs on every her_note handoff.'),
  S('commander-route-request', 'commander', 'Commander 2', 'Route any request', 'Mandi asks for something directly that is not an idea to evaluate.',
    ['Decide whose job it is: business to Biz, content to Cap, anything else worth keeping to Notes.', 'Hand it off by name with what is needed.', 'Read what came back.', 'Reply with what happened, quoting the receipt.'],
    'Every action asked for has a receipt or a stated failure.', ['Claim an action without a receipt.', 'Write the piece himself.', 'Decide what belongs on the map.'],
    ['lib/commanderTools.ts', 'CommanderChat'], true, 'Commander chat has real tools; he still writes cards there, which the SOP now forbids.'),
  S('commander-report-to-her', 'commander', 'Commander 3', 'Report to Her', 'Her asks, or before the morning brief.',
    ['Read goals, queue, Activity, the map and the health check.', 'Collect Cap’s report: assignments, what is waiting, the winners.', 'Collect Biz’s report: proposals and open offers.', 'Report to Her what the agents did since Mandi last looked, with receipts, and what needs Mandi: film, approve, post, decide.', 'Carry the agents’ ideas up, labeled with who they came from (one or two each).'],
    'Her has one combined report and knows exactly what needs Mandi.', ['Set the order of Mandi’s day. That is Her’s.'],
    ['lib/health.ts healthForHer', 'lib/ideas.ts', '/api/health?for=her'], true, 'Phase 6: the quick health check runs every time Her opens, the full one weekly; ideas ride up with it. Cap’s and Biz’s written reports are not wired yet.'),
  S('commander-make-room', 'commander', 'Commander 4', 'Make room', 'Biz proposes something new.',
    ['Say what is already in flight and what it would displace.', 'Decide with Cap if there is room and when.', 'Take the answer to Mandi for approval.'],
    'Mandi has said yes or no to the proposal with the trade-off in front of her.', ['Displace planned work without her yes.'],
    [], false, 'Not wired. Biz proposals have no runner yet.'),
  S('commander-plan-to-tasks', 'commander', 'Ops → skill', 'Plan to tasks', 'A plan or project needs breaking down.',
    ['Break the plan into small concrete tasks.', 'Give each a date and a “done” test.', 'Create the tasks and set the project’s next action.'],
    'Every active project has a live next action.', ['Post, spend or send anything.'],
    ['/api/cron/plan-projects'], true, 'Runs daily for active projects (needs CRON_SECRET to get past the station lock).'),

  // ── Cap ──
  S('cap-brief-drop', 'cap', 'Cap 1', 'Brief a drop', 'Any idea, line, story or file arrives.',
    ['Run the repeat search so she never repeats herself, and look in Notes for work that already exists.', 'Check it against the map.', 'Write the brief: who it is for, the post’s job, the goal, the campaign, the account, the date.', 'Send the brief to the right writer, or straight to review if her writing is finished.', 'If it needs something only Mandi knows, ask one question.', 'If it fits nowhere, store it in Notes with a one-line reason.'],
    'The drop has a brief, a question or a note, and Activity shows which.', ['Write the piece.', 'Invent a missing detail.', 'Delete anything.', 'Publish.'],
    ['lib/cap.ts runFootageIn', 'lib/sortingHat.ts (repeat search)'], true, 'Wired for footage landing on a card (footage_in). Pieces from Commander wait for the next plan fill.'),
  S('cap-transcript-to-briefs', 'cap', 'Cap 2', 'Break a transcript into briefs', 'The transcription tool finishes.',
    ['Match the transcript to its create-list item; if it matches, mark it created and send it to the writer.', 'If unplanned, find each distinct story or point.', 'Keep her exact words as the source quote.', 'Run Brief a drop on each one.', 'Report what was matched, briefed, asked and stored.'],
    'Every point in the transcript has a brief, a question or a note.', ['Summarize in place of her words.'],
    ['/api/transcribe'], false, 'Not wired. Transcription stops after saving the transcript.'),
  S('cap-run-campaign', 'cap', 'Cap 3', 'Run a campaign', 'A plan on the map is promoting or winding down.',
    ['Read the plan: product, goal, audience, angle, dates.', 'Check what that audience already received.', 'Brief the whole sequence as one connected set.', 'After Mandi approves, send a test to her first.', 'Send each approved email on its date and log every send.', 'Report sent, failed and skipped.', 'When the last piece is out, mark the plan complete.'],
    'Every approved piece went out on its date or has a stated reason it didn’t.', ['Send without approval.', 'Email anyone who unsubscribed.', 'Send without a working unsubscribe link.'],
    ['lib/resetSequence.ts', '/api/reset-sequence'], true, 'Wired for the Reset sequence only (Phase 5). Every live switch is off.'),
  S('cap-weigh-winners', 'cap', 'Cap 4', 'Weigh the winners', 'Results come in (a Meta export is imported).',
    ['Read which pieces won and which fell flat.', 'Separate what the numbers show from what is a guess, and say how sure.', 'Record one hypothesis and one experiment that changes exactly one thing.', 'Ride the experiment onto that account’s next weekly plan draft.', 'Tell Commander what moved.'],
    'The account’s next plan draft carries one experiment.', ['Copy a winner.'],
    ['lib/capWinners.ts', '/api/results/cap'], true, 'Runs on winners_in.'),
  S('cap-keep-map-honest', 'cap', 'Cap 5', 'Keep the map honest', 'A goal’s deadline has passed, a promotion has ended, or a plan is finished.',
    ['Flag it.', 'Propose turning it off.', 'On her yes, update it and tell the writers who were working toward it.'],
    'Nothing past its date is still steering the work.', ['Turn anything off without her yes.'],
    ['lib/health.ts (direction checks)'], true, 'Phase 6: the health check flags expired goals, ended promotions and lapsed plans. Turning them off is still her click.'),
  S('cap-fan-across', 'cap', 'Cap 6', 'Fan an idea across accounts', 'An idea serves more than one account.',
    ['Name only the accounts it truly fits and the angle for each.', 'Open the cross-account preview.', 'Brief nothing until Mandi approves the plan.'],
    'Each chosen account has its angle and Mandi has approved.', ['Fan to an account it doesn’t fit.'],
    ['lib/sortingHat.ts'], true, 'Inside Hat’s engine (now Cap’s).'),
  S('cap-assign-create', 'cap', 'Cap 7', 'Assign what to create', 'A new week starts, or the map changes.',
    ['Read the map, the goals and the pace.', 'Read Ten’s trend note and the latest winners.', 'Write the assignments: what to film, for which account, why it serves the goal, by when.', 'Write each in her style and humor, from her words where they exist.', 'Hand the list to Commander for the morning brief.'],
    'Mandi can open the brief and know exactly what to create today.', ['Assign more than the cadence calls for.', 'Assign something that serves no goal on the map.'],
    ['lib/plan.ts proposeWeekly + generateCalendar', 'ContentDay'], true, 'Cap’s weekly plans and calendar fill (Phase 2) land on Content Day. The written assignment list for the brief isn’t wired.'),
  S('cap-sweep-notes', 'cap', 'Cap 8', 'Sweep Notes against the map', 'The map changes, and once a week.',
    ['Read each goal on the map.', 'Search Notes for drafts, scripts and pitches that already serve it.', 'Propose what fits: which goal, who it is for, and by when.', 'Send finished writing to review.', 'Put it in the daily report, marked “ready to send” when it is outreach Mandi sends herself.'],
    'Nothing new is briefed while finished work that fits is sitting in Notes.', ['Send it himself.', 'Read the killed pile, which is Her’s.', 'Put it on the plan himself without the plan tool.'],
    ['lib/sweep.ts', '/api/sweep'], true, 'Phase 6b: Cap proposes; Ed checks; Her shows “ready for you to send”; you mark it sent. It never touches the plan.'),
  S('cap-tend-people', 'cap', 'Cap 9', 'Tend the People list', 'A campaign is planned, before any send, and when replies or unsubscribes come back.',
    ['Choose the audience by its labels.', 'Check what those people already received.', 'Skip anyone who unsubscribed or bounced.', 'Put follow-up with guests and clients on the map as its own campaign.', 'Read the replies; send up through Commander any that need Mandi.', 'Keep the labels current.'],
    'Every send goes only to people who should get it, with the reason logged for each skip.', ['Send without Mandi’s approval.', 'Send personal outreach, which is Mandi’s to send.'],
    ['db.ts listsOf', 'lib/resetSequence.ts decide()', '/api/email/resend-webhook'], true, 'Eligibility and lists per branch (Phase 5); bounces from Resend mark the contact (Phase 6). Replies are not read yet.'),

  // ── Rex ──
  S('rex-write-from-brief', 'rex', 'Rex 1', 'Write from a brief', 'Cap sends a short-form brief.',
    ['Read the brief and that account’s voice.', 'Pull her words from the Well and Notes.', 'Write an on-screen hook that is a statement, and a caption first line that opens a different door.', 'Save the card.', 'Hand to review.'],
    'The card has its hook, caption and one call to action, and is with Cap for review.', ['Write without a brief.', 'Change the brief.'],
    ['lib/cap.ts runWrite'], true, 'Since the Nov 22 reversal Ed writes short-form captions from Cap’s brief (runWrite); Rex himself is advice-only.'),
  S('rex-sharpen-card', 'rex', 'Rex 2', 'Sharpen a card', 'A draft is sent back as flat.',
    ['Find the golden thread.', 'Keep her near-verbatim lines where they already land.', 'Update the card.'],
    'The card reads sharper and keeps her lines.', ['Replace her lines that already land.'],
    ['lib/cap.ts runRewrite'], true, 'Rewrites after Cap sends a caption back.'),
  S('rex-daily-format-set', 'rex', 'Rex 3', 'Daily format set', 'On Cap’s brief, for one account.',
    ['From her words, produce the day’s set: one b-roll reel, one carousel, one recorded video.'],
    'The account has its three for the day.', ['Invent her words.'],
    [], false, 'Not wired as a skill.'),
  S('rex-campaign-emails', 'rex', 'Rex 4', 'Campaign emails', 'Cap briefs a sequence, an episode sequence or a welcome.',
    ['Write the whole sequence as one connected set, each email building on the last.', 'Fill the template slots: subject, preview line, heading, body, button.', 'Save the drafts.', 'Hand to review.'],
    'Every email in the set is drafted and with Cap for review.', ['Add a price or offer that isn’t real.'],
    ['lib/resetSequence.ts runEmailWrite'], true, 'Ed writes these today (Phase 5); Cap reviews; Mandi approves.'),

  // ── Pod ──
  S('pod-plan-episode', 'pod', 'Pod 1', 'Plan the next episode', 'The next podcast episode is due.',
    ['Read the episode table and the current arc.', 'Read banked notes.', 'Propose the next episode: theme, the move, the pushback, the human thread.', 'Add the row on her yes.'],
    'The next episode has a proposed theme and her yes or no.', ['Add the row without her yes.'],
    ['/api/podcast', 'PodcastEngine'], true, 'Each step is clicked by Mandi in Podcast.'),
  S('pod-write-script', 'pod', 'Pod 2', 'Write or revise a script', 'An episode needs its teleprompter script.',
    ['Pull banked transcripts and notes for that episode.', 'Weave them in her podcast voice.', 'Include the pushback.', 'Save the script to the episode and a note.', 'Hand to review.'],
    'The script is saved and carries the pushback.', ['Archive or discard her backlog.'],
    ['/api/podcast', 'PodcastEngine'], true, 'Clicked by Mandi in Podcast; no review pass yet.'),
  S('pod-show-kit', 'pod', 'Pod 3', 'Build the show kit', 'An episode is recorded and transcribed.',
    ['Title, description, chapters.', 'Reel scripts from her real lines.', 'Hand the reel scripts and the episode summary to Cap.'],
    'The kit is saved and Cap has what he needs.', ['Write reel lines she didn’t say.'],
    ['/api/podcast (kit)'], true, 'The kit is built in Podcast; the hand to Cap is by hand.'),
  S('pod-write-from-outline', 'pod', 'Pod 4', 'Write from an outline', 'Cora hands over a story outline, or Biz and Cap hand over a Substack outline.',
    ['Read the outline and its emphasis.', 'Pull her words from banked transcripts, the Well and Notes.', 'Write it in the form asked for: teleprompter script, Medium article or Substack piece.', 'Save it.', 'Hand to Ed.'],
    'The piece is saved and with Ed.', ['Change the point of the outline.'],
    ['lib/longform.ts runLongformWrite'], true, 'Phase 6b: Medium, teleprompter and Substack, from Cora’s or Biz + Cap’s outline.'),
  S('pod-meditation-script', 'pod', 'Pod 5', 'Meditation script', 'Cap briefs a meditation.',
    ['Read the brief.', 'Write it in her meditation voice, following her saved meditation voice rules.', 'Save it.', 'Hand to Ed.'],
    'The script is saved and with Ed.', ['Promise treatment or results.'],
    [], false, 'Not wired.'),

  // ── Cora ──
  S('cora-untangle', 'cora', 'Cora 1', 'Untangle the stories', 'Several stories arrive tangled together.',
    ['Separate them and name each.', 'File each as its own note.'],
    'Each story has its own name and note.', ['Merge stories that are separate.'],
    ['lib/storyDesk.ts runStory'], true, 'Phase 6b: runs first on every story Cap sends.'),
  S('cora-form-story', 'cora', 'Cora 2', 'Form a story', 'Cap sends her a story with the goal and campaign it serves.',
    ['Ask Owl for the facts and sources.', 'Ask Ten what headlines already exist and what take is open.', 'Determine the story: the take only Mandi has.', 'Outline it.', 'Mark the emphasis: the line or moment that carries it.', 'Hand the outline to Pod, saying teleprompter or Medium.', 'Tell Cap so it gets a date.', 'If it does not hold up, store it in Notes with the reason.'],
    'Pod has an outline with its emphasis, or the story is in Notes with the reason.', ['Write the piece.', 'Present a guess as a finding.'],
    ['lib/storyDesk.ts runStory', 'Owl + Ten (story_check)'], true, 'Phase 6b: Owl and Ten use live web search when the Anthropic key is set, and say so when they can’t.'),

  S('cora-find-stories', 'cora', 'Cora · Well', 'Find the stories in her captions', 'Mandi asks Cora to read the Well (her 697 captions) for stories.',
    ['Read every caption, year by year, and pull story seeds with her exact words and dates.', 'Against who she is now and what she is building, pick the 6–8 strongest stories (threads can run across years).', 'For each: the take, why now, the branch and form, 3 clickable headlines, and the lines of hers it is built from.', 'Run Ed’s guardrail check on each pitch; flag generic headlines.', 'Put them in Approve. Her pick goes through the Story desk; a pass goes to Notes with her reason.'],
    'Mandi has 6–8 specific stories with headlines she would click.', ['Use a child’s or a real person’s name.', 'Write generic inspiration headlines.', 'Write the piece (Pod does).'],
    ['lib/storyDesk.ts runFindStories', 'POST /api/stories {action:"find"}'], true, 'Built Nov 24 at Mandi’s request.'),
  S('cora-interview', 'cora', 'Cora · Interview', 'Interview Mandi for Medium stories', 'Mandi starts an interview on the Story desk (Medium, lived experience for people struggling with loss, depression, anxiety).',
    ['Read every caption like a journalist: where she touches loss, depression, anxiety. Note the question a good interviewer would ask, with the captions that raised it.', 'Order the notebook gentle to deep; ask ONE question at a time.', 'Listen for the charge (a specific detail, a turn, a contradiction, a line she has never said out loud) and follow it, two follow-ups at most; mark it as a charged point in her words.', 'She can skip anything or mark it off limits; never push.', 'When she says shape it: turn the charged points into 3–5 Medium story shapes (reader, take, headlines, opening from her words, beats), Ed checks each, they wait in Approve.', 'File the interview transcript in Notes.'],
    'Mandi has Medium stories built from what she actually said, aimed at one struggling reader each.', ['Act as her therapist, diagnose, or promise healing or treatment.', 'Name a real person or a child.', 'Invent a detail she did not say or write.', 'Write the piece (Pod does).'],
    ['lib/coraInterview.ts', '/api/interview'], true, 'Built Nov 24 at Mandi’s request.'),

  // ── Ed ──
  S('ed-check-draft', 'ed', 'Ed 1', 'Check a draft', 'A writer finishes, or Mandi’s finished writing comes in.',
    ['Check it against the brief.', 'Check it against the voice lessons.', 'Check the rules: real people protected, one call to action, two different hooks, her words kept.', 'Pass it on for Mandi’s review, or send it back with the one thing to fix.'],
    'The draft is passed, or back with its writer with one named fix.', ['Rewrite the piece.', 'Change her meaning.'],
    ['lib/review.ts', 'lib/cap.ts runReview'], true, 'The checks run as Cap’s review since the Nov 22 reversal (the verdict field is still named `ed`).'),
  S('ed-translate', 'ed', 'Ed 2', 'Translate', 'Any agent or Mandi sends dense text.',
    ['Dense text into mom language, Mandi’s text into plain English, complex thoughts into simple outlines.', 'Keep the meaning.'],
    'The meaning is the same and a tired mom can read it once.', ['Change the meaning.'],
    [], false, 'Not wired.'),
  S('ed-voice-lesson', 'ed', 'Ed · skill', 'Record a voice lesson', 'Mandi edits a draft.',
    ['Compare the before and after.', 'Save at most one specific lesson per edit.', 'Skip generic advice or anything the 15 core rules already cover.'],
    'The lesson is in the Brain and the writers read it next time.', ['Save generic advice.'],
    ['lib/learn.ts', '/api/content/learn'], true, 'Runs on edits in Accounts and on Commander chat edits.'),

  S('cap-substack-series', 'cap', 'Cap · Substack', 'Propose the Substack backlog series', 'Once, before the first issue (and when the build history grows).',
    ['Read the build history (RISE_*.md, the audit, the build log, git history, the Brain).', 'Find the arc: the pivots, what broke, what worked, what it cost in time.', 'Propose 6–10 issues in order: one turn of the story, one lesson a mom can use, the parenting moment only if Mandi has one.', 'Wait for Mandi’s yes before any issue is outlined.'],
    'Mandi has a 6–10 issue series to approve or edit.', ['Invent a parenting moment.', 'Promise or imply income.', 'Name a real person.', 'Invent a cadence.'],
    ['lib/substack.ts runSeries'], true, 'Phase 6b.'),

  // ── Biz / Fin ──
  S('biz-shape-offer', 'biz', 'Biz 1', 'Shape an offer', 'A new offer or business is proposed.',
    ['Who it is for and the problem in her words.', 'What she gets and by when.', 'Price and the one next step.', 'Ask Owl what the market already has.', 'Ask Fin to pressure-test the numbers.', 'Propose it to Cap and Commander.'],
    'Cap and Commander have a proposal with Fin’s numbers.', ['Put anything on the map himself.', 'Change an offer without Mandi.'],
    [], false, 'Not wired. Biz is an advice persona (client_offer).'),
  S('biz-substack-outline', 'biz', 'Biz 2', 'Outline a Substack piece (with Cap)', 'The map calls for a Substack issue.',
    ['Work it out with Cap: Biz brings the business angle, Cap brings the campaign and the date.', 'Outline it together.', 'Hand the outline to Pod.'],
    'Pod has an outline with one turn of the story and one lesson a mom can use.', ['Write the piece.', 'Promise or imply income.'],
    ['lib/substack.ts runOutline'], true, 'Phase 6b: Biz brings the angle, Cap the beats; Pod writes.'),
  S('biz-build-brief', 'biz', 'Biz 3', 'Build brief', 'An idea needs a site, a page or a product stood up.',
    ['Check it is feasible: room on the map with Cap, demand with Ten, what exists with Owl, the numbers with Fin.', 'Write the brief: what it is, who for, the offer and price, the pages, the copy needed, the look, how people sign up and pay, what “live” means.', 'Hand the brief to Mandi for a build session.'],
    'Mandi can take the brief straight into a build session.', ['Build it himself.', 'Start before Mandi approves the initiative.'],
    [], false, 'Not wired.'),
  S('fin-pressure-test', 'fin', 'Fin 1', 'Pressure-test a spend', 'Biz asks.',
    ['State the cost and what it must return.', 'Say what it replaces.', 'Give a yes, no, or “not yet, until X.”'],
    'Biz has a yes, no or not-yet with the number behind it.', ['Promise a financial result.'],
    [], false, 'Not wired. Fin is an advice persona (cfo).'),

  // ── Ten / Owl ──
  S('ten-trend-scan', 'ten', 'Ten 1', 'Trend scan', 'Weekly (Monday), or when asked.',
    ['Search what is working this week in her niches.', 'Cite sources.', 'Save one trend note: sounds, formats, hooks, and what only she can film.', 'Hand the “only you can film this” list to Commander.'],
    'One cited trend note is in Notes.', ['Present a guess as a trend.'],
    ['/api/cron/trend-checkin'], true, 'Runs weekly from instrumentation.ts (needs CRON_SECRET past the lock).'),
  S('ten-story-check', 'ten', 'Ten 2', 'Answer a story check', 'Cora asks about a story.',
    ['Find the headlines already out on it.', 'Say what angle is taken and what is open.', 'Cite sources.'],
    'Cora knows what is taken and what is open, with sources.', ['Present a guess as a finding.'],
    ['lib/storyDesk.ts research'], true, 'Phase 6b: one research call per story.'),
  S('owl-dig', 'owl', 'Owl 1', 'Dig', 'Any agent or Mandi needs research.',
    ['Research the question with sources.', 'Save findings to Notes.', 'Say what is solid and what is uncertain.'],
    'The findings are saved with sources and a solid / uncertain split.', ['Present a guess as a finding.'],
    ['lib/fable.ts researchWithWeb', '/api/research'], true, 'Research desk with live web search.'),

  // ── Tools ──
  S('tool-transcription', 'tool', 'Tool', 'Transcription', 'Audio or video comes in.',
    ['Transcribe.', 'Clean filler without changing her words.', 'Save to Notes tagged with its source.', 'Log to Activity.', 'Pass to Cap (or Pod if it is an episode).'],
    'The transcript is in Notes and Cap (or Pod) has it.', ['Summarize in place of transcribing.'],
    ['/api/transcribe'], true, 'Transcribes and saves; the pass to Cap is not wired.'),
  S('tool-health-check', 'tool', 'Tool', 'Health check', 'Every time Commander reports to Her (quick), and weekly (full).',
    ['Confirm each connection answers (writers, Resend, media storage, the Well, the Brain).', 'Look for stuck work (failed or stuck handoffs, scheduled but not posted, uploads that stopped, calendar dates passed with nothing made, unanswered questions).', 'Look for stale direction (expired goals, ended promotions, lapsed plans, stale or conflicting Brain rules, database size and backups).', 'Check the Reset sequence (blank settings, drafts waiting on approval, next Reset not imported, touches due but held).', 'Report in plain English with the one next fix. Anything that needs a build goes in the build log.'],
    'Every problem has one next fix and says who acts on it.', ['Change code or data.', 'Send anything.', 'Block Mandi.'],
    ['lib/health.ts', '/api/health'], true, 'Phase 6.'),
]

const nowIso = () => new Date().toISOString()

// Seeds once, then adds any seed skill that is new in code. Never overwrites a skill Mandi edited;
// for seed-owned skills it refreshes `wired` and the note so they stay honest as code changes.
export function getSkills(): Skill[] {
  const db = readDb()
  const now = nowIso()
  db.skills ??= []
  let changed = false
  for (const s of SKILL_SEED) {
    const have = db.skills.find(x => x.id === s.id)
    if (!have) { db.skills.push({ ...s, runs: 0, last_run_at: null, edited_by: 'seed', created_at: now, updated_at: now }); changed = true }
    else if (have.edited_by !== 'mandi' && (have.wired !== s.wired || have.wired_note !== s.wired_note || JSON.stringify(have.tools) !== JSON.stringify(s.tools))) {
      Object.assign(have, { wired: s.wired, wired_note: s.wired_note, tools: s.tools, updated_at: now }); changed = true
    }
  }
  if (changed) writeDb(db)
  return db.skills
}

export function getSkill(id: string): Skill | null { return getSkills().find(s => s.id === id) ?? null }

// Mandi edits a skill in the app. Her text is hers from then on (a re-seed won't touch it).
// `wired` is not hers to set by hand: it says whether code runs it.
export function editSkill(id: string, patch: Partial<Pick<Skill, 'name' | 'when' | 'steps' | 'done' | 'never'>>): Skill | null {
  getSkills()
  const db = readDb()
  const s = (db.skills ?? []).find(x => x.id === id)
  if (!s) return null
  if (patch.name !== undefined) s.name = cut(patch.name.trim(), 120) || s.name
  if (patch.when !== undefined) s.when = cut(patch.when.trim(), 600)
  if (patch.done !== undefined) s.done = cut(patch.done.trim(), 600)
  if (patch.steps) s.steps = patch.steps.map(x => cut(String(x).trim(), 600)).filter(Boolean).slice(0, 20)
  if (patch.never) s.never = patch.never.map(x => cut(String(x).trim(), 400)).filter(Boolean).slice(0, 12)
  s.edited_by = 'mandi'
  s.updated_at = nowIso()
  writeDb(db)
  return s
}

// The text an agent reads before it runs a skill (goes into its instructions).
export function skillPrompt(id: string): string {
  const s = getSkill(id)
  if (!s) return ''
  return `THE SKILL YOU ARE RUNNING: ${s.sop} · ${s.name}\nWhen: ${s.when}\nSteps:\n${s.steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}\nDone when: ${s.done}\nNever: ${s.never.join(' / ')}`
}

// Which skill a handoff runs, so its receipt can name it.
export const SKILL_FOR_KIND: Partial<Record<HandoffKind, string>> = {
  footage_in: 'cap-brief-drop',
  write: 'rex-write-from-brief',
  review: 'ed-check-draft', ed_check: 'ed-check-draft',
  rewrite: 'rex-sharpen-card',
  her_note: 'commander-read-three-ways',
  winners_in: 'cap-weigh-winners',
  film_now: 'cap-assign-create',
  email_write: 'rex-campaign-emails', email_rewrite: 'rex-campaign-emails',
  email_review: 'ed-check-draft',
  sweep: 'cap-sweep-notes',
  story: 'cora-form-story',
  story_check: 'owl-dig',
  longform_write: 'pod-write-from-outline',
  longform_check: 'ed-check-draft',
  substack_series: 'cap-substack-series',
  substack_outline: 'biz-substack-outline',
  story_find: 'cora-find-stories',
  interview_prep: 'cora-interview',
  interview_shape: 'cora-interview',
}

// Count a run and return the line a receipt carries: "Skill: Cap 4 · Weigh the winners".
export function ranSkill(id: string): string {
  getSkills()
  const db = readDb()
  const s = (db.skills ?? []).find(x => x.id === id)
  if (!s) return ''
  s.runs = (s.runs ?? 0) + 1
  s.last_run_at = nowIso()
  writeDb(db)
  return `Skill: ${s.sop} · ${s.name}`
}

// An agent was handed a request no WIRED skill covers → the build log (once per agent + request).
export function noSkill(agent: SkillOwner, request: string): string | null {
  const wired = getSkills().filter(s => s.owner === agent && s.wired)
  if (wired.length) return null
  const title = cut(`No skill yet: ${agent} was asked to “${cut(request, 90)}”`, 160)
  if (getBuildLog().some(b => b.title === title)) return title
  addBuildLogEntry({ title, detail: `${agent} has no skill that runs in the app, so this waits. Build the skill (or route it elsewhere).`, status: 'todo', source: 'rise' })
  return title
}
