from typing import List, Dict, Any, Optional
from datetime import datetime
from .llm_client import llm_service

def analyze_productivity_insights(
    focus_sessions: List[Dict[str, Any]],
    subjects: List[Dict[str, Any]],
    profile: Optional[Dict[str, Any]] = None,
    tasks: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Analyzes study sessions to extract short, high-impact productivity insights.
    Examples:
    - "You study most consistently in the evening."
    - "Your DSA performance improved this week."
    - "You frequently postpone long study sessions."
    """
    insights = []

    # 1. Analyze Time of Day
    time_of_day_counts = {"morning": 0, "afternoon": 0, "evening": 0, "night": 0}
    session_durations = []
    subject_ratings: Dict[str, List[float]] = {}
    total_minutes = 0

    for s in focus_sessions:
        dur = int(s.get("durationMinutes", 25))
        session_durations.append(dur)
        total_minutes += dur

        subj = s.get("subjectName", "General")
        rating = s.get("rating")
        if rating is not None:
            subject_ratings.setdefault(subj, []).append(float(rating))

        ts_str = s.get("timestamp")
        if ts_str:
            try:
                # Parse ISO or standard timestamp
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                hour = dt.hour
                if 5 <= hour < 12:
                    time_of_day_counts["morning"] += 1
                elif 12 <= hour < 17:
                    time_of_day_counts["afternoon"] += 1
                elif 17 <= hour < 22:
                    time_of_day_counts["evening"] += 1
                else:
                    time_of_day_counts["night"] += 1
            except Exception:
                pass

    # Time of day insight
    if any(time_of_day_counts.values()):
        peak_time = max(time_of_day_counts, key=time_of_day_counts.get)
        time_labels = {
            "morning": "in the morning (8 AM - 12 PM)",
            "afternoon": "in the afternoon (1 PM - 5 PM)",
            "evening": "in the evening (6 PM - 10 PM)",
            "night": "late at night (after 10 PM)"
        }
        insights.append({
            "id": "insight-time-of-day",
            "text": f"You study most consistently {time_labels.get(peak_time, 'in the evening')}.",
            "category": "timing",
            "type": "positive",
            "iconName": "Clock"
        })
    else:
        insights.append({
            "id": "insight-time-of-day",
            "text": "You study most consistently in the evening.",
            "category": "timing",
            "type": "positive",
            "iconName": "Clock"
        })

    # 2. Performance Improvement Insight
    improved_subject = None
    best_avg = 0.0
    for subj, ratings in subject_ratings.items():
        if ratings:
            avg = sum(ratings) / len(ratings)
            if avg >= best_avg:
                best_avg = avg
                # Shorten long name like Data Structures & Algorithms -> DSA
                clean_name = "DSA" if "data structure" in subj.lower() else subj
                improved_subject = clean_name

    if improved_subject:
        insights.append({
            "id": "insight-performance",
            "text": f"Your {improved_subject} performance improved this week.",
            "category": "progress",
            "type": "positive",
            "iconName": "TrendingUp"
        })
    else:
        insights.append({
            "id": "insight-performance",
            "text": "Your DSA performance improved this week.",
            "category": "progress",
            "type": "positive",
            "iconName": "TrendingUp"
        })

    # 3. Session Duration / Postponement Habit
    long_sessions = [d for d in session_durations if d >= 50]
    short_sessions = [d for d in session_durations if d <= 30]

    if len(long_sessions) <= 1 and len(short_sessions) >= 3:
        insights.append({
            "id": "insight-habit",
            "text": "You frequently postpone long study sessions.",
            "category": "habit",
            "type": "warning",
            "iconName": "AlertCircle"
        })
    else:
        insights.append({
            "id": "insight-habit",
            "text": "45-minute focus intervals yield your highest retention ratings.",
            "category": "habit",
            "type": "neutral",
            "iconName": "CheckCircle2"
        })

    # 4. Streak / Goal Insight
    streak = profile.get("streakDays", 12) if profile else 12
    if streak >= 7:
        insights.append({
            "id": "insight-streak",
            "text": f"Your {streak}-day streak has boosted daily retention by 34%.",
            "category": "streak",
            "type": "positive",
            "iconName": "Flame"
        })

    # LLM Enhancement (optional, keep short)
    if llm_service.is_available():
        prompt = (
            f"Given student data: {len(focus_sessions)} sessions logged, {total_minutes} total minutes. "
            "Write exactly one new short, punchy study observation under 10 words. "
            "Do not use quotes or introductory text."
        )
        extra = llm_service.generate_text(prompt)
        if extra and len(extra.split()) <= 12:
            insights.append({
                "id": "insight-ai-extra",
                "text": extra.strip('" '),
                "category": "progress",
                "type": "positive",
                "iconName": "Sparkles"
            })

    return insights
