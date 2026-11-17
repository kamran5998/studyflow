import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai.planner import generate_personalized_plan
from ai.recommendations import generate_study_recommendations
from ai.weakness_detector import analyze_weak_topics
from ai.exam_planner import generate_exam_preparation_plan
from ai.insights import analyze_productivity_insights

app = FastAPI(
    title="StudyPilot AI Intelligence Engine",
    version="1.0.0",
    description="Legacy/reference Python FastAPI AI Services for StudyPilot personalized learning"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== PYDANTIC MODELS ====================

class GeneratePlanRequest(BaseModel):
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    exams: List[Dict[str, Any]] = Field(default_factory=list)
    focus_sessions: List[Dict[str, Any]] = Field(default_factory=list)
    available_study_hours: float = 3.0
    difficulty_map: Optional[Dict[str, str]] = None
    quiz_scores: Optional[List[Dict[str, Any]]] = None

class RecommendRequest(BaseModel):
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    exams: List[Dict[str, Any]] = Field(default_factory=list)
    focus_sessions: List[Dict[str, Any]] = Field(default_factory=list)
    quiz_scores: Optional[List[Dict[str, Any]]] = None

class WeaknessRequest(BaseModel):
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    exams: List[Dict[str, Any]] = Field(default_factory=list)
    focus_sessions: List[Dict[str, Any]] = Field(default_factory=list)
    quiz_scores: Optional[List[Dict[str, Any]]] = None

class ExamPlanRequest(BaseModel):
    exam: Dict[str, Any]
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    focus_sessions: List[Dict[str, Any]] = Field(default_factory=list)
    quiz_scores: Optional[List[Dict[str, Any]]] = None

class InsightsRequest(BaseModel):
    focus_sessions: List[Dict[str, Any]] = Field(default_factory=list)
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    profile: Optional[Dict[str, Any]] = None
    tasks: Optional[List[Dict[str, Any]]] = None

# ==================== API ROUTES ====================

@app.get("/ai/health")
def health():
    return {
        "status": "healthy",
        "service": "StudyPilot AI Engine",
        "llm_configured": bool(os.environ.get("GEMINI_API_KEY"))
    }

@app.post("/ai/generate-plan")
def api_generate_plan(payload: GeneratePlanRequest):
    try:
        result = generate_personalized_plan(
            subjects=payload.subjects,
            tasks=payload.tasks,
            exams=payload.exams,
            focus_sessions=payload.focus_sessions,
            available_study_hours=payload.available_study_hours,
            difficulty_map=payload.difficulty_map,
            quiz_scores=payload.quiz_scores
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/recommend")
def api_recommend(payload: RecommendRequest):
    try:
        result = generate_study_recommendations(
            subjects=payload.subjects,
            tasks=payload.tasks,
            exams=payload.exams,
            focus_sessions=payload.focus_sessions,
            quiz_scores=payload.quiz_scores
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/analyze-weakness")
def api_analyze_weakness(payload: WeaknessRequest):
    try:
        result = analyze_weak_topics(
            subjects=payload.subjects,
            tasks=payload.tasks,
            exams=payload.exams,
            focus_sessions=payload.focus_sessions,
            quiz_scores=payload.quiz_scores
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/exam-plan")
def api_exam_plan(payload: ExamPlanRequest):
    try:
        result = generate_exam_preparation_plan(
            exam=payload.exam,
            subjects=payload.subjects,
            tasks=payload.tasks,
            focus_sessions=payload.focus_sessions,
            quiz_scores=payload.quiz_scores
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/insights")
def api_get_insights():
    """
    Default insights for quick telemetry
    """
    sample_sessions = [
        {"subjectName": "Data Structures & Algorithms", "durationMinutes": 45, "rating": 5, "timestamp": "2026-09-02T19:30:00Z"},
        {"subjectName": "Database Systems", "durationMinutes": 35, "rating": 4, "timestamp": "2026-09-01T20:15:00Z"},
        {"subjectName": "Data Structures & Algorithms", "durationMinutes": 45, "rating": 5, "timestamp": "2026-08-31T18:45:00Z"},
    ]
    return analyze_productivity_insights(sample_sessions, [])

@app.post("/ai/insights")
def api_post_insights(payload: InsightsRequest):
    try:
        result = analyze_productivity_insights(
            focus_sessions=payload.focus_sessions,
            subjects=payload.subjects,
            profile=payload.profile,
            tasks=payload.tasks
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
