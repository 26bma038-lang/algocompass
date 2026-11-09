import { useEffect, useRef, useState } from "react";
import { LABELS } from "@/lib/glossary";
import { useQuery } from "@tanstack/react-query";
import { useStreak } from "@/components/shell/useStreak";
import { buildSchedule, dailyReminderText, streakCheckAt, type DailyReminderText } from "@/engine/notifications";
import { title as problemTitle } from "@/components/practice/problemText";
import { pickDoThisNext } from "@/engine/today";
import { solvedAgoWords } from "@/engine/revision";
import { useDueRevisions } from "./revisions";
import { isSheetId, openTarget, useSheet } from "./sheets";
import { useMixOfTheDay } from "./recommendations";
import { useNavigate } from "react-router-dom";
import { onTrayNavigate, onTraySync, pushSchedule, setTrayStatus } from "@/lib/desktop";
import { usePrefs } from "./prefs";
import { useTodayQuests } from "./quests";
import { getRepo, useSyncStore } from "./syncStore";

/** Re-push at least this often, so the streak reminder rolls over at midnight on its own. */
const REFRESH_MS = 10 * 60 * 1000;
/** Sync this long before the streak reminder, so it never nags about a problem you already solved. */
const PRE_STREAK_SYNC_S = 15 * 60;

function useTick(ms: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => x + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return n;
}

/**
 * The daily reminder's words (v1.7): the same pick as Today's Do this next, or nothing when every
 * one of today's goals is done. `ready` is false until the data it reads has loaded, so a reminder is
 * never built on half the facts.
 */
function useDailyReminderText(enabled: boolean): { ready: boolean; text: DailyReminderText | null } {
  const mix = useMixOfTheDay();
  const quests = useTodayQuests().data;
  const due = useDueRevisions();
  const followed = usePrefs().data?.followedSheet ?? null;
  const sheet = useSheet(isSheetId(followed) ? followed : null);
  if (!enabled) return { ready: false, text: null };
  if (mix.data === undefined || due.data === undefined || !quests || (isSheetId(followed) && sheet.isLoading)) return { ready: false, text: null };
  if (quests.total > 0 && quests.done >= quests.total) return { ready: true, text: null };
  const pick = pickDoThisNext(mix.data?.items, sheet.data?.next ?? null, due.data[0] ?? null);
  if (pick.kind === "review") {
    const d = pick.due;
    return { ready: true, text: dailyReminderText({ kind: "review", title: d.title, site: d.platform === "cf" ? "Codeforces" : "LeetCode", solvedAgo: solvedAgoWords(d.at, Math.floor(Date.now() / 1000)) }) };
  }
  if (pick.kind === "mix") return { ready: true, text: dailyReminderText({ kind: "problem", title: problemTitle(pick.problem), site: pick.problem.platform === "cf" ? "Codeforces" : "LeetCode" }) };
  if (pick.kind === "sheet") {
    const target = openTarget(pick.next.problem);
    return { ready: true, text: dailyReminderText({ kind: "problem", title: pick.next.problem.title, site: target?.site ?? "its site" }) };
  }
  return { ready: true, text: null };
}

/**
 * Wires the app to the desktop shell. Mounted once in the app shell:
 * - pushes the reminder schedule to Rust whenever contests, "I'll attend", the streak or settings change;
 * - syncs shortly before the evening streak reminder;
 * - keeps the tray's "Quests 1/3" line current and answers its "Sync now" and screen links.
 */
export function useDesktopBridge() {
  const prefs = usePrefs().data;
  const streak = useStreak();
  const quests = useTodayQuests().data;
  const tick = useTick(60_000);
  const contests = useQuery({
    queryKey: ["db", "reminder-contests"],
    queryFn: async () => {
      const repo = await getRepo();
      const [list, attending] = await Promise.all([repo.getContests(Math.floor(Date.now() / 1000)), repo.getAttending()]);
      return { list, attending };
    },
    refetchInterval: REFRESH_MS,
  });
  const daily = useDailyReminderText(prefs?.notify.daily === true);
  const attendKey = contests.data ? [...contests.data.attending].sort().join(",") : "";

  useEffect(() => {
    if (!prefs || !contests.data) return;
    const schedule = buildSchedule({
      now: Math.floor(Date.now() / 1000),
      contests: contests.data.list,
      attending: contests.data.attending,
      prefs: prefs.notify,
      streak: streak ? { current: streak.current, activeToday: streak.activeToday } : null,
      daily: daily.ready ? daily.text : undefined,
    });
    void pushSchedule(schedule);
    // `tick` re-runs this every 10th minute-ish (cheap), so the day rolls over without a sync.
  }, [prefs, contests.data, attendKey, streak?.current, streak?.activeToday, daily.ready, daily.text?.body, Math.floor(tick / 10)]); // eslint-disable-line react-hooks/exhaustive-deps

  // A fresh sync just before the streak reminder: if you solved something, the reminder is withdrawn.
  const preSynced = useRef<string | null>(null);
  useEffect(() => {
    if (!prefs?.notify.streak || !streak || streak.activeToday || streak.current === 0) return;
    const now = Math.floor(Date.now() / 1000);
    const at = streakCheckAt(now, prefs.notify);
    const day = new Date().toDateString();
    if (now >= at - PRE_STREAK_SYNC_S && now < at && preSynced.current !== day) {
      preSynced.current = day;
      void useSyncStore.getState().run();
    }
  }, [tick, prefs, streak]);

  useEffect(() => {
    void setTrayStatus(quests ? `${LABELS.goalsShort} ${quests.done}/${quests.total}` : `${LABELS.goalsShort}: after ${LABELS.firstUpdate}`);
  }, [quests?.done, quests?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => onTraySync(() => void useSyncStore.getState().run()), []);

  const navigate = useNavigate();
  useEffect(() => onTrayNavigate((path) => navigate(path)), [navigate]);
}
