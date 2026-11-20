from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .weakness_detector import parse_date, analyze_weak_topics
from .llm_client import llm_service

def generate_exam_preparation_plan(
    exam: Dict[str, Any],
    subjects: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    focus_sessions: List[Dict[str, Any]],
    quiz_scores: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Generates an AI Exam Preparation Roadmap for a specific exam:
    - Priority topics (ranked by weight and student weakness)
    - Day-by-day study schedule
    - Spaced revision schedule
    - Practice recommendations
    """
    now = datetime.now()
    exam_date = parse_date(exam.get("date"))
    days_remaining = (exam_date - now).days if exam_date else 4
    if days_remaining < 0:
        days_remaining = 0

    exam_title = exam.get("title", "Exam")
    subj_name = exam.get("subjectName", "Subject")
    subj_id = exam.get("subjectId", "")
    current_prep = float(exam.get("preparationPercentage", 50))
    raw_topics = exam.get("topicsCovered", [])

    # Find the corresponding subject in subjects
    target_subject = next((s for s in subjects if s.get("id") == subj_id or s.get("name") == subj_name), None)
    all_subject_topics = []
    if target_subject:
        all_subject_topics = [t.get("title", "") for t in target_subject.get("topics", [])]

    # Combine topics covered
    combined_topics = raw_topics if raw_topics else all_subject_topics
    if not combined_topics:
        combined_topics = ["Core Concepts", "Problem Solving", "Advanced Application", "Past Papers"]

    # Run weakness analysis to check scores on these topics
    weak_analysis = analyze_weak_topics(subjects, tasks, [exam], focus_sessions, quiz_scores)
    analyzed_map = {t["topic"].lower().strip(): t for t in weak_analysis.get("topics", [])}

    # 1. Priority Topics
    priority_topics = []
    for idx, t_name in enumerate(combined_topics):
        norm = t_name.lower().strip()
        data = analyzed_map.get(norm)
        mastery = data["score"] if data else (55 if idx < 2 else 75)
        is_completed = data.get("isCompleted", False) if data else False
        quiz = data.get("quizScore") if data else None

        # Determine priority based on low mastery & exam weight
        if mastery < 65:
            p_level = "High"
            p_color = "red"
            badge = "🔴 Needs Mastery"
            reason = f"Current mastery is {mastery}%. Crucial high-weight area for {exam_title}."
        elif mastery < 80:
            p_level = "Medium"
            p_color = "yellow"
            badge = "🟡 Practice Needed"
            reason = f"Mastery is at {mastery}%. Solidify with timed problem sets."
        else:
            p_level = "Low"
            p_color = "green"
            badge = "🟢 Review Only"
            reason = f"Strong grasp ({mastery}%). Quick refresher before test day."

        priority_topics.append({
            "topic": t_name,
            "mastery": mastery,
            "quizScore": quiz,
            "priority": p_level,
            "badge": badge,
            "color": p_color,
            "isCompleted": is_completed,
            "reason": reason,
            "estimatedStudyHours": 2.5 if p_level == "High" else (1.5 if p_level == "Medium" else 0.5)
        })

    # Sort so High priority topics are at the top
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    priority_topics.sort(key=lambda x: (priority_order.get(x["priority"], 3), x["mastery"]))

    # 2. Study Schedule (Day-by-day roadmap)
    study_schedule = []
    num_days = max(1, min(days_remaining, 7)) # schedule up to 7 days
    for day_offset in range(num_days):
        target_d = now + timedelta(days=day_offset)
        d_str = target_d.strftime("%a, %b %d")
        day_num = day_offset + 1

        if day_offset == 0:
            # Day 1: Attack the weakest topic
            t = priority_topics[0]["topic"] if priority_topics else "Core Fundamentals"
            milestone = f"Deep Dive: {t}"
            focus_desc = f"Review foundational theory, derivations, and work through 5 step-by-step problems in {t}."
            allocated_hours = 2.0
        elif day_offset == num_days - 1 and days_remaining <= 2:
            # Final day before exam: Mock test & Formula review
            milestone = "Final Mock Exam & Formula Cheat Sheet"
            focus_desc = "Simulate 60-minute timed exam conditions. Review high-yield summary sheet. Avoid cramming new topics."
            allocated_hours = 1.5
        elif day_offset == 1 and len(priority_topics) > 1:
            t = priority_topics[1]["topic"]
            milestone = f"Core Practice: {t}"
            focus_desc = f"Solve previous year examination questions and address tricky edge cases in {t}."
            allocated_hours = 2.0
        elif day_offset == 2 and len(priority_topics) > 2:
            t = priority_topics[2]["topic"]
            milestone = f"Comprehensive Application: {t}"
            focus_desc = f"Practice mixed question formats connecting {t} with preceding concepts."
            allocated_hours = 1.5
        else:
            milestone = "Integrated Problem Solving & Error Review"
            focus_desc = "Identify mistakes made during practice. Re-attempt incorrect solutions without looking at answers."
            allocated_hours = 1.5

        study_schedule.append({
            "dayNumber": day_num,
            "date": d_str,
            "milestone": milestone,
            "focusDescription": focus_desc,
            "targetHours": allocated_hours,
            "isCompleted": False
        })

    # 3. Revision Schedule (Spaced repetition touchpoints)
    revision_schedule = [
        {
            "phase": "Phase 1: Active Recall Check",
            "timing": "3 Days Before",
            "activity": "Blank-sheet recall: write out every core definition, diagram, and formula from memory.",
            "durationMinutes": 30
        },
        {
            "phase": "Phase 2: Timed Mock Drill",
            "timing": "2 Days Before",
            "activity": "Solve 3 multi-part exam questions under strict 45-minute countdown without notes.",
            "durationMinutes": 45
        },
        {
            "phase": "Phase 3: Pitfall & Error Audit",
            "timing": "1 Day Before",
            "activity": "Review all past homework and quiz mistakes. Ensure you don't repeat common algebra or syntax errors.",
            "durationMinutes": 30
        },
        {
            "phase": "Phase 4: Pre-Sleep Formula Scan",
            "timing": "Night Before Exam",
            "activity": "Light 15-minute skim of the 1-page summary sheet. Sleep 7.5+ hours to consolidate memory.",
            "durationMinutes": 15
        }
    ]

    # 4. Practice Recommendations
    practice_recommendations = [
        {
            "type": "High-Yield Focus",
            "recommendation": f"Focus 60% of your time on '{priority_topics[0]['topic']}' as it has the highest score leverage.",
            "tag": "High Impact"
        },
        {
            "type": "Time-Boxed Sets",
            "recommendation": "Never spend more than 8 minutes stuck on one problem. Flag it, check the hint, and re-solve cleanly.",
            "tag": "Exam Technique"
        },
        {
            "type": "Self-Explanation",
            "recommendation": "Explain the step-by-step logic aloud as if teaching a classmate to expose hidden gaps.",
            "tag": "Feynman Technique"
        },
        {
            "type": "Error Journaling",
            "recommendation": "Maintain a 1-page list of tricky edge cases you encountered during practice.",
            "tag": "Retention"
        }
    ]

    # LLM Customization
    ai_verdict = None
    if llm_service.is_available():
        top_weak_names = [p["topic"] for p in priority_topics if p["priority"] == "High"]
        prompt = (
            f"You are an academic coach preparing a student for their {subj_name} exam ('{exam_title}'). "
            f"Days remaining: {days_remaining}. Current prep: {current_prep}%. "
            f"Highest priority topic: {top_weak_names[0] if top_weak_names else 'General Syllabus'}. "
            "Write a concise 2-sentence tailored strategy explaining how to maximize their score in the remaining days."
        )
        ai_verdict = llm_service.generate_text(prompt)

    if not ai_verdict:
        if days_remaining <= 3:
            ai_verdict = f"With {days_remaining} days left, switch entirely from passive reading to active question solving. Prioritize {priority_topics[0]['topic']} first."
        else:
            ai_verdict = f"You have {days_remaining} days to bridge the {int(100 - current_prep)}% prep gap. Consistent 2-hour focused blocks will easily position you in the top percentile."

    return {
        "examId": exam.get("id"),
        "examTitle": exam_title,
        "subjectName": subj_name,
        "daysRemaining": days_remaining,
        "currentPreparation": current_prep,
        "recommendedTotalHours": sum(p["estimatedStudyHours"] for p in priority_topics),
        "aiStrategyVerdict": ai_verdict,
        "priorityTopics": priority_topics,
        "studySchedule": study_schedule,
        "revisionSchedule": revision_schedule,
        "practiceRecommendations": practice_recommendations
    }
