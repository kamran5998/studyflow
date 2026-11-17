from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .weakness_detector import analyze_weak_topics, parse_date
from .recommendations import generate_study_recommendations
from .llm_client import llm_service

def generate_personalized_plan(
    subjects: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    exams: List[Dict[str, Any]],
    focus_sessions: List[Dict[str, Any]],
    available_study_hours: float = 3.0,
    difficulty_map: Optional[Dict[str, str]] = None,
    quiz_scores: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Generates a personalized study plan following the 5-stage priority:
    1. Upcoming exams
    2. Weak topics
    3. Difficult topics
    4. Incomplete tasks
    5. Revision
    """
    now = datetime.now()
    available_minutes = int(max(0.5, available_study_hours) * 60)

    # 1. Run weakness & recommendation detection
    rec_result = generate_study_recommendations(subjects, tasks, exams, focus_sessions, quiz_scores)
    top_rec = rec_result.get("topRecommendation")
    ranked_candidates = rec_result.get("recommendations", [])

    # Sort upcoming exams by urgency
    sorted_exams = []
    for ex in exams:
        ed = parse_date(ex.get("date"))
        if ed:
            days_left = (ed - now).days
            if days_left >= 0:
                sorted_exams.append({
                    "id": ex.get("id"),
                    "title": ex.get("title", "Exam"),
                    "subjectId": ex.get("subjectId"),
                    "subjectName": ex.get("subjectName"),
                    "daysLeft": days_left,
                    "date": ex.get("date"),
                    "prep": ex.get("preparationPercentage", 50),
                    "topics": ex.get("topicsCovered", [])
                })
    sorted_exams.sort(key=lambda x: (x["daysLeft"], x["prep"]))

    # Allocate session blocks for today
    allocated_blocks = []
    remaining_minutes = available_minutes

    # Block 1: The highest priority focus topic (usually 45 min)
    if top_rec and remaining_minutes >= 30:
        dur = min(remaining_minutes, top_rec.get("recommendedDurationMinutes", 45))
        allocated_blocks.append({
            "id": "block-1",
            "order": 1,
            "subjectId": top_rec.get("subjectId"),
            "subjectName": top_rec.get("subjectName"),
            "topic": top_rec.get("topic"),
            "durationMinutes": dur,
            "priority": "high",
            "type": "Deep Focus",
            "objective": f"Target high-priority gaps in {top_rec.get('topic')}",
            "reason": top_rec.get("reason"),
            "canStartNow": True
        })
        remaining_minutes -= dur

    # Block 2 & 3: Additional prioritized topics
    block_idx = 2
    for cand in ranked_candidates:
        if remaining_minutes < 25:
            break
        # Avoid duplicating block 1
        if top_rec and cand["topic"] == top_rec.get("topic") and cand["subjectId"] == top_rec.get("subjectId"):
            continue

        dur = min(remaining_minutes, 45 if cand["totalScore"] > 70 else 30)
        allocated_blocks.append({
            "id": f"block-{block_idx}",
            "order": block_idx,
            "subjectId": cand["subjectId"],
            "subjectName": cand["subjectName"],
            "topic": cand["topic"],
            "durationMinutes": dur,
            "priority": "high" if cand["totalScore"] > 60 else "medium",
            "type": "Problem Solving" if cand["totalScore"] > 50 else "Active Revision",
            "objective": f"Review concepts and solve targeted exercises in {cand['topic']}",
            "reason": cand["reason"],
            "canStartNow": False
        })
        remaining_minutes -= dur
        block_idx += 1

    # If still remaining time, add a quick revision/spaced recall block
    if remaining_minutes >= 20 and len(subjects) > 0:
        rev_subj = subjects[0]
        allocated_blocks.append({
            "id": f"block-{block_idx}",
            "order": block_idx,
            "subjectId": rev_subj.get("id"),
            "subjectName": rev_subj.get("name"),
            "topic": "Daily Flashcard & Spaced Recall",
            "durationMinutes": remaining_minutes,
            "priority": "low",
            "type": "Spaced Revision",
            "objective": "Wrap up with quick self-testing and formula retention.",
            "reason": "Reinforces neural connections before sleep.",
            "canStartNow": False
        })

    # Multi-day roadmap (Next 5 Days)
    five_day_forecast = []
    day_names = ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"]
    for i in range(5):
        target_date = (now + timedelta(days=i)).strftime("%b %d")
        day_label = day_names[i]
        
        # Pick prominent exam or subject
        day_focus = None
        if i < len(sorted_exams):
            ex = sorted_exams[i]
            day_focus = f"Prep for {ex['subjectName']} ({ex['title']} in {ex['daysLeft']}d)"
        elif i < len(ranked_candidates):
            c = ranked_candidates[i]
            day_focus = f"Deep dive on {c['subjectName']} ({c['topic']})"
        else:
            day_focus = "Comprehensive review & practice problems"

        five_day_forecast.append({
            "day": day_label,
            "date": target_date,
            "targetHours": available_study_hours,
            "primaryFocus": day_focus,
            "status": "active" if i == 0 else "scheduled"
        })

    # LLM Enhancement for strategic commentary
    ai_guidance = None
    if llm_service.is_available():
        context_str = f"Available hours: {available_study_hours}h. "
        if sorted_exams:
            context_str += f"Nearest exam: {sorted_exams[0]['subjectName']} in {sorted_exams[0]['daysLeft']} days (Prep: {sorted_exams[0]['prep']}%). "
        if top_rec:
            context_str += f"Top recommended topic: {top_rec['topic']} ({top_rec['reason']})."

        prompt = (
            f"As an elite academic study strategist, write 2 concise bullet points advising the student on today's study plan: {context_str}. "
            "Keep each bullet under 20 words, actionable, and encouraging."
        )
        ai_guidance = llm_service.generate_text(prompt)

    if not ai_guidance:
        if sorted_exams and sorted_exams[0]['daysLeft'] <= 5:
            ai_guidance = (
                f"Prioritize {sorted_exams[0]['subjectName']} first to raise preparation past 80% before exam day.\n"
                "Keep study intervals under 50 minutes with active recall testing."
            )
        else:
            ai_guidance = (
                "Maintain steady momentum by tackling your weakest topic in the first session.\n"
                "End today with quick formula review to maximize retention."
            )

    return {
        "availableStudyHours": available_study_hours,
        "totalPlannedMinutes": sum(b["durationMinutes"] for b in allocated_blocks),
        "primaryRecommendation": top_rec,
        "blocks": allocated_blocks,
        "upcomingExams": sorted_exams[:3],
        "fiveDayForecast": five_day_forecast,
        "aiStrategyGuidance": ai_guidance
    }
