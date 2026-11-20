from typing import List, Dict, Any, Optional
from datetime import datetime
from .weakness_detector import analyze_weak_topics, parse_date
from .llm_client import llm_service

def generate_study_recommendations(
    subjects: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    exams: List[Dict[str, Any]],
    focus_sessions: List[Dict[str, Any]],
    quiz_scores: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Computes dynamic data-grounded recommendations using multi-factor scoring:
    - Exam urgency
    - Weakness & quiz deficit
    - Topic difficulty
    - Incomplete work / pending tasks
    - Spaced repetition revision need
    """
    now = datetime.now()

    # 1. Run weakness analysis
    weakness_res = analyze_weak_topics(subjects, tasks, exams, focus_sessions, quiz_scores)
    analyzed_topics = weakness_res.get("topics", [])

    # Map exam urgency per subject & topic
    exam_candidates: Dict[str, Dict[str, Any]] = {}
    for exam in exams:
        exam_date = parse_date(exam.get("date"))
        if exam_date:
            days_left = (exam_date - now).days
            if days_left >= 0:
                subj_id = exam.get("subjectId", "")
                existing = exam_candidates.get(subj_id)
                if not existing or days_left < existing["daysLeft"]:
                    exam_candidates[subj_id] = {
                        "daysLeft": days_left,
                        "title": exam.get("title", "Exam"),
                        "prep": exam.get("preparationPercentage", 50),
                        "topicsCovered": [t.lower().strip() for t in exam.get("topicsCovered", [])]
                    }

    scored_items = []

    for item in analyzed_topics:
        subj_id = item["subjectId"]
        subj_name = item["subjectName"]
        topic_name = item["topic"]
        norm_topic = topic_name.lower().strip()
        score = item["score"] # 0 - 100
        quiz_score = item.get("quizScore")
        is_completed = item.get("isCompleted", False)

        exam_info = exam_candidates.get(subj_id)
        exam_urgency_score = 0.0
        days_to_exam = None
        exam_name = None

        if exam_info:
            days_to_exam = exam_info["daysLeft"]
            exam_name = exam_info["title"]
            # Covers this topic or whole subject?
            covers = any(tc in norm_topic or norm_topic in tc for tc in exam_info["topicsCovered"]) or len(exam_info["topicsCovered"]) == 0
            if covers:
                if days_to_exam <= 2:
                    exam_urgency_score = 60.0
                elif days_to_exam <= 5:
                    exam_urgency_score = 45.0
                elif days_to_exam <= 10:
                    exam_urgency_score = 30.0
                elif days_to_exam <= 20:
                    exam_urgency_score = 15.0

        # Weakness points: inverse of mastery
        weakness_points = max(0.0, (100.0 - score) * 0.5)

        # Quiz penalty points
        quiz_points = 0.0
        if quiz_score is not None and quiz_score < 65:
            quiz_points = (65 - quiz_score) * 0.8

        # Incomplete work bonus
        incomplete_points = 20.0 if not is_completed else 5.0

        # Revision need (low minutes)
        mins = item.get("minutesStudied", 0)
        revision_points = 15.0 if mins < 45 else 5.0

        # Total priority score
        total_score = exam_urgency_score + weakness_points + quiz_points + incomplete_points + revision_points

        # Determine recommended session duration
        if total_score > 80:
            rec_minutes = 45
            action = f"{topic_name} Deep Practice"
        elif total_score > 50:
            rec_minutes = 35
            action = f"{topic_name} Problem Solving"
        else:
            rec_minutes = 25
            action = f"{topic_name} Quick Revision"

        # Build clear human reason
        reason_parts = []
        if quiz_score is not None and quiz_score < 65:
            reason_parts.append(f"Your recent {topic_name} quiz performance is low ({quiz_score}%)")
        elif score < 65:
            reason_parts.append(f"Mastery in {topic_name} is currently low ({score}%)")

        if days_to_exam is not None:
            if days_to_exam == 0:
                reason_parts.append(f"your {subj_name} exam is TODAY")
            elif days_to_exam == 1:
                reason_parts.append(f"your {subj_name} exam is TOMORROW")
            else:
                reason_parts.append(f"your {subj_name} exam is in {days_to_exam} days")
        elif not is_completed:
            reason_parts.append("this topic is marked incomplete in your syllabus")

        if not reason_parts:
            reason_parts.append("Regular revision will reinforce long-term retention")

        reason_str = " and ".join(reason_parts) + "."

        scored_items.append({
            "subjectId": subj_id,
            "subjectName": subj_name,
            "topic": topic_name,
            "totalScore": round(total_score, 1),
            "masteryScore": score,
            "quizScore": quiz_score,
            "daysToExam": days_to_exam,
            "examName": exam_name,
            "recommendedDurationMinutes": rec_minutes,
            "recommendedAction": action,
            "reason": reason_str,
            "breakdown": {
                "examUrgency": round(exam_urgency_score, 1),
                "weaknessWeight": round(weakness_points, 1),
                "quizDeficit": round(quiz_points, 1),
                "incompleteWork": round(incomplete_points, 1),
                "revisionNeed": round(revision_points, 1)
            }
        })

    # Sort descending by total score
    scored_items.sort(key=lambda x: x["totalScore"], reverse=True)

    if not scored_items:
        # Fallback if no subjects
        return {
            "topRecommendation": None,
            "recommendations": []
        }

    top = scored_items[0]

    # Structure top recommendation exactly as required:
    # "Focus on Trees today."
    # Reason: "Your recent Tree quiz performance is low and your DSA exam is in 4 days."
    # Recommended: 45 min, Trees Practice, Button: Start Session
    top_rec = {
        "title": f"Focus on {top['topic']} today.",
        "reason": top["reason"],
        "recommendedDuration": f"{top['recommendedDurationMinutes']} min",
        "recommendedDurationMinutes": top["recommendedDurationMinutes"],
        "recommendedAction": top["recommendedAction"],
        "subjectId": top["subjectId"],
        "subjectName": top["subjectName"],
        "topic": top["topic"],
        "totalScore": top["totalScore"],
        "daysToExam": top["daysToExam"]
    }

    # If LLM available, polish the reason for top recommendation to make it ultra crisp
    if llm_service.is_available():
        prompt = (
            f"Given: Student needs to study '{top['topic']}' in '{top['subjectName']}'. "
            f"Reasoning context: {top['reason']}. "
            f"Format as one concise, motivating sentence explaining why the student should focus on this today."
        )
        refined = llm_service.generate_text(prompt)
        if refined and len(refined) < 160:
            top_rec["reason"] = refined.strip('" ')

    return {
        "topRecommendation": top_rec,
        "recommendations": scored_items[:5]
    }
