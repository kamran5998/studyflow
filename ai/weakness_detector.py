from typing import List, Dict, Any, Optional
from datetime import datetime
from .llm_client import llm_service

def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d")
    except Exception:
        return None

def analyze_weak_topics(
    subjects: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    exams: List[Dict[str, Any]],
    focus_sessions: List[Dict[str, Any]],
    quiz_scores: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Analyzes student data to detect weak topics using a robust scoring formula:
    - Quiz performance (primary indicator, 40%)
    - Study minutes recency & volume (20%)
    - Syllabus completion status (15%)
    - Task completion vs missed (15%)
    - Proximity of upcoming exams covering this topic (10% penalty if urgent)
    """
    now = datetime.now()
    quiz_map: Dict[str, float] = {}
    if quiz_scores:
        for q in quiz_scores:
            key = f"{q.get('subject_id', '')}:{q.get('topic', '').lower()}"
            quiz_map[key] = float(q.get("score", 70))
            # Also map by topic name only
            quiz_map[q.get('topic', '').lower()] = float(q.get("score", 70))

    # Calculate study minutes per topic
    topic_minutes: Dict[str, int] = {}
    for session in focus_sessions:
        topic = (session.get("topic") or "").lower().strip()
        dur = int(session.get("durationMinutes", 0))
        if topic:
            topic_minutes[topic] = topic_minutes.get(topic, 0) + dur

    # Calculate tasks per topic
    completed_tasks_by_topic: Dict[str, int] = {}
    pending_tasks_by_topic: Dict[str, int] = {}
    for t in tasks:
        topic = (t.get("topic") or "").lower().strip()
        status = t.get("status")
        if topic:
            if status == "completed":
                completed_tasks_by_topic[topic] = completed_tasks_by_topic.get(topic, 0) + 1
            else:
                pending_tasks_by_topic[topic] = pending_tasks_by_topic.get(topic, 0) + 1

    # Check exams
    exam_urgent_topics = set()
    for exam in exams:
        exam_date = parse_date(exam.get("date"))
        if exam_date:
            days_left = (exam_date - now).days
            if 0 <= days_left <= 7:
                for tc in exam.get("topicsCovered", []):
                    exam_urgent_topics.add(tc.lower().strip())

    analyzed_topics = []

    for subj in subjects:
        subj_id = subj.get("id", "")
        subj_name = subj.get("name", "Unknown Subject")
        subj_progress = float(subj.get("progress", 50))
        topics = subj.get("topics", [])

        for t in topics:
            topic_name = t.get("title", "")
            topic_id = t.get("id", "")
            is_completed = bool(t.get("completed", False))
            norm_name = topic_name.lower().strip()

            # 1. Base quiz score
            q_key = f"{subj_id}:{norm_name}"
            raw_quiz = quiz_map.get(q_key, quiz_map.get(norm_name, None))

            # Default quiz score estimation if not taken yet
            if raw_quiz is not None:
                quiz_score = raw_quiz
                has_quiz = True
            else:
                # Infer baseline from topic completion & difficulty
                has_quiz = False
                quiz_score = 80.0 if is_completed else 55.0

            # 2. Time invested
            mins = topic_minutes.get(norm_name, 0)
            time_score = min(100.0, (mins / 90.0) * 100.0)

            # 3. Task score
            comp_tasks = completed_tasks_by_topic.get(norm_name, 0)
            pend_tasks = pending_tasks_by_topic.get(norm_name, 0)
            total_tasks = comp_tasks + pend_tasks
            task_ratio = (comp_tasks / total_tasks * 100) if total_tasks > 0 else (75.0 if is_completed else 45.0)

            # 4. Syllabus completion score
            syllabus_score = 90.0 if is_completed else 40.0

            # Weighted mastery score
            mastery = (
                (quiz_score * 0.40) +
                (time_score * 0.20) +
                (syllabus_score * 0.20) +
                (task_ratio * 0.20)
            )

            # Exam urgency modifier (if exam in <7 days and mastery < 75, highlight urgency)
            is_urgent_exam = any(tc in norm_name or norm_name in tc for tc in exam_urgent_topics)
            if is_urgent_exam and mastery < 75:
                mastery = max(35.0, mastery - 8.0)

            mastery = round(mastery, 1)

            # Classification
            if mastery < 65:
                status = "needs_attention"
                label = "Needs Attention"
                color = "red"
                symbol = "🔴"
            elif mastery < 80:
                status = "moderate"
                label = "Moderate"
                color = "yellow"
                symbol = "🟡"
            else:
                status = "mastered"
                label = "Mastered"
                color = "green"
                symbol = "🟢"

            # Reason formulation
            reasons = []
            if has_quiz and raw_quiz < 65:
                reasons.append(f"Recent quiz score was {int(raw_quiz)}%")
            elif not is_completed:
                reasons.append("Syllabus section is incomplete")
            if mins < 30:
                reasons.append("Only logged minimal study time")
            if is_urgent_exam:
                reasons.append("Exam coming up within 7 days")

            reason_str = " • ".join(reasons) if reasons else "Good foundation with steady review"

            analyzed_topics.append({
                "id": topic_id,
                "topic": topic_name,
                "subjectId": subj_id,
                "subjectName": subj_name,
                "score": int(mastery),
                "quizScore": int(quiz_score) if has_quiz else None,
                "status": status,
                "label": label,
                "color": color,
                "symbol": symbol,
                "isExamUrgent": is_urgent_exam,
                "minutesStudied": mins,
                "isCompleted": is_completed,
                "reason": reason_str,
                "suggestedAction": f"Review {topic_name} notes and practice 3-5 core problems."
            })

    # Sort so weakest topics come first
    analyzed_topics.sort(key=lambda x: (0 if x["status"] == "needs_attention" else 1, x["score"]))

    weak_count = sum(1 for t in analyzed_topics if t["status"] == "needs_attention")
    moderate_count = sum(1 for t in analyzed_topics if t["status"] == "moderate")
    mastered_count = sum(1 for t in analyzed_topics if t["status"] == "mastered")

    # Optional LLM synthesis for high level diagnostic summary
    ai_summary = None
    if llm_service.is_available() and weak_count > 0:
        top_weak = [f"{t['subjectName']}: {t['topic']} ({t['score']}%)" for t in analyzed_topics[:4]]
        prompt = (
            f"As a study coach, provide a brief 2-sentence diagnostic on these weak areas: {', '.join(top_weak)}. "
            "Suggest which one should be prioritized first."
        )
        ai_summary = llm_service.generate_text(prompt)

    if not ai_summary:
        if weak_count > 0:
            top = analyzed_topics[0]
            ai_summary = f"{top['topic']} in {top['subjectName']} needs immediate reinforcement before upcoming evaluations."
        else:
            ai_summary = "All active topics meet solid mastery standards. Maintain spaced review."

    return {
        "topics": analyzed_topics,
        "summary": {
            "totalAnalyzed": len(analyzed_topics),
            "needsAttentionCount": weak_count,
            "moderateCount": moderate_count,
            "masteredCount": mastered_count,
            "aiDiagnostic": ai_summary
        }
    }
